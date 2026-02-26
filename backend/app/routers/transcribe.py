import re
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from app.services.audio_extractor import extract_audio, cleanup_file
from app.services.whisper import transcribe_audio

router = APIRouter(prefix="/api", tags=["transcribe"])

VALID_VIDEO_ID = re.compile(r"^[a-zA-Z0-9_-]{11}$")


class TranscribeRequest(BaseModel):
    video_id: str

    @field_validator("video_id")
    @classmethod
    def validate_video_id(cls, v: str) -> str:
        if not VALID_VIDEO_ID.match(v):
            raise ValueError("유효하지 않은 유튜브 영상 ID입니다.")
        return v


class TranscribeResponse(BaseModel):
    transcript: str
    duration_seconds: float
    language: str


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_video(request: TranscribeRequest) -> TranscribeResponse:
    """
    유튜브 영상의 오디오를 추출하여 Whisper API로 텍스트로 변환합니다.
    자막이 없는 영상에 사용합니다.
    """
    audio_path: Path | None = None

    try:
        # 1. 오디오 추출
        audio_path = await extract_audio(request.video_id)

        # 2. 파일 크기로 대략적인 재생 시간 추정 (정확한 값은 ffprobe 사용)
        file_size = audio_path.stat().st_size
        estimated_duration = file_size / (128 * 1024 / 8)  # 128kbps 기준

        # 3. Whisper 변환
        transcript, language = await transcribe_audio(audio_path)

        return TranscribeResponse(
            transcript=transcript,
            duration_seconds=estimated_duration,
            language=language,
        )

    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"변환 중 오류가 발생했습니다: {str(e)[:200]}",
        ) from e
    finally:
        if audio_path:
            cleanup_file(audio_path)
