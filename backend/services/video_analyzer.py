import base64
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

import anthropic
import imageio_ffmpeg

from models import VideoAnalysis

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

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
    "pacing": "빠름/보통/느림",
    "loop_potential": "루프 유도 여부와 방식 (없음이면 없음이라고 명시)"
  },
  "scenes": [
    {
      "scene": 1,
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
  }
}"""


def _download_video(url: str, dest: Path) -> Path:
    subprocess.run(
        ["yt-dlp", "-o", str(dest), "--quiet", "--no-warnings", url],
        check=True,
    )
    return dest


def _extract_frames(video_path: Path, out_dir: Path, interval: int = 2, max_frames: int = 12) -> list[Path]:
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


async def analyze_reel(url: str) -> VideoAnalysis:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        video_path = tmp_path / "reel.mp4"
        frames_dir = tmp_path / "frames"

        _download_video(url, video_path)
        frames = _extract_frames(video_path, frames_dir)

        if not frames:
            raise RuntimeError("프레임 추출 실패")

        content: list = [{"type": "text", "text": PROMPT}]
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
            max_tokens=4096,
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
