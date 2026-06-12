import os
import httpx
from models import VideoAnalysis

NOTION_TOKEN = os.getenv("NOTION_TOKEN", "")
NOTION_VERSION = "2022-06-28"
BASE = "https://api.notion.com/v1"

_headers = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
}

DB_ID = "f8fd11796b964f14bf54754b02924e34"


async def _find_or_create_db(parent_page_id: str) -> str:
    """워크스페이스에서 DB를 찾거나 새로 만든다."""
    async with httpx.AsyncClient(timeout=30) as client:
        # 기존 DB 검색
        resp = await client.post(
            f"{BASE}/search",
            headers=_headers,
            json={"query": DB_NAME, "filter": {"value": "database", "property": "object"}},
        )
        results = resp.json().get("results", [])
        if results:
            return results[0]["id"]

        # 새 DB 생성
        resp = await client.post(
            f"{BASE}/databases",
            headers=_headers,
            json={
                "parent": {"type": "page_id", "page_id": parent_page_id},
                "title": [{"type": "text", "text": {"content": DB_NAME}}],
                "properties": {
                    "제목": {"title": {}},
                    "릴스 URL": {"url": {}},
                    "분석일": {"date": {}},
                    "톤": {"select": {"options": [
                        {"name": "유머", "color": "yellow"},
                        {"name": "정보", "color": "blue"},
                        {"name": "감성", "color": "pink"},
                        {"name": "동기부여", "color": "orange"},
                        {"name": "교육", "color": "green"},
                        {"name": "라이프스타일", "color": "purple"},
                    ]}},
                    "후킹 강도": {"select": {"options": [
                        {"name": "강함", "color": "green"},
                        {"name": "보통", "color": "yellow"},
                        {"name": "약함", "color": "red"},
                    ]}},
                    "구조 패턴": {"rich_text": {}},
                    "공유 가능성": {"select": {"options": [
                        {"name": "높음", "color": "green"},
                        {"name": "보통", "color": "yellow"},
                        {"name": "낮음", "color": "red"},
                    ]}},
                    "키워드": {"multi_select": {"options": []}},
                },
            },
        )
        resp.raise_for_status()
        return resp.json()["id"]


async def save_analysis(url: str, analysis: VideoAnalysis, db_id: str) -> str:
    """분석 결과를 Notion DB에 저장하고 페이지 URL을 반환한다."""
    from datetime import date

    keywords_options = [{"name": k[:100]} for k in analysis.keywords[:5]]

    loop_val = "있음" if analysis.structure.loop_potential and "없음" not in analysis.structure.loop_potential else "없음"

    properties = {
        "제목": {"title": [{"text": {"content": analysis.summary[:100]}}]},
        "릴스 URL": {"url": url},
        "분석일": {"date": {"start": date.today().isoformat()}},
        "콘텐츠 톤": {"select": {"name": analysis.tone}},
        "후킹 기법": {"rich_text": [{"text": {"content": analysis.hook.technique[:200]}}]},
        "후킹 강도": {"select": {"name": analysis.hook.strength}},
        "구조 패턴": {"rich_text": [{"text": {"content": analysis.structure.pattern[:200]}}]},
        "루프 유도": {"select": {"name": loop_val}},
        "공유 가능성": {"select": {"name": analysis.algorithm_factors.shareability}},
        "키워드": {"rich_text": [{"text": {"content": ", ".join(analysis.keywords[:5])}}]},
        "약점": {"rich_text": [{"text": {"content": "\n".join(analysis.weaknesses)[:500]}}]},
        "개선 제안": {"rich_text": [{"text": {"content": "\n".join(analysis.improvement)[:500]}}]},
        "후킹 템플릿": {"rich_text": [{"text": {"content": analysis.benchmarking.hook_template[:300]}}]},
        "활용 여부": {"select": {"name": "미검토"}},
    }

    # 페이지 본문 블록 구성
    def heading(text: str) -> dict:
        return {"object": "block", "type": "heading_2", "heading_2": {"rich_text": [{"text": {"content": text}}]}}

    def paragraph(text: str) -> dict:
        return {"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"text": {"content": text[:2000]}}]}}

    def bullet(text: str) -> dict:
        return {"object": "block", "type": "bulleted_list_item", "bulleted_list_item": {"rich_text": [{"text": {"content": text[:2000]}}]}}

    def divider() -> dict:
        return {"object": "block", "type": "divider", "divider": {}}

    children = [
        heading("📋 요약"),
        paragraph(f"한 줄 요약: {analysis.summary}"),
        paragraph(f"톤: {analysis.tone}"),
        divider(),

        heading("🎣 후킹 분석"),
        paragraph(f"기법: {analysis.hook.technique}"),
        paragraph(f"강도: {analysis.hook.strength}"),
        paragraph(f"분석: {analysis.hook.reason}"),
        divider(),

        heading("🏗️ 구조 분석"),
        paragraph(f"패턴: {analysis.structure.pattern}"),
        paragraph(f"템포: {analysis.structure.pacing}"),
        paragraph(f"루프 유도: {analysis.structure.loop_potential}"),
        divider(),

        heading("🎬 장면별 분석"),
    ]

    for s in analysis.scenes:
        children += [
            paragraph(f"[장면 {s.scene}] {s.description}"),
            paragraph(f"  기법: {s.technique}"),
            paragraph(f"  심리 반응: {s.psychology}"),
            paragraph(f"  시청 유지 점수: {s.retention_score}/10"),
        ]

    children += [
        divider(),
        heading("📊 알고리즘 & 참여 분석"),
        paragraph(f"시청 완료율 전략: {analysis.algorithm_factors.watch_time_optimization}"),
        paragraph(f"공유 가능성: {analysis.algorithm_factors.shareability} — {analysis.algorithm_factors.shareability_reason}"),
        heading("참여 유발 요소"),
        *[bullet(t) for t in analysis.engagement_triggers],
        divider(),

        heading("⚠️ 약점"),
        *[bullet(w) for w in analysis.weaknesses],
        heading("✅ 개선 제안"),
        *[bullet(i) for i in analysis.improvement],
        divider(),

        heading("🎯 벤치마킹 가이드"),
        paragraph(f"후킹 템플릿: {analysis.benchmarking.hook_template}"),
        paragraph(f"구조 따라하기:\n{analysis.benchmarking.structure_template}"),
        paragraph(f"시각적 스타일: {analysis.benchmarking.visual_style}"),
        paragraph(f"오디오 전략: {analysis.benchmarking.audio_strategy}"),
        paragraph(f"캡션 전략: {analysis.benchmarking.caption_strategy}"),
        heading("제작 체크리스트"),
        *[bullet(c) for c in analysis.benchmarking.checklist],
    ]

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE}/pages",
            headers=_headers,
            json={
                "parent": {"database_id": db_id},
                "properties": properties,
                "children": children[:100],  # Notion API 블록 제한
            },
        )
        resp.raise_for_status()
        page = resp.json()
        return page.get("url", "")


async def get_or_create_db() -> str:
    return DB_ID
