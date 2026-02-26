# AI 도구 활용 과정

이 문서는 See You Later 프로젝트 개발 과정에서 AI 도구를 어떻게 활용했는지 상세히 기록합니다.

---

## AI 도구 파이프라인 — 역할 분담 전략

프로젝트 전 과정에서 **각 AI 도구의 강점에 맞게 역할을 분담**하여 활용했습니다.
이 과정은 단순한 분담이 아닌, 컨텍스트를 극한으로 효율적으로 활용하기 위한 컨텍스트 엔지니어링의 일환입니다.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI 도구 파이프라인 흐름도                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 아이디어 탐색          2. 요구사항 명세                          │
│  ┌──────────────┐         ┌──────────────────┐                     │
│  │   Gemini     │         │  Cursor          │                     │
│  │   ChatGPT    │ ──────▶ │  (Claude Opus)   │                     │
│  │              │         │  Plan 모드        │                     │
│  └──────────────┘         └────────┬─────────┘                     │
│   브레인스토밍,                      │                               │
│   경쟁 제품 분석,                    ▼                               │
│   기술 트렌드 조사          3. 구현 (코드 생성)                      │
│                            ┌──────────────────┐                     │
│                            │  Cursor           │                     │
│                            │  (Claude Sonnet)  │                     │
│                            │  Agent 모드       │                     │
│                            └────────┬─────────┘                     │
│                                     │                               │
│                    ┌────────────────┼────────────────┐              │
│                    ▼                ▼                ▼              │
│             4. 트러블슈팅     5. UI/UX 구축     6. 문서화           │
│           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│           │ Cursor       │ │ Cursor       │ │ Cursor       │       │
│           │ (Opus/Sonnet)│ │ (Gemini 3.1) │ │ (Claude Opus)│       │
│           │ 난이도별 분배 │ │ 프론트엔드   │ │ 최종 문서화  │       │
│           └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                     │
│  7. 프로덕션 AI ─────────────────────────────────────────────       │
│  ┌──────────────────────────────────────────────────────┐          │
│  │  Gemini 3 Flash Preview — 실제 사용자에게 요약을 제공하는 AI │          │
│  └──────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 사용한 AI 도구 총정리

| 도구 | 단계 | 역할 |
|------|------|------|
| **Gemini (Google AI Studio)** | 아이디어 탐색 | 크롬 확장 시장 조사, 기존 요약 도구 분석, 기술 가능성 탐색 |
| **ChatGPT (OpenAI)** | 아이디어 탐색 | 사용자 페르소나 정의, 핵심 기능 우선순위 정리, UX 시나리오 구상 |
| **Cursor (Claude Opus)** | 요구사항 명세 | Plan 모드에서 아키텍처 설계, 기술 스택 결정, 요구사항 구조화 |
| **Cursor (Claude Sonnet)** | 구현 | Agent 모드에서 전체 코드 생성, 모듈별 구현 |
| **Cursor (Claude Opus)** | 트러블슈팅 | 복잡한 버그 원인 분석, 아키텍처 레벨 문제 해결 |
| **Cursor (Claude Sonnet)** | 트러블슈팅 | 단순 버그 수정, 타입 에러 해결 |
| **Cursor (Gemini 3.1)** | UI/UX | 프론트엔드 디자인 개선, 모던한 UI 구축 |
| **Cursor (Claude Opus)** | 문서화 | README, CONTRIBUTING, ai-usage.md 등 최종 문서 작성 |
| **Gemini 3 Flash Preview (프로덕션)** | 런타임 | 실제 사용자에게 콘텐츠 요약을 제공하는 프로덕션 AI (250 RPD 무료, 2.5 Pro 대비 2.5배 한도) |
| ~~Claude Haiku 4.5~~ | ~~v0.1.0~~ | v0.2.0에서 Gemini로 교체 |
| ~~OpenAI Whisper~~ | ~~v0.1.0~~ | v0.2.0에서 Gemini 멀티모달로 대체 |

---

## 단계별 상세 활용 내역

### 1단계: 아이디어 탐색 — Gemini + ChatGPT

프로젝트 시작 전, 두 AI 도구를 활용하여 아이디어를 구체화했습니다.

**Gemini 활용**:
- "크롬 확장 프로그램으로 만들 수 있는 AI 기반 생산성 도구" 아이디어 탐색
- 기존 웹 요약 도구 (TLDR This, Summarize, Glasp 등) 기능 비교 분석
- Gemini API vs Claude API vs GPT API의 무료 티어, 성능, 제약사항 비교

