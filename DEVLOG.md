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

<!-- 이후 작업 날짜를 위 형식으로 추가하세요 -->
