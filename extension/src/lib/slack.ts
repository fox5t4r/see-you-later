import type { HistoryItem } from '@/types';

const SLACK_MAX_TEXT = 2900;

/**
 * AI 응답에서 배열/객체가 섞여 들어올 수 있으므로 항상 문자열로 정규화합니다.
 */
function toSafeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(toSafeString).join(', ');
  if (value !== null && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (typeof v['concept'] === 'string') return v['concept'];
    if (typeof v['text'] === 'string') return v['text'];
    return JSON.stringify(value);
  }
  return String(value ?? '');
}

function truncate(text: unknown, max = SLACK_MAX_TEXT): string {
  const s = toSafeString(text);
  return s.length > max ? s.slice(0, max) + '...' : s;
}

export async function exportToSlack(item: HistoryItem, webhookUrl: string): Promise<void> {
  const result = item.result;
  const stars = '⭐'.repeat(result.recommendation.score);
  const typeEmoji = item.contentType === 'youtube' ? '🎬' : '📄';
  const modeLabel = result.mode === 'learn' ? '학습 모드' : '일반 모드';

  const blocks: unknown[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${typeEmoji} ${item.title}`.slice(0, 150),
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*모드:* ${modeLabel}` },
        { type: 'mrkdwn', text: `*추천도:* ${stars} (${result.recommendation.score}/5)` },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*추천 이유:* ${result.recommendation.reason}` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*✅ 추천 대상:* ${result.recommendation.bestFor}` },
        { type: 'mrkdwn', text: `*⏭️ 스킵 대상:* ${result.recommendation.skipIf}` },
      ],
    },
  ];

  // 유튜브: 직접 시청 권장 여부
  if ('worthWatching' in result.recommendation && result.recommendation.worthWatching !== undefined) {
    const label = result.recommendation.worthWatching ? '🎬 직접 시청 권장' : '📄 요약으로 충분';
    const reason = result.recommendation.worthWatchingReason
      ? `: ${result.recommendation.worthWatchingReason}`
      : '';
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*${label}*${reason}` },
    });
  }

  // 웹 페이지: 전문 읽기 권장 여부
  if ('worthFullRead' in result.recommendation && result.recommendation.worthFullRead !== undefined) {
    const label = result.recommendation.worthFullRead ? '📖 전문 읽기 권장' : '📄 요약으로 충분';
    const reason = result.recommendation.worthFullReadReason
      ? `: ${result.recommendation.worthFullReadReason}`
      : '';
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*${label}*${reason}` },
    });
  }

  blocks.push({ type: 'divider' });

  if (result.mode === 'learn') {
    // 학습 모드: 핵심 개념 + 배울 점 + 실제 적용
    const concepts = Array.isArray(result.coreConcepts) ? result.coreConcepts : [];
    const conceptLines = concepts
      .map((c) => `*${toSafeString(c.concept)}*\n${toSafeString(c.explanation)}`)
      .join('\n\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*핵심 개념:*\n${truncate(conceptLines)}` },
    });

    const takeaways = Array.isArray(result.keyTakeaways) ? result.keyTakeaways : [];
    const takeawayText = takeaways.map((t) => `• ${toSafeString(t)}`).join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*배울 점:*\n${truncate(takeawayText)}` },
    });

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*실제 적용:*\n${truncate(result.practicalApplication)}` },
    });
  } else {
    // 일반 모드: 3줄 요약 + 전체 요약 모두 전송
    const summary = Array.isArray(result.threeLineSummary) ? result.threeLineSummary : [];
    const threeLine = summary.map((l) => `• ${toSafeString(l)}`).join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*3줄 요약:*\n${threeLine}` },
    });

    blocks.push({ type: 'divider' });

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*전체 요약:*\n${truncate(result.fullSummary)}` },
    });
  }

  // 유튜브 주요 타임스탬프
  if ('keyMoments' in result && result.keyMoments && result.keyMoments.length > 0) {
    const moments = result.keyMoments.map((m) => `• \`[${toSafeString(m.timestamp)}]\` ${toSafeString(m.description)}`).join('\n');
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*주요 타임스탬프:*\n${truncate(moments, 1500)}` },
    });
  }

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: '원문 보기', emoji: true },
        url: item.url,
        action_id: 'view_original',
      },
    ],
  });

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  });

  if (!response.ok) {
    throw new Error(`Slack 전송 오류 (${response.status})`);
  }
}
