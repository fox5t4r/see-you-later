# 기여 가이드

## 브랜치 전략 (GitHub Flow)

- `main`: 항상 배포 가능한 상태를 유지합니다
- feature 브랜치: `feat/기능명` 형식으로 생성합니다
- 작업 완료 후 PR을 통해 `main`에 머지합니다

```
main
 └── feat/phase1-scaffold
 └── feat/youtube-subtitle
 └── feat/whisper-backend
 └── docs/final-documentation
```

## 커밋 메시지 컨벤션 (Conventional Commits)

형식: `type(scope): description`

### type

| type | 설명 |
|------|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `style` | 코드 포맷팅 (기능 변경 없음) |
| `refactor` | 코드 리팩토링 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드 설정, 패키지 업데이트 등 |
| `ci` | CI/CD 설정 변경 |

### scope

| scope | 설명 |
|-------|------|
| `extension` | 크롬 확장 프로그램 |
| `backend` | FastAPI 백엔드 |
| `docs` | 문서 |
| `ci` | CI/CD |
| `deps` | 의존성 |
| `release` | 릴리즈 |

### 예시

```
feat(extension): add web page text extraction using Readability
fix(backend): handle audio files larger than 25MB with chunking
docs: update README with installation guide
ci: add GitHub Actions workflow for extension build
chore(deps): update yt-dlp to latest version
```

## PR 규칙

1. PR 제목은 커밋 컨벤션 형식을 따릅니다
2. PR 템플릿의 모든 항목을 작성합니다
3. UI 변경이 있는 경우 스크린샷을 첨부합니다
4. 빌드가 통과되어야 머지합니다

## 로컬 개발 환경 설정

### 크롬 확장

```bash
cd extension
npm install
npm run dev
```

`chrome://extensions` -> 개발자 모드 -> "압축 해제된 확장 프로그램 로드" -> `extension/dist` 선택

### FastAPI 백엔드

```bash
cd backend
cp .env.example .env
# .env에 OPENAI_API_KEY 입력
docker-compose up
```
