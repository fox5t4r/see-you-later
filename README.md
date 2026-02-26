# 👁️ See You Later - AI 콘텐츠 요약 크롬 확장 프로그램

웹 페이지와 유튜브 영상을 버튼 한 번으로 AI가 요약해주는 크롬 확장 프로그램입니다.

## 주요 기능

- **웹 페이지 요약**: 어떤 웹 페이지든 핵심 내용을 즉시 요약
- **유튜브 영상 요약**: 자막 기반 요약 + 자막 없는 영상은 Whisper AI로 음성 변환 후 요약
- **학습 모드**: 핵심 개념, 배울 점, 실제 적용 방법을 친절하게 설명
- **일반 모드**: 3줄 요약 + 전체 상세 요약
- **추천도**: 읽거나 볼 가치가 있는지 1~5점으로 판단
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
3. **Anthropic API Key** 입력 ([발급받기](https://console.anthropic.com))
4. (선택) 자막 없는 유튜브 영상 요약을 원한다면 **OpenAI API Key** 입력 및 백엔드 서버 실행

## Whisper 백엔드 실행 (자막 없는 영상 처리)

자막이 없는 유튜브 영상을 요약하려면 로컬 백엔드 서버가 필요합니다.

```bash
# 1. 환경 변수 설정
cp backend/.env.example backend/.env
# backend/.env에 OPENAI_API_KEY 입력

# 2. Docker로 실행
docker-compose up -d

# 서버 확인
curl http://localhost:8000/health
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 크롬 확장 | Manifest V3, TypeScript, React 18, Tailwind CSS, Vite |
| AI 요약 | Claude Haiku 4.5 (Anthropic) |
| 음성 변환 | Whisper API (OpenAI) |
| 오디오 추출 | yt-dlp |
| 백엔드 | FastAPI, Python 3.12, Docker |
| 내보내기 | Notion API, Slack Webhook |

## 비용 안내

| 기능 | 비용 |
|------|------|
| 웹 페이지 요약 | ~$0.005/회 |
| 유튜브 (자막 있음) | ~$0.004/회 |
| 유튜브 (자막 없음, Whisper) | ~$0.065/회 |

하루 20회 사용 시 월 약 $3~13 수준입니다.

## 개발 환경 설정

[CONTRIBUTING.md](CONTRIBUTING.md)를 참고해주세요.

## 라이선스

MIT