**ChatGPT 활용**:
- 타겟 사용자 페르소나 정의: "콘텐츠를 많이 소비하지만 시간이 부족한 직장인/학생"
- 핵심 기능 우선순위 매트릭스 작성 (Impact vs Effort)
- "나중에 볼 동영상" 자동 요약이라는 차별화 포인트 도출
- 사용자 시나리오 흐름 정리: "뉴스 기사 발견 → 요약 → Slack으로 팀 공유"

**의사결정 결과**:
- 단순 요약이 아닌 "추천도 평가 + 내보내기 자동화"로 차별화
- YouTube Watch Later 자동 요약이라는 킬러 기능 확정
- Gemini 무료 티어를 활용한 "사용자 비용 $0" 전략 수립

---

### 2단계: 요구사항 명세 — Cursor (Claude Opus, Plan 모드)

아이디어가 구체화된 후, Cursor의 Plan 모드에서 Claude Opus를 활용하여 기술적 요구사항을 정리했습니다.

**활용 방식**: Plan 모드에서 대화형으로 요구사항 정의 및 아키텍처 설계

- Chrome Extension Manifest V3의 구성 요소 (Service Worker, Content Script, Side Panel) 역할 분리
- Service Worker ↔ Content Script ↔ Side Panel 메시지 패싱 설계
- 데이터 흐름 정의: 콘텐츠 추출 → AI 요약 → 결과 표시 → 내보내기

**프롬프트 예시**:
```
자막이 없는 유튜브도 요약할 수 있으면 좋겠어.
방법 A: pytube + Whisper (백엔드 서버 필요)
방법 B: Gemini 멀티모달 (YouTube URL 직접 전달)
어떤 방식이 더 좋을까? 비용, 구현 난이도, 사용자 경험 관점에서 비교해줘.
```

**AI 응답의 핵심 인사이트**:
- Gemini 방식이 구현은 간단하지만 비용이 7배 높음
- Whisper 방식은 백엔드 서버가 필요하지만 비용 효율적
- v0.1.0에서 Whisper 방식으로 시작 → v0.2.0에서 Gemini 무료 티어 출시 후 전환 결정

**기술 스택 결정 과정**:
```
Q: 크롬 확장 프로그램의 빌드 도구로 뭘 쓰는 게 좋을까?
A: Vite가 가장 적합. Webpack 대비 빌드 속도 10배 빠르고,
   크롬 확장용 플러그인(@crxjs/vite-plugin)도 있지만
   Manifest V3 Side Panel은 수동 설정이 더 안정적.
```

---

### 3단계: 구현 — Cursor (Claude Sonnet, Agent 모드)

요구사항이 확정된 후, Claude Sonnet을 활용하여 전체 코드를 생성했습니다.

**활용 방식**: Agent 모드에서 모듈별 코드 생성 및 타입 안전성 검토

주요 생성 코드:
- `src/types/index.ts`: 전체 데이터 구조 타입 정의 (30+ 타입)
- `src/lib/youtube.ts`: YouTube Innertube API 자막 추출 (비공식 API 역공학)
- `src/lib/gemini.ts`: Gemini REST API 직접 호출 (SDK 호환성 문제 회피)
- `src/lib/notion.ts`: Notion Block Kit 구조화 (요약 결과를 Notion 블록으로 변환)
- `src/lib/slack.ts`: Slack Block Kit 포맷팅
- `src/lib/watch-later.ts`: Watch Later 자동 요약 스케줄러
- `src/background/service-worker.ts`: 메시지 라우팅 및 API 호출 관리
- `src/sidepanel/`: React 기반 사이드 패널 UI 전체

**Sonnet을 선택한 이유**:
- 구현 단계에서는 속도가 중요 — Opus 대비 응답 속도 3~4배 빠름
- 명확한 요구사항이 있는 코드 생성에는 Sonnet의 품질로 충분
- 반복적인 모듈 생성 (lib 파일들)에 비용 효율적

---

### 4단계: 트러블슈팅 — Cursor (Opus + Sonnet, 난이도별 분배)

개발 과정에서 발생한 문제를 **난이도에 따라 Opus와 Sonnet을 분배**하여 해결했습니다.

**Opus로 해결한 복잡한 문제들**:

