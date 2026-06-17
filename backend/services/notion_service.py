import os
import httpx
from models import VideoAnalysis

NOTION_TOKEN = os.getenv("NOTION_TOKEN") or os.getenv("notion_token", "")
NOTION_VERSION = "2022-06-28"
BASE = "https://api.notion.com/v1"

_headers = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
}

DB_ID = "f8fd11796b964f14bf54754b02924e34"


# ─── Block helpers ────────────────────────────────────────────────────────────

def heading(text: str, level: int = 2) -> dict:
    t = f"heading_{level}"
    return {"object": "block", "type": t, t: {"rich_text": [{"text": {"content": text}}]}}


def paragraph(text: str) -> dict:
    return {"object": "block", "type": "paragraph",
            "paragraph": {"rich_text": [{"text": {"content": text[:2000]}}]}}


def bullet(text: str) -> dict:
    return {"object": "block", "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"text": {"content": text[:2000]}}]}}


def quote(text: str) -> dict:
    return {"object": "block", "type": "quote",
            "quote": {"rich_text": [{"text": {"content": text[:2000]}}]}}


def code_block(text: str) -> dict:
    return {"object": "block", "type": "code",
            "code": {"language": "plain text",
                     "rich_text": [{"text": {"content": text[:2000]}}]}}


def divider() -> dict:
    return {"object": "block", "type": "divider", "divider": {}}


def table(header_cells: list[str], rows: list[list[str]]) -> dict:
    def cell(text: str) -> list:
        return [{"type": "text", "text": {"content": text[:200]}}]

    header_row = {
        "object": "block", "type": "table_row",
        "table_row": {"cells": [cell(c) for c in header_cells]}
    }
    data_rows = [
        {"object": "block", "type": "table_row",
         "table_row": {"cells": [cell(c) for c in row]}}
        for row in rows
    ]
    return {
        "object": "block", "type": "table",
        "table": {
            "table_width": len(header_cells),
            "has_column_header": True,
            "has_row_header": False,
            "children": [header_row] + data_rows,
        },
    }


# ─── Main service ─────────────────────────────────────────────────────────────

async def save_analysis(url: str, analysis: VideoAnalysis, db_id: str, content_type: str = "릴스") -> str:
    from datetime import date

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
        "콘텐츠 유형": {"select": {"name": content_type}},
    }

    # ── 장면별 분석 테이블 ──────────────────────────────────────────────────
    scene_rows = []
    for s in analysis.scenes:
        text_cell = s.text if s.text else ""
        text_kr_cell = s.text_kr if s.text_kr else ""
        combined = f"{text_cell}\n({text_kr_cell})" if text_cell and text_kr_cell else text_cell or text_kr_cell
        scene_rows.append([
            str(s.scene),
            combined,
            s.technique,
            s.psychology,
            f"{s.retention_score}/10",
        ])
    scene_table = table(
        ["#", "화면 텍스트 (한글)", "기법", "심리 반응", "유지 점수"],
        scene_rows,
    )

    # ── 캡션 제안 블록 ───────────────────────────────────────────────────────
    caption_blocks: list[dict] = []
    labels = ["버전 1 — 공감형", "버전 2 — 질문형", "버전 3 — 임팩트형"]
    for i, cap in enumerate(analysis.caption_suggestions[:3]):
        label = labels[i] if i < len(labels) else f"버전 {i+1}"
        caption_blocks += [heading(label, 3), code_block(cap)]

    children = [
        # ── 요약 ──────────────────────────────────────────────────────────
        heading("📋 요약"),
        paragraph(f"한 줄 요약: {analysis.summary}"),
        paragraph(f"콘텐츠 톤: {analysis.tone}"),
        paragraph(f"키워드: {' '.join('#' + k for k in analysis.keywords)}"),
        *([ paragraph(f"주제: {', '.join(analysis.topics)}") ] if analysis.topics else []),
        divider(),

        # ── 후킹 분석 ─────────────────────────────────────────────────────
        heading("🎣 후킹 분석"),
        paragraph(f"기법: {analysis.hook.technique}"),
        paragraph(f"강도: {analysis.hook.strength}"),
        paragraph(f"이유: {analysis.hook.reason}"),
        divider(),

        # ── 구조 분석 ─────────────────────────────────────────────────────
        heading("🏗️ 구조 분석"),
        paragraph(f"패턴: {analysis.structure.pattern}"),
        *([ paragraph(f"감정 흐름: {analysis.structure.emotion_flow}") ] if analysis.structure.emotion_flow else []),
        paragraph(f"템포: {analysis.structure.pacing}"),
        paragraph(f"루프 유도: {analysis.structure.loop_potential}"),
        divider(),

        # ── 장면별 분석 ───────────────────────────────────────────────────
        heading("🎬 장면별 분석"),
        scene_table,
        divider(),

        # ── 알고리즘 & 참여 분석 ──────────────────────────────────────────
        heading("📊 알고리즘 & 참여 분석"),
        paragraph(f"시청 완료율 전략: {analysis.algorithm_factors.watch_time_optimization}"),
        paragraph(f"공유 가능성: {analysis.algorithm_factors.shareability} — {analysis.algorithm_factors.shareability_reason}"),
        heading("참여 유발 요소", 3),
        *[bullet(t) for t in analysis.engagement_triggers],
        divider(),

        # ── 전체 대사 & 한국어 해석 ───────────────────────────────────────
        *([
            heading("📝 전체 대사 & 한국어 해석"),
            heading("원문", 3),
            quote(analysis.transcript),
            heading("한국어 해석", 3),
            quote(analysis.transcript_kr),
            divider(),
        ] if analysis.transcript else []),

        # ── 약점 & 개선 제안 ──────────────────────────────────────────────
        heading("⚠️ 약점"),
        *[bullet(w) for w in analysis.weaknesses],
        heading("✅ 개선 제안"),
        *[bullet(i) for i in analysis.improvement],
        divider(),

        # ── 벤치마킹 가이드 ───────────────────────────────────────────────
        heading("🎯 벤치마킹 가이드"),
        heading("후킹 템플릿", 3),
        quote(analysis.benchmarking.hook_template),
        heading("구조 따라하기", 3),
        paragraph(analysis.benchmarking.structure_template),
        heading("시각적 스타일", 3),
        paragraph(analysis.benchmarking.visual_style),
        heading("오디오 전략", 3),
        paragraph(analysis.benchmarking.audio_strategy),
        heading("캡션 전략", 3),
        paragraph(analysis.benchmarking.caption_strategy),
        heading("제작 체크리스트", 3),
        *[bullet(c) for c in analysis.benchmarking.checklist],
        divider(),

        # ── 내 계정용 캡션 제안 ───────────────────────────────────────────
        *([heading("✍️ 내 계정용 캡션 제안")] + caption_blocks if caption_blocks else []),
    ]

    # Notion API: 블록 100개 제한
    children = children[:100]

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE}/pages",
            headers=_headers,
            json={
                "parent": {"database_id": db_id},
                "properties": properties,
                "children": children,
            },
        )
        if not resp.is_success:
            raise RuntimeError(f"Notion {resp.status_code}: {resp.text}")
        page = resp.json()
        return page.get("url", "")


async def get_or_create_db() -> str:
    return DB_ID
