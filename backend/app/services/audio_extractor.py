import os
import uuid
import asyncio
from pathlib import Path
from app.config import settings


async def extract_audio(video_id: str) -> Path:
    """yt-dlp로 유튜브 영상의 오디오만 추출합니다."""
    tmp_dir = Path(settings.tmp_dir)
    tmp_dir.mkdir(parents=True, exist_ok=True)

    output_path = tmp_dir / f"{uuid.uuid4()}.m4a"

    cmd = [
        "yt-dlp",
        "--format", "bestaudio[ext=m4a]/bestaudio/best",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "5",  # 비트레이트 절약 (0=최고, 9=최저)
        "--no-playlist",
        "--output", str(output_path.with_suffix(".%(ext)s")),
        f"https://www.youtube.com/watch?v={video_id}",
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode("utf-8", errors="replace")
        raise RuntimeError(f"yt-dlp 오류: {error_msg[:500]}")

    # yt-dlp가 확장자를 변경할 수 있으므로 실제 파일 탐색
    for ext in ["mp3", "m4a", "webm", "opus"]:
        candidate = output_path.with_suffix(f".{ext}")
        if candidate.exists():
            return candidate

    raise RuntimeError("오디오 파일을 찾을 수 없습니다.")


def cleanup_file(path: Path) -> None:
    """임시 파일을 삭제합니다."""
    try:
        if path.exists():
            os.remove(path)
    except OSError:
        pass
