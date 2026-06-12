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
                    "다음은 인스타그램 릴스에서 추출한 프레임들입니다. "
                    "아래 JSON 형식으로만 답하세요:\n"
                    '{"summary":"한 문장 요약","tone":"분위기(예: 유머/정보/감성/동기부여)","keywords":["키워드1","키워드2","키워드3"],"topics":["주제1","주제2"]}'
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
            max_tokens=512,
            messages=[{"role": "user", "content": content}],
        )

    import json
    text = response.content[0].text.strip()
    # JSON 블록 파싱 (마크다운 코드펜스 제거)
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    data = json.loads(text)
    return VideoAnalysis(**data)
