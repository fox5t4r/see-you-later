# Changelog

이 프로젝트의 모든 주요 변경 사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)을 사용합니다.

---

## [Unreleased]

---

## [0.2.3] - 2026-02-26

### Changed
- **README 전면 개편**: 지원 콘텐츠 범위 명시 (뉴스, 논문, 유튜브, 영화 리뷰 등), Gemini/Notion/Slack API 키 단계별 발급 가이드 추가
- **설정 화면**: Gemini 무료 한도 안내 250회 → 100회 (Gemini 2.5 Pro 기준)로 수정
- 버전 0.2.2 → 0.2.3

---

## [0.2.2] - 2026-02-26

### Changed
- **Notion Integration 링크**: `my-integrations` → `profile/integrations/internal` (Internal Integration 직접 연결)
- **Notion 설정 안내**: Integration 생성 시 "콘텐츠 읽기 · 콘텐츠 입력" 권한 허용 안내 추가
- **Notion 설정 안내**: "Connections" → "연결" 로 한국어화, 연결 추가 방법 명시
- **Notion 에러 메시지**: "Connections" → "연결" 로 한국어화
- 버전 0.1.1 → 0.2.2

---

## [0.1.1] - 2026-02-26

### Fixed
- **Slack 내보내기**: 추천 대상(bestFor), 스킵 대상(skipIf), 직접 시청/전문 읽기 권장 정보가 전송되지 않던 문제 수정
- **Notion 에러 토스트**: 긴 에러 메시지가 토스트 창보다 커지던 UI 오버플로우 수정 (pill → rounded-xl, 전체 너비 레이아웃)
- **Notion 에러 메시지**: 403 권한 오류 안내 문구를 간결하게 개선
- **"나중에 볼 동영상" 파싱**: YouTube `ytInitialData` 구조 변경에 대응하는 재귀 탐색 방식으로 강화

### Changed
- 설정 화면 "Watch Later 자동 요약" → **"나중에 볼 동영상" 자동 요약** 으로 텍스트 변경
- Watch Later 목록 가져오기 실패 에러 메시지 한국어화

---

## [0.1.0] - 2026-02-26

초기 릴리즈

### 핵심 기능
- 웹 페이지 AI 요약 (학습 모드 / 일반 모드)
- 유튜브 영상 AI 요약 (자막 기반 + Whisper 폴백)
- 추천도 시스템 (1~5점 + 판단 근거)
- Notion / Slack 내보내기
- 요약 히스토리 관리
