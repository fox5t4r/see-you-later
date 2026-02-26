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

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-pro';
// 2.5 Pro는 thinking을 끌 수 없음 (최소 128). Flash는 0으로 비활성화 가능.
const THINKING_BUDGET = 128;
const MAX_CONTENT_LENGTH = 60000;

interface GeminiPart {
  text?: string;
  fileData?: { mimeType: string; fileUri: string };
}

interface GeminiRequest {
  contents: Array<{ parts: GeminiPart[] }>;
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: {
    maxOutputTokens?: number;
    responseMimeType?: string;
    thinkingConfig?: { thinkingBudget: number };
  };
}

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

function buildYouTubeVideoPrompt(content: ExtractedContent, mode: SummaryMode): string {
  if (mode === 'learn') {
    return content.type === 'youtube'
      ? LEARN_MODE_YOUTUBE_PROMPT
      : LEARN_MODE_WEBPAGE_PROMPT;
  }
  return content.type === 'youtube'
    ? SUMMARY_MODE_YOUTUBE_PROMPT
    : SUMMARY_MODE_WEBPAGE_PROMPT;
}

export async function summarize(
  content: ExtractedContent,
  mode: SummaryMode,
  apiKey: string,
): Promise<SummarizeResult> {
  const userPrompt = buildPrompt(content, mode);

  const body: GeminiRequest = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: THINKING_BUDGET },
    },
  };

  return callGemini(body, apiKey);
}

/**
 * 자막 없는 YouTube 영상을 URL로 직접 Gemini에 전달하여 요약
 */
export async function summarizeYouTubeByUrl(
  content: ExtractedContent,
  mode: SummaryMode,
  apiKey: string,
): Promise<SummarizeResult> {
  const videoUrl = content.url;
  const promptText = buildYouTubeVideoPrompt(content, mode)
    + `\n\n제목: ${content.title}\nURL: ${videoUrl}`;

  const body: GeminiRequest = {
    contents: [{
      parts: [
        { fileData: { mimeType: 'video/mp4', fileUri: videoUrl } },
        { text: promptText },
      ],
    }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: THINKING_BUDGET },
    },
  };

  return callGemini(body, apiKey);
}

async function callGemini(body: GeminiRequest, apiKey: string): Promise<SummarizeResult> {
  const url = `${GEMINI_API_BASE}/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: '알 수 없는 오류' } }));
    const errorObj = error as { error?: { message?: string; status?: string } };
    const status = response.status;

    if (status === 429) {
      throw new Error('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    }
    if (status === 403) {
      throw new Error('API 키가 유효하지 않습니다. 설정에서 Gemini API 키를 확인해주세요.');
    }

    throw new Error(
      `Gemini API 오류 (${status}): ${errorObj.error?.message ?? '요청 실패'}`,
    );
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      finishReason?: string;
    }>;
  };

  const parts = data.candidates?.[0]?.content?.parts ?? [];

  // Gemini 2.5 Flash는 thinking 파트가 먼저 올 수 있음 — thought가 아닌 마지막 텍스트 파트를 사용
  const responsePart = parts.filter((p) => !p.thought && p.text).pop();
  const rawText = responsePart?.text ?? '';

  if (!rawText) {
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') {
      throw new Error('안전 필터에 의해 응답이 차단되었습니다. 다른 콘텐츠로 시도해주세요.');
    }
    console.error('[See You Later] Empty Gemini response. Parts:', JSON.stringify(parts).slice(0, 500));
    throw new Error('AI 응답이 비어있습니다. 다시 시도해주세요.');
  }

  return parseJsonResponse(rawText);
}

function parseJsonResponse(rawText: string): SummarizeResult {
  // 1차: 직접 파싱 (responseMimeType: application/json이면 raw JSON)
  try {
    return JSON.parse(rawText.trim()) as SummarizeResult;
  } catch {
    // 계속 진행
  }

  // 2차: 마크다운 코드블록 제거 후 파싱
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as SummarizeResult;
    } catch {
      // 계속 진행
    }
  }

  // 3차: 첫 번째 { 부터 마지막 } 까지 추출
  const braceStart = rawText.indexOf('{');
  const braceEnd = rawText.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(rawText.slice(braceStart, braceEnd + 1)) as SummarizeResult;
    } catch {
      // 계속 진행
    }
  }

  console.error('[See You Later] Failed to parse response:', rawText.slice(0, 500));
  throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
}
