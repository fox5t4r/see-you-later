export const LEARN_MODE_WEBPAGE_PROMPT = `다음 웹 페이지 내용을 분석하여 학습 자료로 재구성해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "mode": "learn",
  "coreConcepts": [
    {
      "concept": "핵심 개념 이름",
      "explanation": "이 개념이 무엇인지 초보자도 이해할 수 있게 설명",
      "whyItMatters": "왜 이것이 중요한지"
    }
  ],
  "keyTakeaways": [
    "배울 점 1 - 구체적으로 어떻게 적용할 수 있는지 포함",
    "배울 점 2",
    "배울 점 3"
  ],
  "backgroundContext": "이 내용을 더 잘 이해하기 위해 알면 좋은 배경지식",
  "practicalApplication": "실제로 이 지식을 어떻게 활용할 수 있는지",
  "furtherLearning": "더 깊이 알고 싶다면 찾아볼 키워드나 주제",
  "recommendation": {
    "score": 2,
    "reason": "냉정하고 솔직한 추천 이유 (좋은 점과 아쉬운 점을 균형 있게)",
    "bestFor": "이런 사람에게 추천",
    "skipIf": "이런 사람은 스킵해도 됨",
    "worthFullRead": false,
    "worthFullReadReason": "전문을 읽을 가치가 있는/없는 이유"
  }
}

score는 냉정하게 평가하세요. 평범한 글은 2~3점입니다. 4점 이상은 정말 뛰어난 글에만 부여하세요.

웹 페이지 내용:`;

export const LEARN_MODE_YOUTUBE_PROMPT = `다음 유튜브 영상의 자막/트랜스크립트를 분석하여 학습 자료로 재구성해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "mode": "learn",
  "videoTitle": "영상 제목 (자막에서 추론)",
  "coreConcepts": [
    {
      "concept": "핵심 개념",
      "explanation": "친절한 설명",
      "timestamp": "MM:SS (해당 내용이 나오는 시점, 없으면 null)"
    }
  ],
  "keyTakeaways": ["배울 점 1", "배울 점 2", "배울 점 3"],
  "backgroundContext": "배경지식",
  "practicalApplication": "실제 활용법",
  "keyMoments": [
    { "timestamp": "MM:SS", "description": "이 시점에서 다루는 내용" }
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
