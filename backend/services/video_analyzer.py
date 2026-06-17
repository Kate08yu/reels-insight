import base64
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

import anthropic
import imageio_ffmpeg
import openai

from models import VideoAnalysis

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
_openai_key = os.getenv("OPENAI_API_KEY", "")

PROMPT = """당신은 인스타그램 바이럴 콘텐츠 전략 전문가입니다.
다음은 릴스 영상에서 시간 순서대로 추출한 프레임들입니다.

단순 묘사가 아니라, '왜 이 영상이 작동하는가/안 하는가'와 '이 영상을 벤치마킹해서 내 영상을 만들 때 어떻게 해야 하는가'를 전략적으로 분석하세요.

아래 JSON 형식으로만 답하세요 (다른 텍스트 없이 JSON만):
{
  "summary": "전체 영상 한 줄 요약",
  "tone": "콘텐츠 톤(유머/정보/감성/동기부여/교육/라이프스타일 중 하나)",
  "keywords": ["해시태그용 핵심키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "topics": ["주제1", "주제2"],
  "hook": {
    "technique": "사용된 후킹 기법 (예: 충격적 수치 제시, 공감형 질문, 반전 예고, 비포애프터, 금지형 문장 등)",
    "strength": "강함/보통/약함",
    "reason": "이 후킹이 효과적인/비효과적인 구체적 이유"
  },
  "structure": {
    "pattern": "사용된 구조 패턴 (예: PAS(문제-공감-해결), AIDA, 비포애프터, 스토리텔링, 리스트형, 튜토리얼형 등)",
    "emotion_flow": "감정 흐름을 화살표로 표현 (예: 공감 → 불안 → 희망 → 결심)",
    "pacing": "빠름/보통/느림",
    "loop_potential": "루프 유도 여부와 방식 (없음이면 없음이라고 명시)"
  },
  "scenes": [
    {
      "scene": 1,
      "text": "화면에 표시된 텍스트 원문 (영어면 영어 그대로, 없으면 빈 문자열)",
      "text_kr": "text 필드의 한국어 번역 (text가 없으면 빈 문자열)",
      "description": "화면에서 실제로 일어나는 일 (텍스트, 동작, 구도 포함)",
      "technique": "사용된 촬영/편집 기법 (텍스트오버레이/클로즈업/점프컷/자막/전환효과 등)",
      "psychology": "이 장면이 시청자에게 유발하는 심리 반응과 그 이유",
      "retention_score": "1~10 숫자만"
    }
  ],
  "engagement_triggers": [
    "저장을 유발하는 구체적 요소",
    "공유를 유발하는 구체적 요소",
    "댓글을 유발하는 구체적 요소"
  ],
  "algorithm_factors": {
    "watch_time_optimization": "시청 완료율을 높이기 위해 사용된 구체적 전략",
    "shareability": "높음/보통/낮음",
    "shareability_reason": "공유 가능성 판단 근거"
  },
  "weaknesses": [
    "이 영상의 구체적 약점1 (왜 약점인지 포함)",
    "약점2"
  ],
  "improvement": [
    "지금 당장 적용 가능한 구체적 개선안1",
    "개선안2"
  ],
  "benchmarking": {
    "hook_template": "이 영상의 후킹 방식을 내 콘텐츠에 적용할 수 있는 문장 템플릿 (예: '[숫자]가지 [주제] 방법, 마지막이 핵심입니다')",
    "structure_template": "이 영상의 구조를 따라 만들 때 단계별 가이드 (1단계: ... → 2단계: ... 형식)",
    "visual_style": "이 영상의 시각적 스타일 특징과 따라 할 때 주의사항",
    "audio_strategy": "음악 선택/보이스오버/자막 전략 분석 및 벤치마킹 방법",
    "caption_strategy": "캡션 구성 전략 (첫 줄 후킹, 해시태그 배치, 행동유도 등)",
    "checklist": [
      "촬영 전 체크1",
      "촬영 전 체크2",
      "편집 시 체크3",
      "업로드 전 체크4",
      "업로드 시 체크5"
    ]
  },
  "transcript": "영상의 전체 대사/자막 원문 (보이는 텍스트와 들리는 말 모두 포함, 없으면 빈 문자열)",
  "transcript_kr": "transcript의 자연스러운 한국어 번역 (없으면 빈 문자열)",
  "caption_suggestions": [
    "버전1 — 공감형 캡션 (저장·공유 최적화, 해시태그 포함, 실제 바로 쓸 수 있는 완성형으로)",
    "버전2 — 질문형 캡션 (댓글 유도, 해시태그 포함, 완성형으로)",
    "버전3 — 짧고 강한 임팩트형 캡션 (저장율 높은 체크리스트 포맷, 해시태그 포함, 완성형으로)"
  ]
}"""


