# 👁️ See You Later - AI 콘텐츠 요약 크롬 확장 프로그램

웹 페이지와 유튜브 영상을 버튼 한 번으로 AI가 요약해주는 크롬 확장 프로그램입니다.

## 주요 기능

- **웹 페이지 요약**: 어떤 웹 페이지든 핵심 내용을 즉시 요약
- **유튜브 영상 요약**: 자막 기반 요약 + 자막 없는 영상도 Gemini AI가 직접 분석
- **학습 모드**: 핵심 개념, 배울 점, 실제 적용 방법을 친절하게 설명
- **일반 모드**: 3줄 요약 + 전체 상세 요약
- **추천도**: 읽거나 볼 가치가 있는지 1~5점으로 판단
- **Watch Later 자동 요약**: 나중에 볼 동영상을 자동으로 요약하여 Slack/Notion으로 전송
- **내보내기**: Notion 저장, Slack 전송, 마크다운 복사

## 설치 방법

### 방법 1: GitHub Releases (권장)

1. [Releases](../../releases) 페이지에서 최신 `see-you-later-vX.X.X.zip` 다운로드
2. 압축 해제
3. Chrome에서 `chrome://extensions` 접속
4. 우측 상단 **개발자 모드** 활성화
5. **압축 해제된 확장 프로그램을 로드합니다** 클릭
6. 압축 해제된 폴더 선택

### 방법 2: 소스에서 직접 빌드

```bash
git clone https://github.com/YOUR_USERNAME/see-you-later.git
cd see-you-later/extension
npm install
npm run build
```

빌드된 `extension/dist` 폴더를 위 3~6번 과정으로 로드합니다.

## 초기 설정

1. 크롬 확장 아이콘 클릭 → 사이드 패널 열기
2. **설정** 탭으로 이동
3. **Gemini API Key** 입력 ([Google AI Studio에서 무료 발급](https://aistudio.google.com/apikey))
4. (선택) Watch Later 자동 요약을 원한다면 자동 요약 활성화 및 Slack/Notion 연동 설정

별도의 서버 설치나 Docker 실행이 필요 없습니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 크롬 확장 | Manifest V3, TypeScript, React 18, Tailwind CSS, Vite |
| AI 요약 | Gemini 2.5 Flash (Google) |
| 내보내기 | Notion API, Slack Webhook |

## 비용 안내

| 기능 | 비용 |
|------|------|
| 웹 페이지 요약 | 무료 (Gemini 무료 티어) |
| 유튜브 (자막 있음) | 무료 (Gemini 무료 티어) |
| 유튜브 (자막 없음) | 무료 (Gemini 무료 티어) |

**무료 한도**: 하루 약 250회 요약 가능 (Gemini 2.5 Flash 기준)
초과 시 유료 API 키로 업그레이드하면 됩니다.

## 라이선스

MIT
