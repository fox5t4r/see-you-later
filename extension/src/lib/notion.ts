import type { HistoryItem } from '@/types';

const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/**
 * Notion에 요약 페이지를 생성합니다.
 * notionPageId는 데이터베이스 ID 또는 일반 페이지 ID 모두 허용합니다.
 * 속성(컬럼) 설정 없이 제목과 본문 블록만으로 저장하므로 별도 DB 설정이 불필요합니다.
 */
export async function exportToNotion(
  item: HistoryItem,
  token: string,
  notionPageId: string,
): Promise<string> {
  const cleanId = notionPageId.replace(/-/g, '');
  const isDatabase = await checkIsDatabase(cleanId, token);

  const parent = isDatabase
    ? { database_id: cleanId }
    : { page_id: cleanId };

  const contentBlocks = buildNotionBlocks(item);

  const body: Record<string, unknown> = {
    parent,
    properties: {
      title: {
        title: [{ text: { content: item.title.slice(0, 2000) } }],
      },
    },
    children: contentBlocks,
  };

  const response = await fetch(`${NOTION_API_URL}/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string; code?: string };

    if (response.status === 403 || error.code === 'restricted_resource') {
      throw new Error(
        'Notion 접근 권한 없음\n' +
        '저장할 페이지 우측 상단 ··· → 연결 → Integration 선택',
      );
    }
    if (response.status === 404) {
      throw new Error(
        'Notion 페이지를 찾을 수 없습니다.\n' +
        '설정의 Page ID가 올바른지 확인해주세요.',
      );
    }

    throw new Error(
      `Notion 저장 오류 (${response.status}): ${error.message ?? '요청 실패'}`,
    );
  }

  const page = await response.json() as { url?: string; id: string };
  return page.url ?? `https://notion.so/${page.id.replace(/-/g, '')}`;
}

async function checkIsDatabase(id: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${NOTION_API_URL}/databases/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function notionText(content: string, maxLen = 2000) {
  return [{ text: { content: content.slice(0, maxLen) } }];
}

function buildNotionBlocks(item: HistoryItem) {
  const result = item.result;
  const blocks: unknown[] = [];

  const heading = (text: string, level: 1 | 2 | 3) => ({
    type: `heading_${level}`,
    [`heading_${level}`]: { rich_text: notionText(text) },
  });

  const paragraph = (text: string) => ({
    type: 'paragraph',
    paragraph: { rich_text: notionText(text) },
  });

  const bullet = (text: string) => ({
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: notionText(text) },
  });

  const divider = () => ({ type: 'divider', divider: {} });

  // 메타 정보
  const typeLabel = item.contentType === 'youtube' ? '🎬 유튜브' : '📄 웹 페이지';
  const modeLabel = result.mode === 'learn' ? '학습 모드' : '일반 모드';
  const date = new Date(item.createdAt).toLocaleString('ko-KR');
  const stars = '⭐'.repeat(result.recommendation.score);

  blocks.push(paragraph(`${typeLabel} | ${modeLabel} | ${date}`));
  blocks.push(paragraph(`🔗 ${item.url}`));
  blocks.push(divider());

  // 추천도
  blocks.push(heading('추천도', 2));
  blocks.push(paragraph(`${stars} (${result.recommendation.score}/5)  ${result.recommendation.reason}`));
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

    blocks.push(heading('실제 적용', 2));
    blocks.push(paragraph(result.practicalApplication));

    blocks.push(heading('배경 지식', 2));
    blocks.push(paragraph(result.backgroundContext));

    if (result.furtherLearning) {
      blocks.push(heading('더 알아보기', 2));
      blocks.push(paragraph(result.furtherLearning));
    }
  } else {
    blocks.push(heading('3줄 요약', 2));
    result.threeLineSummary.forEach((line) => blocks.push(bullet(line)));
    blocks.push(divider());

    blocks.push(heading('전체 요약', 2));
    // Notion 블록 하나당 2000자 제한 — 긴 요약은 분할
    const full = result.fullSummary;
    const chunkSize = 1900;
    for (let i = 0; i < full.length; i += chunkSize) {
      blocks.push(paragraph(full.slice(i, i + chunkSize)));
    }
  }

  if ('keyMoments' in result && result.keyMoments && result.keyMoments.length > 0) {
    blocks.push(divider());
    blocks.push(heading('주요 타임스탬프', 2));
    result.keyMoments.forEach((m) => blocks.push(bullet(`[${m.timestamp}] ${m.description}`)));
  }

  // Notion API는 한 번에 최대 100개 블록만 허용
  return blocks.slice(0, 100);
}