def _download_video(url: str, dest: Path) -> Path:
    subprocess.run(
        [
            "yt-dlp",
            "-o", str(dest),
            "--quiet",
            "--no-warnings",
            "--add-header", "User-Agent:Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "--add-header", "Referer:https://www.instagram.com/",
            "--no-check-certificates",
            url,
        ],
        check=True,
    )
    return dest


def _extract_frames(video_path: Path, out_dir: Path, interval: int = 1, max_frames: int = 12) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    pattern = str(out_dir / "frame_%03d.jpg")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run(
        [
            ffmpeg_exe, "-i", str(video_path),
            "-vf", f"fps=1/{interval}",
            "-vframes", str(max_frames),
            "-q:v", "2",
            pattern,
            "-y", "-loglevel", "error",
        ],
        check=True,
    )
    return sorted(out_dir.glob("frame_*.jpg"))


def _encode_image(path: Path) -> str:
    return base64.standard_b64encode(path.read_bytes()).decode()


def _transcribe_audio(video_path: Path) -> str:
    if not _openai_key:
        return ""
    audio_path = video_path.parent / "audio.mp3"
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    result = subprocess.run(
        [ffmpeg_exe, "-i", str(video_path), "-vn", "-q:a", "0", str(audio_path), "-y", "-loglevel", "error"],
        check=False,
    )
    if result.returncode != 0 or not audio_path.exists() or audio_path.stat().st_size == 0:
        return ""
    oa_client = openai.OpenAI(api_key=_openai_key)
    with open(audio_path, "rb") as f:
        transcript = oa_client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )
    segments = getattr(transcript, "segments", None) or []
    if segments:
        lines = [f"[{s['start']:.1f}s] {s['text'].strip()}" for s in segments]
        return "\n".join(lines)
    return getattr(transcript, "text", "") or ""


CAROUSEL_PROMPT = """당신은 인스타그램 바이럴 콘텐츠 전략 전문가입니다.
다음은 인스타그램 캐러셀 게시물의 슬라이드 이미지들입니다 (순서대로).

각 슬라이드의 텍스트 원문과 한국어 번역을 포함해서, '왜 이 캐러셀이 작동하는가'와 '벤치마킹 포인트'를 전략적으로 분석하세요.

아래 JSON 형식으로만 답하세요 (다른 텍스트 없이 JSON만):
{
  "summary": "전체 캐러셀 한 줄 요약",
  "tone": "콘텐츠 톤(유머/정보/감성/동기부여/교육/라이프스타일 중 하나)",
  "keywords": ["해시태그용 핵심키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "topics": ["주제1", "주제2"],
  "hook": {
    "technique": "커버 슬라이드의 후킹 기법",
    "strength": "강함/보통/약함",
    "reason": "이 후킹이 효과적인/비효과적인 구체적 이유"
  },
  "structure": {
    "pattern": "사용된 구조 패턴 (리스트형/스토리형/튜토리얼형/비교형 등)",
    "emotion_flow": "감정 흐름을 화살표로 표현 (예: 공감 → 정보 → 행동 유도)",
    "pacing": "빠름/보통/느림",
    "loop_potential": "루프 유도 여부 (없음이면 없음이라고 명시)"
  },
  "scenes": [
    {
      "scene": 1,
      "text": "슬라이드에 표시된 텍스트 원문 (없으면 빈 문자열)",
      "text_kr": "text 필드의 한국어 번역 (text가 없으면 빈 문자열)",
      "description": "슬라이드 화면 구성 설명 (비주얼, 레이아웃, 색상 등)",
      "technique": "사용된 디자인/카피 기법",
      "psychology": "이 슬라이드가 시청자에게 유발하는 심리 반응",
      "retention_score": "1~10 숫자만"
    }
  ],
  "engagement_triggers": [
    "저장을 유발하는 요소",
    "공유를 유발하는 요소",
    "댓글을 유발하는 요소"
  ],
  "algorithm_factors": {
    "watch_time_optimization": "스와이프 완료율을 높이기 위한 전략",
    "shareability": "높음/보통/낮음",
    "shareability_reason": "공유 가능성 판단 근거"
  },
  "weaknesses": ["약점1", "약점2"],
  "improvement": ["개선안1", "개선안2"],
  "benchmarking": {
    "hook_template": "이 캐러셀 후킹 방식을 내 콘텐츠에 적용할 수 있는 템플릿",
    "structure_template": "이 구조를 따라 만들 때 단계별 가이드",
    "visual_style": "시각적 스타일 특징과 따라 할 때 주의사항",
    "audio_strategy": "캐러셀은 음악 없음 — 대신 카피 전략 및 폰트/레이아웃 분석",
    "caption_strategy": "캡션 구성 전략",
    "checklist": ["제작 전 체크1", "체크2", "제작 중 체크3", "업로드 전 체크4", "업로드 시 체크5"]
  },
  "transcript": "슬라이드 전체 텍스트 원문 (슬라이드 순서대로 합친 것, 없으면 빈 문자열)",
  "transcript_kr": "transcript의 한국어 번역 (없으면 빈 문자열)",
  "caption_suggestions": [
    "버전1 — 공감형 캡션 (저장·공유 최적화, 해시태그 포함, 완성형으로)",
    "버전2 — 질문형 캡션 (댓글 유도, 해시태그 포함, 완성형으로)",
    "버전3 — 짧고 강한 임팩트형 캡션 (체크리스트 포맷, 해시태그 포함, 완성형으로)"
  ]
}"""


