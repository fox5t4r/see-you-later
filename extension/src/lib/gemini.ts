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
const DEFAULT_MODEL = 'gemini-2.5-flash';
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
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
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
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
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
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) {
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') {
      throw new Error('안전 필터에 의해 응답이 차단되었습니다. 다른 콘텐츠로 시도해주세요.');
    }
    throw new Error('AI 응답이 비어있습니다. 다시 시도해주세요.');
  }

  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null;
  const jsonStr = jsonMatch ? jsonMatch[1] : rawText;

  try {
    return JSON.parse(jsonStr.trim()) as SummarizeResult;
  } catch {
    throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
  }
}
