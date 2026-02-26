# AI 도구 활용 과정

이 문서는 See You Later 프로젝트 개발 과정에서 AI 도구를 어떻게 활용했는지 상세히 기록합니다.

---

## 사용한 AI 도구

| 도구 | 용도 |
|------|------|
| **Cursor AI (claude-sonnet-4.6)** | 전체 프로젝트 설계, 코드 생성, 디버깅 |
| **Gemini 2.5 Flash (Google)** | 실제 프로덕션 요약 AI (확장 프로그램 내 사용) |
| ~~Claude Haiku 4.5~~ | v0.1.0에서 사용, v0.2.0에서 Gemini로 교체 |
| ~~OpenAI Whisper~~ | v0.1.0에서 사용, v0.2.0에서 Gemini 멀티모달로 대체 |

---

## Cursor AI 활용 내역

### 1. 프로젝트 기획 단계

**활용 방식**: Plan 모드에서 대화형으로 요구사항 정의

- 초기 아이디어 (웹 페이지 요약 크롬 확장)를 구체적인 기술 스택으로 변환
- Whisper vs Gemini 멀티모달 방식의 트레이드오프 분석 요청
- 루브릭 분석 - 평가 기준에 맞는 개선 방안 도출

**프롬프트 예시**:
```
자막이 없는 유튜브도 요약할 수 있으면 좋겠어.
방법 A: pytube + Whisper
방법 B: Gemini 멀티모달
어떤 방식이 더 좋을까?
```

**AI 응답의 핵심 인사이트**:
- Gemini 방식이 구현은 간단하지만 비용이 7배 높음
- Whisper 방식은 백엔드 서버가 필요하지만 비용 효율적
- 사용자 확인 UI로 의도치 않은 비용 발생 방지

### 2. 아키텍처 설계

**활용 방식**: 시스템 아키텍처 다이어그램 설계 및 데이터 흐름 정의

- Chrome Extension Manifest V3의 구성 요소 (Service Worker, Content Script, Side Panel) 역할 분리
- Service Worker ↔ Content Script ↔ Side Panel 메시지 패싱 설계
- FastAPI 백엔드의 yt-dlp + Whisper 파이프라인 설계

### 3. 프롬프트 엔지니어링

**활용 방식**: Claude에게 보낼 요약 프롬프트 설계

4가지 조합 (학습/일반 × 웹/유튜브)의 프롬프트를 설계하면서:
- JSON 형식 강제로 파싱 안정성 확보
- 추천도 점수 기준 명확화 (1~5점 정의)
- 유튜브용 프롬프트에 `summaryIsSufficient` 필드 추가 (직접 시청 vs 요약으로 충분)

**개선 과정**:
```
초안: "다음 내용을 요약해주세요"
→ 문제: 응답 형식이 일관되지 않음

개선: JSON 형식 명시 + "JSON 외의 텍스트는 절대 포함하지 않습니다" 강제
→ 결과: 파싱 안정성 대폭 향상
```

### 4. 코드 생성

**활용 방식**: 각 모듈별 코드 생성 및 타입 안전성 검토

주요 생성 코드:
- `src/types/index.ts`: 전체 데이터 구조 타입 정의 (30+ 타입)
- `src/lib/youtube.ts`: YouTube Innertube API 자막 추출 (비공식 API 역공학)
- `src/lib/notion.ts`: Notion Block Kit 구조화 (요약 결과를 Notion 블록으로 변환)
- `backend/app/services/whisper.py`: 25MB 초과 파일 청크 분할 처리

**디버깅 사례**:
```
문제: @types/mozilla__readability@^0.5.0 버전이 존재하지 않음
원인: 실제 최신 버전은 0.4.2
해결: npm show @types/mozilla__readability versions 로 확인 후 수정
```

### 5. 워크플로우 체계화

**활용 방식**: 루브릭 분석 기반 개선 방안 도출

루브릭의 "워크플로우 구현" 항목 5점 기준 분석:
- Conventional Commits 강제 (commitlint + husky)
- GitHub Flow 브랜치 전략
- PR 템플릿, 이슈 템플릿
- GitHub Actions CI/CD

---

## Claude Haiku 4.5 프롬프트 최적화

실제 프로덕션에서 사용하는 요약 AI의 프롬프트 개선 과정:

### 시스템 프롬프트 진화

**v1 (초안)**:
```
당신은 요약 전문가입니다. 내용을 요약해주세요.
```

**v2 (JSON 강제)**:
```
반드시 JSON 형식으로만 응답하세요.
```

**v3 (최종)**:
```
당신은 콘텐츠 분석 전문가입니다...
규칙:
1. 모든 응답은 한국어로...
2. 반드시 지정된 JSON 형식으로만 응답합니다. JSON 외의 텍스트는 절대 포함하지 않습니다.
3. 추천도 점수 기준: 5점=반드시 읽어야/봐야 함...
```

**개선 효과**: JSON 파싱 실패율 ~30% → ~2% 수준으로 감소 (예상)

---

---

## v0.2.0 마이그레이션: Claude + Whisper → Gemini

### 변경 이유
- Claude API는 무료 티어가 없어 사용자에게 즉시 비용 발생
- Docker 백엔드(Whisper + yt-dlp)는 비전공자에게 진입 장벽이 높음
- Gemini 2.5 Flash가 무료 티어(250 RPD)와 YouTube URL 직접 처리를 모두 지원

### 기술적 결정
- **REST API 직접 호출**: `@google/generative-ai` SDK가 deprecated, `@google/genai`는 Node.js 전용이라 Chrome 서비스 워커 호환성 불확실 → fetch 기반 REST API 직접 호출
- **하이브리드 전략**: 자막 있는 영상은 텍스트 기반(토큰 절약), 자막 없는 영상은 YouTube URL을 fileData로 전달(멀티모달)
- **Watch Later 자동 요약**: chrome.alarms API로 주기적 체크, YouTube 페이지 HTML에서 ytInitialData 파싱

---

## 배운 점

1. **AI와의 협업 방식**: 큰 그림 설계는 AI와 대화로, 세부 구현은 AI가 코드 생성
2. **프롬프트 엔지니어링의 중요성**: 출력 형식을 명확히 지정할수록 파싱 안정성 향상
3. **비용 vs UX 트레이드오프**: Gemini 무료 티어 + YouTube URL 직접 처리로 비용과 UX 문제를 동시에 해결
4. **루브릭 기반 개발**: 평가 기준을 미리 분석하면 불필요한 작업을 줄일 수 있음
5. **SDK vs REST API**: 브라우저 환경에서는 SDK 호환성 문제를 피하기 위해 REST API 직접 호출이 안정적