| 문제 | 원인 | 해결 |
|------|------|------|
| Watch Later 목록 추출 실패 | YouTube DOM 구조가 SPA 특성상 동적 변경 | `ytInitialData` 글로벌 변수 파싱 + `chrome.scripting` 주입 방식으로 전환 |
| Gemini 응답 파싱 실패 | 2.5 Flash의 "thinking" 파트가 응답에 포함 | thinking 파트 필터링 로직 추가 (v0.2.11에서 3 Flash로 전환 후 thinkingBudget=0으로 근본 해결) |
| Notion 내보내기 400 에러 | AI가 배열 필드를 문자열로 반환하는 경우 | 타입 검증 + 자동 변환 레이어 추가 |

**Sonnet으로 해결한 단순 문제들**:

| 문제 | 해결 |
|------|------|
| `@types/mozilla__readability@^0.5.0` 버전 미존재 | `npm show`로 확인 후 `^0.4.2`로 수정 |
| Vite CJS 경고 | `package.json`에 `type: "module"` 추가 |
| Service Worker 동적 임포트 경고 | 정적 임포트로 변환 |
| Content Script IIFE 빌드 필요 | Vite 설정에 별도 빌드 타겟 추가 |

**분배 기준**:
- 문제의 근본 원인이 불명확하거나 아키텍처 레벨 변경이 필요한 경우 → **Opus**
- 에러 메시지가 명확하고 수정 범위가 1~2개 파일인 경우 → **Sonnet**

---

### 5단계: UI/UX 구축 — Cursor (Gemini 3.1)

프론트엔드 디자인 개선에는 Gemini 모델을 활용했습니다.

**활용 방식**: 기존 UI를 모던하게 개편하는 작업에 Gemini 모델 사용

- 사이드 패널 전체 UI/UX 리디자인
- 온보딩 플로우 (API 키 미설정 시 가이드 표시)
- Watch Later 동기화 상태 애니메이션
- 히스토리 필터/선택 삭제 UI
- 추천도 별점 시각화 개선

**Gemini를 선택한 이유**:
- 프론트엔드/디자인 작업에서 시각적 감각이 뛰어남
- Tailwind CSS 클래스 조합에 대한 이해도가 높음
- 애니메이션, 트랜지션 등 인터랙션 디자인 제안이 구체적

---

### 6단계: 문서화 — Cursor (Claude Opus)

최종 문서화 단계에서는 다시 Opus를 활용했습니다.

**활용 방식**: 프로젝트 전체를 이해한 상태에서 고품질 문서 생성

- README.md: 설치 가이드, API 키 발급 가이드, 비용 안내
- CONTRIBUTING.md: 브랜치 전략, 커밋 컨벤션, PR 규칙
- DEVLOG.md: 날짜별 작업 내용 구조화
- docs/ai-usage.md: AI 도구 활용 과정 상세 기록

**Opus를 선택한 이유**:
- 문서화는 프로젝트 전체 맥락을 이해해야 하므로 추론 능력이 중요
- 기술적 내용을 비전공자도 이해할 수 있는 수준으로 풀어쓰는 능력
- 일관된 톤과 구조를 유지하면서 긴 문서를 작성하는 능력

---

## 프롬프트 엔지니어링 — 프로덕션 AI 최적화

실제 사용자에게 요약을 제공하는 Gemini API의 프롬프트를 단계적으로 개선했습니다.

### 시스템 프롬프트 진화

**v1 (초안)**:
```
당신은 요약 전문가입니다. 내용을 요약해주세요.
```
→ 문제: 응답 형식이 일관되지 않아 JSON 파싱 실패 빈번

**v2 (JSON 강제)**:
```
반드시 JSON 형식으로만 응답하세요.
```
→ 문제: JSON은 나오지만 필드 누락, 타입 불일치 발생

**v3 (최종 — 역할 + 규칙 + 스키마 명시)**:
```
당신은 콘텐츠 분석 전문가입니다...
규칙:
1. 모든 응답은 한국어로
2. 반드시 지정된 JSON 형식으로만 응답합니다. JSON 외의 텍스트는 절대 포함하지 않습니다.
3. 추천도 점수 기준: 5점=반드시 읽어야/봐야 함 (상위 5%)
4. 대부분의 콘텐츠는 2~3점이 적절합니다.
```

**개선 효과**: JSON 파싱 실패율 ~30% → ~2% 수준으로 감소

### 4가지 프롬프트 조합

