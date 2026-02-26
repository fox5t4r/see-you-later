import type { HistoryItem } from '@/types';

export async function exportToSlack(item: HistoryItem, webhookUrl: string): Promise<void> {
  const result = item.result;
  const stars = '⭐'.repeat(result.recommendation.score);
  const typeEmoji = item.contentType === 'youtube' ? '🎬' : '📄';
  const modeLabel = result.mode === 'learn' ? '학습 모드' : '일반 모드';

  let summaryText = '';
  if (result.mode === 'learn') {
    summaryText = result.keyTakeaways.map((t) => `• ${t}`).join('\n');
  } else {
    summaryText = result.threeLineSummary.map((l) => `• ${l}`).join('\n');
  }

  const message = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${typeEmoji} ${item.title}`,
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
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*핵심 내용:*\n${summaryText}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '원문 보기', emoji: true },
            url: item.url,
            action_id: 'view_original',
          },
        ],
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Slack 전송 오류 (${response.status})`);
  }
}
