export const SUMMARY_MODE_WEBPAGE_PROMPT = `다음 웹 페이지 내용을 요약해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "mode": "summary",
  "threeLineSummary": [
    "핵심 내용 첫 번째 줄",
    "핵심 내용 두 번째 줄",
    "핵심 내용 세 번째 줄"
  ],
  "fullSummary": "전체 내용을 읽지 않아도 맥락을 완전히 이해할 수 있는 상세 요약. 글의 주장, 근거, 결론을 모두 포함하여 3~5 문단으로 작성.",
  "recommendation": {
    "score": 2,
    "reason": "냉정하고 솔직한 추천 이유 (좋은 점과 아쉬운 점을 균형 있게)",
    "bestFor": "이런 사람에게 추천",
    "skipIf": "이런 사람은 스킵",
    "worthFullRead": false,
    "worthFullReadReason": "전문을 읽을 가치가 있는/없는 이유"
  }
}

score는 냉정하게 평가하세요. 평범한 글은 2~3점입니다. 4점 이상은 정말 뛰어난 글에만 부여하세요.

웹 페이지 내용:`;

export const SUMMARY_MODE_YOUTUBE_PROMPT = `다음 유튜브 영상의 자막/트랜스크립트를 요약해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "mode": "summary",
  "threeLineSummary": ["첫 번째 줄", "두 번째 줄", "세 번째 줄"],
  "fullSummary": "영상 전체 내용의 상세 요약. 3~5 문단.",
  "keyMoments": [
    { "timestamp": "MM:SS", "description": "주요 포인트" }
  ],
  "recommendation": {
    "score": 2,
    "reason": "냉정하고 솔직한 추천 이유 (좋은 점과 아쉬운 점을 균형 있게)",
    "bestFor": "이런 사람에게 추천",
    "skipIf": "이런 사람은 스킵",
    "worthWatching": false,
    "worthWatchingReason": "직접 시청할 가치가 있는/없는 이유",
    "summaryIsSufficient": true,
    "summaryIsSufficientReason": "요약만으로 충분한지 여부와 이유"
  }
}

score는 냉정하게 평가하세요. 평범한 영상은 2~3점입니다. 4점 이상은 정말 뛰어난 영상에만 부여하세요.

유튜브 자막/트랜스크립트:`;
