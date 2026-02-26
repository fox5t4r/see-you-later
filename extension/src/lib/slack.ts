import type { HistoryItem } from '@/types';

const SLACK_MAX_TEXT = 2900;

function truncate(text: string, max = SLACK_MAX_TEXT): string {
  return text.length > max ? text.slice(0, max) + '...' : text;
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
    const conceptLines = result.coreConcepts
      .map((c) => `*${c.concept}*\n${c.explanation}`)
      .join('\n\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*핵심 개념:*\n${truncate(conceptLines)}` },
    });

    const takeaways = result.keyTakeaways.map((t) => `• ${t}`).join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*배울 점:*\n${truncate(takeaways)}` },
    });

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*실제 적용:*\n${truncate(result.practicalApplication)}` },
    });
  } else {
    // 일반 모드: 3줄 요약 + 전체 요약 모두 전송
    const threeLine = result.threeLineSummary.map((l) => `• ${l}`).join('\n');
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
    const moments = result.keyMoments.map((m) => `• \`[${m.timestamp}]\` ${m.description}`).join('\n');
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
