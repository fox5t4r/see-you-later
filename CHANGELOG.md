# Changelog

이 프로젝트의 모든 주요 변경 사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)을 사용합니다.

---

## [Unreleased]

### Added
- Phase 0: Git 초기화, Conventional Commits (commitlint + husky), GitHub Flow 브랜치 전략
- Phase 0: PR 템플릿, 이슈 템플릿 (버그 리포트, 기능 요청), CONTRIBUTING.md
- Phase 0: GitHub Actions CI/CD (확장 빌드 + Docker 이미지 빌드)
- Phase 1: 크롬 확장 스캐폴딩 (Manifest V3, Vite, TypeScript, React 18, Tailwind CSS)
- Phase 1: 웹 페이지 본문 추출 (Content Script + Mozilla Readability)
- Phase 1: Claude Haiku 4.5 API 연동 및 모드별 프롬프트 (학습/일반 × 웹/유튜브)
- Phase 1: 사이드 패널 UI (모드 선택, 요약 버튼, 결과 카드, 추천도, 설정, 히스토리)
- Phase 2: 유튜브 자막 추출 (YouTube Innertube API, 타임스탬프 포함)
- Phase 2: Whisper 폴백 - 자막 없는 영상 처리 (FastAPI + yt-dlp + OpenAI Whisper)
- Phase 2: 요약 히스토리 (chrome.storage, 최대 50개)
- Phase 3: Notion 내보내기 (Integration API, 구조화된 블록)
- Phase 3: Slack 내보내기 (Incoming Webhook, Block Kit)
- Phase 3: 마크다운 복사 (클립보드)

---

## [0.1.0] - 2026-02-26

초기 릴리즈

### 핵심 기능
- 웹 페이지 AI 요약 (학습 모드 / 일반 모드)
- 유튜브 영상 AI 요약 (자막 기반 + Whisper 폴백)
- 추천도 시스템 (1~5점 + 판단 근거)
- Notion / Slack 내보내기
- 요약 히스토리 관리
