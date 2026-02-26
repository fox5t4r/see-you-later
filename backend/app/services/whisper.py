import math
from pathlib import Path
from openai import AsyncOpenAI
from app.config import settings

# Whisper API 파일 크기 제한 (25MB)
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

client = AsyncOpenAI(api_key=settings.openai_api_key)


async def transcribe_audio(audio_path: Path) -> tuple[str, str]:
    """
    오디오 파일을 Whisper API로 텍스트로 변환합니다.
    Returns: (transcript_text, detected_language)
    """
    file_size = audio_path.stat().st_size

    if file_size <= MAX_FILE_SIZE_BYTES:
        return await _transcribe_single(audio_path)
    else:
        # 25MB 초과 시 청크 분할 처리
        return await _transcribe_chunked(audio_path, file_size)


async def _transcribe_single(audio_path: Path) -> tuple[str, str]:
    """단일 파일 Whisper API 호출"""
    with open(audio_path, "rb") as f:
        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    # 타임스탬프 포함 텍스트 구성
    segments = getattr(response, "segments", None) or []
    if segments:
        lines = []
        for seg in segments:
            start = seg.get("start", 0) if isinstance(seg, dict) else getattr(seg, "start", 0)
            text = seg.get("text", "") if isinstance(seg, dict) else getattr(seg, "text", "")
            minutes = int(start // 60)
            seconds = int(start % 60)
            lines.append(f"[{minutes:02d}:{seconds:02d}] {text.strip()}")
        transcript = "\n".join(lines)
    else:
        transcript = response.text

    language = getattr(response, "language", "unknown") or "unknown"
    return transcript, language


async def _transcribe_chunked(audio_path: Path, file_size: int) -> tuple[str, str]:
    """
    파일이 25MB를 초과할 경우 ffmpeg로 청크 분할 후 각각 변환합니다.
    청크 수는 파일 크기에 따라 자동 계산됩니다.
    """
    import asyncio
    import uuid
    from app.config import settings as app_settings

    chunk_count = math.ceil(file_size / MAX_FILE_SIZE_BYTES) + 1
    tmp_dir = Path(app_settings.tmp_dir)
    chunk_prefix = tmp_dir / f"chunk_{uuid.uuid4()}"

    # ffmpeg로 청크 분할 (시간 기반)
    duration_cmd = [
        "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path),
    ]
    proc = await asyncio.create_subprocess_exec(
        *duration_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    total_duration = float(stdout.decode().strip() or "0")
    chunk_duration = total_duration / chunk_count

    split_cmd = [
        "ffmpeg", "-i", str(audio_path),
        "-f", "segment",
        "-segment_time", str(int(chunk_duration)),
        "-c", "copy",
        f"{chunk_prefix}_%03d.mp3",
        "-y",
    ]
    proc = await asyncio.create_subprocess_exec(
        *split_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await proc.communicate()

    # 각 청크 변환
    chunk_files = sorted(tmp_dir.glob(f"chunk_{chunk_prefix.name}_*.mp3"))
    transcripts = []
    detected_language = "unknown"

    for chunk in chunk_files:
        try:
            text, lang = await _transcribe_single(chunk)
            transcripts.append(text)
            if detected_language == "unknown":
                detected_language = lang
        finally:
            chunk.unlink(missing_ok=True)

    return "\n".join(transcripts), detected_language
