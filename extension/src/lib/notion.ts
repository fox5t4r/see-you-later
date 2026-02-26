import type { HistoryItem } from '@/types';

const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export async function exportToNotion(
  item: HistoryItem,
  token: string,
  databaseId: string
): Promise<string> {
  const result = item.result;
  const isLearn = result.mode === 'learn';

  // 요약 내용을 Notion 블록으로 변환
  const contentBlocks = buildNotionBlocks(item);

  const response = await fetch(`${NOTION_API_URL}/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        title: {
          title: [{ text: { content: item.title } }],
        },
        URL: { url: item.url },
        타입: {
          select: { name: item.contentType === 'youtube' ? '유튜브' : '웹 페이지' },
        },
        모드: {
          select: { name: isLearn ? '학습 모드' : '일반 모드' },
        },
        추천도: {
          number: result.recommendation.score,
        },
        저장일: {
          date: { start: new Date(item.createdAt).toISOString() },
        },
      },
      children: contentBlocks,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
    throw new Error(
      `Notion 저장 오류 (${response.status}): ${(error as { message?: string }).message ?? '요청 실패'}`
    );
  }

  const page = await response.json() as { url?: string; id: string };
  return page.url ?? `https://notion.so/${page.id}`;
}

function buildNotionBlocks(item: HistoryItem) {
  const result = item.result;
  const blocks: unknown[] = [];

  const heading = (text: string, level: 1 | 2 | 3) => ({
    type: `heading_${level}`,
    [`heading_${level}`]: {
      rich_text: [{ text: { content: text } }],
    },
  });

  const paragraph = (text: string) => ({
    type: 'paragraph',
    paragraph: { rich_text: [{ text: { content: text } }] },
  });

  const bullet = (text: string) => ({
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: text } }] },
  });

  const divider = () => ({ type: 'divider', divider: {} });

  // 추천도
  blocks.push(heading('추천도', 2));
  const stars = '⭐'.repeat(result.recommendation.score);
  blocks.push(paragraph(`${stars} (${result.recommendation.score}/5)`));
  blocks.push(paragraph(`📌 ${result.recommendation.reason}`));
  blocks.push(paragraph(`✅ 추천 대상: ${result.recommendation.bestFor}`));
  blocks.push(paragraph(`⏭️ 스킵 대상: ${result.recommendation.skipIf}`));
  blocks.push(divider());

  if (result.mode === 'learn') {
    blocks.push(heading('핵심 개념', 2));
    result.coreConcepts.forEach((concept) => {
      blocks.push(heading(concept.concept, 3));
      blocks.push(paragraph(concept.explanation));
      if (concept.whyItMatters) blocks.push(paragraph(`💡 ${concept.whyItMatters}`));
    });
    blocks.push(divider());

    blocks.push(heading('배울 점', 2));
    result.keyTakeaways.forEach((t) => blocks.push(bullet(t)));
    blocks.push(divider());

    blocks.push(heading('배경 지식', 2));
    blocks.push(paragraph(result.backgroundContext));

    blocks.push(heading('실제 적용', 2));
    blocks.push(paragraph(result.practicalApplication));

    if (result.furtherLearning) {
      blocks.push(heading('더 알아보기', 2));
      blocks.push(paragraph(result.furtherLearning));
    }
  } else {
    blocks.push(heading('3줄 요약', 2));
    result.threeLineSummary.forEach((line) => blocks.push(bullet(line)));
    blocks.push(divider());

    blocks.push(heading('전체 요약', 2));
    blocks.push(paragraph(result.fullSummary));
  }

  // 주요 타임스탬프 (유튜브)
  if ('keyMoments' in result && result.keyMoments && result.keyMoments.length > 0) {
    blocks.push(divider());
    blocks.push(heading('주요 타임스탬프', 2));
    result.keyMoments.forEach((m) => blocks.push(bullet(`[${m.timestamp}] ${m.description}`)));
  }

  return blocks;
}