async def analyze_carousel(images_b64: list[str]) -> VideoAnalysis:
    content: list = [{"type": "text", "text": CAROUSEL_PROMPT}]
    for img in images_b64[:15]:
        media_type = "image/jpeg"
        if img.startswith("/9j/") or img.startswith("iVBOR"):
            media_type = "image/png" if img.startswith("iVBOR") else "image/jpeg"
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": img},
        })

    response = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        messages=[{"role": "user", "content": content}],
    )

    text = response.content[0].text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)
    data = json.loads(text)
    return VideoAnalysis(**data)


def _frames_to_analysis(frames: list[Path], caption: str = "", whisper_transcript: str = "") -> VideoAnalysis:
    prompt_text = PROMPT
    if whisper_transcript.strip():
        prompt_text += f"\n\n아래는 Whisper로 추출한 영상의 전체 음성/자막 전사본입니다 (타임스탬프 포함). 각 장면 분석 시 해당 시점의 텍스트를 정확히 반영하세요:\n\n---\n{whisper_transcript.strip()}\n---"
    if caption.strip():
        prompt_text += f"\n\n아래는 이 게시물의 원본 캡션입니다. 캡션의 해시태그, 문구, CTA 전략도 함께 분석하세요:\n\n---\n{caption.strip()}\n---"

    content: list = [{"type": "text", "text": prompt_text}]
    for frame in frames[:12]:
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": _encode_image(frame),
            },
        })

    response = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        messages=[{"role": "user", "content": content}],
    )

    text = response.content[0].text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)
    data = json.loads(text)
    return VideoAnalysis(**data)


async def analyze_reel(url: str, caption: str = "") -> VideoAnalysis:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        video_path = tmp_path / "reel.mp4"
        frames_dir = tmp_path / "frames"

        _download_video(url, video_path)
        frames = _extract_frames(video_path, frames_dir)

        if not frames:
            raise RuntimeError("프레임 추출 실패")

        try:
            whisper_transcript = _transcribe_audio(video_path)
        except Exception:
            whisper_transcript = ""
        return _frames_to_analysis(frames, caption, whisper_transcript)


async def analyze_video_file(video_bytes: bytes, caption: str = "") -> VideoAnalysis:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        video_path = tmp_path / "upload.mp4"
        frames_dir = tmp_path / "frames"

        video_path.write_bytes(video_bytes)
        frames = _extract_frames(video_path, frames_dir)

        if not frames:
            raise RuntimeError("프레임 추출 실패 — 유효한 동영상 파일인지 확인하세요.")

        try:
            whisper_transcript = _transcribe_audio(video_path)
        except Exception:
            whisper_transcript = ""
        return _frames_to_analysis(frames, caption, whisper_transcript)
