# 개발 로그 (DEVLOG)

개발 과정의 날짜별 작업 내용과 소요 시간을 기록합니다.

---

## 형식

```
## YYYY-MM-DD

### 작업 내용
- 작업 1
- 작업 2

### 소요 시간
- 총 X시간

### 사용한 AI 도구
- Cursor AI: ...
- Claude: ...

### 이슈 / 배운 점
- ...
```

---

## 2026-02-26

### 작업 내용
- Phase 0: Git 초기화, commitlint + husky 설정, GitHub 워크플로우 파일 작성
- Phase 0: PR 템플릿, 이슈 템플릿, CONTRIBUTING.md 작성
- Phase 1: 크롬 확장 스캐폴딩 (Vite + TypeScript + React + Tailwind + Manifest V3)
- Phase 1: 타입 정의 (`src/types/index.ts`) - 모든 데이터 구조 정의
- Phase 1: 프롬프트 설계 - 학습 모드/일반 모드 × 웹/유튜브 4가지 조합
- Phase 1: Claude API 연동 (`src/lib/claude.ts`) - Haiku 4.5 호출
- Phase 1: 웹 페이지 본문 추출 (`src/content/extractor.ts`) - Readability 알고리즘
- Phase 1: 사이드 패널 UI 전체 구현 (App.tsx, SummaryCard, SettingsView, HistoryList)
- Phase 2: 유튜브 자막 추출 (`src/lib/youtube.ts`) - Innertube API
- Phase 2: Whisper 클라이언트 (`src/lib/whisper-client.ts`)
- Phase 2: FastAPI 백엔드 전체 구현 (audio_extractor, whisper, transcribe router)
- Phase 2: Docker + docker-compose 설정
- Phase 3: Notion 내보내기 (`src/lib/notion.ts`)
- Phase 3: Slack 내보내기 (`src/lib/slack.ts`)
- Phase 3: 마크다운 변환 (`src/lib/markdown.ts`)
- Phase 3: GitHub Actions CI/CD (build-extension.yml, build-backend.yml)

### 사용한 AI 도구
- **Cursor AI (claude-sonnet-4.6)**: 전체 프로젝트 설계 및 코드 생성
  - 아키텍처 설계 및 기술 스택 결정
  - 모든 TypeScript/Python 코드 생성
  - 프롬프트 설계 (학습 모드/일반 모드 × 웹/유튜브)
  - 루브릭 분석 및 개선 방안 도출

### 이슈 / 배운 점
- `@types/mozilla__readability` 최신 버전이 `^0.5.0`이 아닌 `^0.4.2`임 → 버전 수정 필요
- Vite 빌드 시 `type: "module"` 추가로 CJS 경고 해결
- Service Worker에서 동적 임포트 대신 정적 임포트 사용으로 경고 해결
- Manifest V3의 Side Panel API는 Chrome 114+ 필요

---

## 2026-02-26 (2차)

### 작업 내용
- Claude API → Google Gemini API 마이그레이션 (`src/lib/gemini.ts` 생성)
- Docker 백엔드 완전 제거 (backend/, docker-compose.yml 삭제)
- Whisper 관련 코드 제거 (whisper-client.ts, 서비스 워커 핸들러)
- YouTube URL 직접 처리 기능 추가 (Gemini 멀티모달로 자막 없는 영상 처리)
- Watch Later 자동 요약 기능 추가 (`src/lib/watch-later.ts`)
- chrome.alarms 기반 자동 스케줄러 구현
- 설정 UI 대폭 개편 (API 키 발급 가이드, Watch Later 설정)
- 온보딩 플로우 추가 (API 키 미설정 시 가이드 표시)
- manifest.json 권한 추가 (alarms, notifications)
- README.md, .env.example, docs/ai-usage.md 업데이트

### 사용한 AI 도구
- **Cursor AI**: 마이그레이션 계획 수립 및 전체 코드 리팩토링

### 이슈 / 배운 점
- Gemini 무료 티어로 전환하여 사용자 비용 부담 제거 (하루 250회 무료)
- Docker 백엔드 제거로 비전공자도 쉽게 설치 가능해짐
- Gemini의 YouTube URL 직접 처리 기능으로 Whisper + yt-dlp 파이프라인 불필요
- `@google/generative-ai` SDK가 deprecated되어 REST API 직접 호출 방식 선택

---

<!-- 이후 작업 날짜를 위 형식으로 추가하세요 -->
