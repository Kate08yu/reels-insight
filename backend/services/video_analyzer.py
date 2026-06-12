import base64
import os
import subprocess
import tempfile
from pathlib import Path

import anthropic
import imageio_ffmpeg

from models import VideoAnalysis

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


def _download_video(url: str, dest: Path) -> Path:
    subprocess.run(
        ["yt-dlp", "-o", str(dest), "--quiet", "--no-warnings", url],
        check=True,
    )
    return dest


def _extract_frames(video_path: Path, out_dir: Path, interval: int = 3, max_frames: int = 10) -> list[Path]:
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
    """릴스 URL을 받아 영상을 다운로드·프레임 추출 후 Claude로 분석한다."""
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        video_path = tmp_path / "reel.mp4"
        frames_dir = tmp_path / "frames"

        _download_video(url, video_path)
        frames = _extract_frames(video_path, frames_dir)

        if not frames:
            return VideoAnalysis(
                summary="영상을 분석할 수 없습니다.",
                tone="알 수 없음",
                keywords=[],
                topics=[],
            )

        content: list = [
            {
                "type": "text",
                "text": (
                    "당신은 인스타그램 바이럴 콘텐츠 전문 분석가입니다. "
                    "다음은 릴스 영상에서 시간 순서대로 추출한 프레임들입니다.\n\n"
                    "단순히 보이는 것을 묘사하지 말고, '왜 이 영상이 알고리즘과 시청자에게 작동하는가/안 하는가'를 전략적으로 분석하세요.\n\n"
                    "아래 JSON 형식으로만 답하세요 (다른 텍스트 없이 JSON만):\n"
                    "{\n"
                    '  "summary": "전체 영상 한 줄 요약",\n'
                    '  "tone": "콘텐츠 톤(유머/정보/감성/동기부여/교육/라이프스타일 중 하나)",\n'
                    '  "keywords": ["SEO/해시태그용 핵심키워드1", "키워드2", "키워드3"],\n'
                    '  "topics": ["주제1", "주제2"],\n'
                    '  "hook": {\n'
                    '    "technique": "사용된 후킹 기법 (예: 충격적 수치 제시, 공감형 질문, 반전 예고, 비포애프터 등)",\n'
                    '    "strength": "강함/보통/약함",\n'
                    '    "reason": "이 후킹이 효과적인/비효과적인 이유"\n'
                    '  },\n'
                    '  "structure": {\n'
                    '    "pattern": "사용된 구조 패턴 (예: PAS(문제-공감-해결), AIDA, 비포애프터, 스토리텔링, 리스트형 등)",\n'
                    '    "pacing": "빠름/보통/느림",\n'
                    '    "loop_potential": "영상이 자동반복 유도를 하는지 여부와 방식"\n'
                    '  },\n'
                    '  "scenes": [\n'
                    '    {\n'
                    '      "scene": 1,\n'
                    '      "description": "화면에서 실제로 일어나는 일",\n'
                    '      "technique": "사용된 콘텐츠 기법 (텍스트 오버레이/클로즈업/전환효과/자막 등)",\n'
                    '      "psychology": "이 장면이 시청자에게 유발하는 심리 반응 (궁금증/공감/신뢰/욕구 등)",\n'
                    '      "retention_score": "이 장면에서 시청자가 계속 볼 가능성 (1~10점)"\n'
                    '    }\n'
                    '  ],\n'
                    '  "engagement_triggers": ["저장을 유발하는 요소", "공유를 유발하는 요소", "댓글을 유발하는 요소"],\n'
                    '  "algorithm_factors": {\n'
                    '    "watch_time_optimization": "시청 완료율을 높이기 위해 사용된 전략",\n'
                    '    "shareability": "높음/보통/낮음",\n'
                    '    "shareability_reason": "왜 그런지 이유"\n'
                    '  },\n'
                    '  "weaknesses": ["이 영상의 약점1 (구체적으로)", "약점2"],\n'
                    '  "improvement": ["지금 당장 적용 가능한 개선안1 (구체적으로)", "개선안2"]\n'
                    "}"
                ),
            }
        ]
        for frame in frames[:10]:
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": _encode_image(frame),
                    },
                }
            )

        response = _client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": content}],
        )

    import json
    import re
    text = response.content[0].text.strip()
    # 마크다운 코드펜스 제거
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    # JSON 블록만 추출 (앞뒤 불필요한 텍스트 제거)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)
    data = json.loads(text)
    return VideoAnalysis(**data)
