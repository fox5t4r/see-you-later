from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.transcribe import router as transcribe_router

app = FastAPI(
    title="See You Later - Whisper Backend",
    description="유튜브 영상 오디오를 Whisper API로 텍스트로 변환하는 백엔드 서버",
    version="0.1.0",
)

# CORS 설정 - 크롬 확장에서의 요청 허용
origins = [o.strip() for o in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

app.include_router(transcribe_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "see-you-later-backend"}