| 모드 | 콘텐츠 | 특징 |
|------|--------|------|
| 일반 × 웹 | 3줄 요약 + 상세 요약 + 추천도 |
| 일반 × 유튜브 | + `summaryIsSufficient` (직접 시청 vs 요약 충분) |
| 학습 × 웹 | 핵심 개념 + 배울 점 + 실제 적용 방법 |
| 학습 × 유튜브 | + 타임스탬프 기반 구간 요약 |

---

## v0.2.0 마이그레이션: Claude + Whisper → Gemini

### 변경 이유 (의사결정 과정)
1. **비용 문제**: Claude API는 무료 티어가 없어 사용자에게 즉시 비용 발생
2. **진입 장벽**: Docker 백엔드(Whisper + yt-dlp)는 비전공자에게 설치가 어려움
3. **기술 기회**: Gemini가 무료 티어와 YouTube URL 직접 처리를 동시 지원

### 기술적 결정
- **REST API 직접 호출**: `@google/generative-ai` SDK가 deprecated, `@google/genai`는 Node.js 전용이라 Chrome 서비스 워커 호환성 불확실 → fetch 기반 REST API 직접 호출
- **하이브리드 전략**: 자막 있는 영상은 텍스트 기반(토큰 절약), 자막 없는 영상은 YouTube URL을 fileData로 전달(멀티모달)
- **Watch Later 자동 요약**: chrome.alarms API로 주기적 체크, YouTube 페이지 HTML에서 ytInitialData 파싱

### 마이그레이션 결과
| 항목 | v0.1.0 (Before) | v0.2.0 (After) |
|------|-----------------|----------------|
| 요약 AI | Claude Haiku 4.5 | Gemini 2.5 Pro → Gemini 3 Flash Preview (v0.2.11) |
| 음성 변환 | OpenAI Whisper (Docker) | Gemini 멀티모달 |
| 백엔드 | FastAPI + Docker | 없음 (서버리스) |
| 사용자 비용 | API 키 유료 | 무료 (Gemini 무료 티어) |
| 설치 난이도 | Docker 필요 | ZIP 압축 해제만 |

---

## v0.2.11 마이그레이션: Gemini 2.5 Pro → Gemini 3 Flash Preview

### 변경 이유
- **무료 한도 2.5배 증가**: 하루 100회(2.5 Pro) → 250회(3 Flash Preview)
- **속도 향상**: 2.5 Pro 대비 약 3배 빠른 응답 — Watch Later 자동 요약 처리 시간 단축
- **Thinking 문제 근본 해결**: `thinkingBudget=0`으로 설정하여 thinking 파트 자체를 비활성화, 기존 필터링 로직 불필요
- **비용 효율**: 유료 전환 시 2.5 Pro($1.25/1M) 대비 3 Flash($0.50/1M)로 60% 저렴

### 변경 내용 (gemini.ts)
```
- DEFAULT_MODEL = 'gemini-2.5-pro'
- THINKING_BUDGET = 128
+ DEFAULT_MODEL = 'gemini-3-flash-preview'
+ THINKING_BUDGET = 0
```

### 마이그레이션 결과
| 항목 | v0.2.10 (Before) | v0.2.11 (After) |
|------|-----------------|----------------|
| 요약 AI | Gemini 2.5 Pro | Gemini 3 Flash Preview |
| 무료 RPD | 100회/일 | **250회/일** |
| 응답 속도 | 기준 | **3배 빠름** |
| Thinking 처리 | 필터링 필요 | **thinkingBudget=0으로 비활성화** |
| 유료 단가 | $1.25/1M 토큰 | **$0.50/1M 토큰** |

---

## 배운 점

1. **AI 도구별 강점 활용**: 아이디어 탐색(Gemini/ChatGPT), 설계(Opus), 구현(Sonnet), UI(Gemini), 문서화(Opus)로 역할 분담하면 효율 극대화
2. **프롬프트 엔지니어링의 중요성**: 출력 형식을 명확히 지정할수록 파싱 안정성 향상
3. **비용 vs UX 트레이드오프**: Gemini 무료 티어 + YouTube URL 직접 처리로 비용과 UX 문제를 동시에 해결
4. **난이도별 모델 분배**: 복잡한 문제는 Opus, 단순 작업은 Sonnet으로 분배하면 비용과 속도 모두 최적화
5. **SDK vs REST API**: 브라우저 환경에서는 SDK 호환성 문제를 피하기 위해 REST API 직접 호출이 안정적
