import type { ExtractedContent, SummaryMode, SummarizeResult } from '@/types';
import { SYSTEM_PROMPT } from '@/prompts/system';
import {
  LEARN_MODE_WEBPAGE_PROMPT,
  LEARN_MODE_YOUTUBE_PROMPT,
} from '@/prompts/learnMode';
import {
  SUMMARY_MODE_WEBPAGE_PROMPT,
  SUMMARY_MODE_YOUTUBE_PROMPT,
} from '@/prompts/summaryMode';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';
// 콘텐츠 길이 제한 (토큰 절약 - 약 6만 자)
const MAX_CONTENT_LENGTH = 60000;

function buildPrompt(content: ExtractedContent, mode: SummaryMode): string {
  const truncated =
    content.text.length > MAX_CONTENT_LENGTH
      ? content.text.slice(0, MAX_CONTENT_LENGTH) + '\n\n[내용이 너무 길어 일부 생략됨]'
      : content.text;

  if (mode === 'learn') {
    const template =
      content.type === 'youtube'
        ? LEARN_MODE_YOUTUBE_PROMPT
        : LEARN_MODE_WEBPAGE_PROMPT;
    return `${template}\n\n제목: ${content.title}\nURL: ${content.url}\n\n${truncated}`;
  }

  const template =
    content.type === 'youtube'
      ? SUMMARY_MODE_YOUTUBE_PROMPT
      : SUMMARY_MODE_WEBPAGE_PROMPT;
  return `${template}\n\n제목: ${content.title}\nURL: ${content.url}\n\n${truncated}`;
}

export async function summarize(
  content: ExtractedContent,
  mode: SummaryMode,
  apiKey: string
): Promise<SummarizeResult> {
  const userPrompt = buildPrompt(content, mode);

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: '알 수 없는 오류' } }));
    throw new Error(
      `Claude API 오류 (${response.status}): ${(error as { error?: { message?: string } }).error?.message ?? '요청 실패'}`
    );
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };
  const rawText = data.content[0]?.text ?? '';

  // JSON 파싱 - 마크다운 코드블록 제거 후 파싱
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null;
  const jsonStr = jsonMatch ? jsonMatch[1] : rawText;

  try {
    return JSON.parse(jsonStr.trim()) as SummarizeResult;
  } catch {
    throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
  }
}
