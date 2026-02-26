# Changelog

이 프로젝트의 모든 주요 변경 사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)을 사용합니다.

---

## [Unreleased]

### Added
- Watch Later 자동 요약 기능 (chrome.alarms 기반 주기적 체크)
- Watch Later 영상 감지 모듈 (YouTube 페이지 HTML 파싱)
- 배치 요약 → Slack/Notion 자동 내보내기
- 온보딩 플로우 (API 키 미설정 시 발급 가이드 표시)
- Watch Later 설정 UI (활성화 토글, 주기, 내보내기 대상)
- "지금 동기화" 수동 트리거 버튼

### Changed
- **AI 엔진 교체**: Claude Haiku 4.5 → Gemini 2.5 Flash (무료 티어 지원)
- **YouTube 자막 없는 영상 처리**: Whisper + yt-dlp → Gemini YouTube URL 직접 처리
- **설정 UI**: Anthropic/OpenAI API 키 → Gemini API 키 단일화
- UX 단순화: needs_whisper 상태 및 Whisper 확인 다이얼로그 제거

### Removed
- Docker 백엔드 (FastAPI + yt-dlp + Whisper) 전체 제거
- `docker-compose.yml` 제거
- `extension/src/lib/claude.ts` 제거
- `extension/src/lib/whisper-client.ts` 제거
- Settings에서 `anthropicApiKey`, `openaiApiKey`, `backendUrl` 필드 제거

---

## [0.1.0] - 2026-02-26

초기 릴리즈

### 핵심 기능
- 웹 페이지 AI 요약 (학습 모드 / 일반 모드)
- 유튜브 영상 AI 요약 (자막 기반 + Whisper 폴백)
- 추천도 시스템 (1~5점 + 판단 근거)
- Notion / Slack 내보내기
- 요약 히스토리 관리
