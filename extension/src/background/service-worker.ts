import { summarize } from '@/lib/claude';
import { getSettings, addToHistory, saveSettings, getHistory, clearHistory } from '@/lib/storage';
import { fetchTranscript, segmentsToText } from '@/lib/youtube';
import { transcribeVideo } from '@/lib/whisper-client';
import { exportToNotion } from '@/lib/notion';
import { exportToSlack } from '@/lib/slack';
import type {
  Message,
  ExtractedContent,
  SummaryMode,
  HistoryItem,
} from '@/types';

const BLOCKED_PREFIXES = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'devtools://'];
const BLOCKED_HOSTS = ['accounts.google.com', 'chromewebstore.google.com', 'chrome.google.com'];

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true;
});

async function handleMessage(
  message: Message,
  sendResponse: (response: unknown) => void,
) {
  try {
    switch (message.type) {
      case 'EXTRACT_AND_SUMMARIZE': {
        const { mode } = message.payload as { mode: SummaryMode };
        const result = await handleExtractAndSummarize(mode);
        sendResponse({ success: true, data: result });
        break;
      }

      case 'SUMMARIZE': {
        const { content, mode } = message.payload as { content: ExtractedContent; mode: SummaryMode };
        const result = await handleSummarize(content, mode);
        sendResponse({ success: true, data: result });
        break;
      }

      case 'WHISPER_TRANSCRIBE': {
        const { videoId } = message.payload as { videoId: string };
        const settings = await getSettings();
        if (!settings.backendUrl) {
          sendResponse({ success: false, error: '백엔드 URL이 설정되지 않았습니다.' });
          break;
        }
        const transcribeResult = await transcribeVideo(videoId, settings.backendUrl);
        sendResponse({ success: true, data: transcribeResult });
        break;
      }

      case 'GET_SETTINGS': {
        const settings = await getSettings();
        sendResponse({ success: true, data: settings });
        break;
      }

      case 'SAVE_SETTINGS': {
        await saveSettings(message.payload as Parameters<typeof saveSettings>[0]);
        sendResponse({ success: true });
        break;
      }

      case 'GET_HISTORY': {
        const history = await getHistory();
        sendResponse({ success: true, data: history });
        break;
      }

      case 'CLEAR_HISTORY': {
        await clearHistory();
        sendResponse({ success: true });
        break;
      }

      case 'EXPORT_NOTION': {
        const { item } = message.payload as { item: HistoryItem };
        const settings = await getSettings();
        if (!settings.notionToken || !settings.notionDatabaseId) {
          sendResponse({ success: false, error: 'Notion 설정이 완료되지 않았습니다.' });
          break;
        }
        const pageUrl = await exportToNotion(item, settings.notionToken, settings.notionDatabaseId);
        sendResponse({ success: true, data: { url: pageUrl } });
        break;
      }

      case 'EXPORT_SLACK': {
        const { item } = message.payload as { item: HistoryItem };
        const settings = await getSettings();
        if (!settings.slackWebhookUrl) {
          sendResponse({ success: false, error: 'Slack Webhook URL이 설정되지 않았습니다.' });
          break;
        }
        await exportToSlack(item, settings.slackWebhookUrl);
        sendResponse({ success: true });
        break;
      }

      default:
        sendResponse({ success: false, error: '알 수 없는 메시지 타입' });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    sendResponse({ success: false, error: msg });
  }
}

function isBlockedUrl(url: string): boolean {
  if (BLOCKED_PREFIXES.some((p) => url.startsWith(p))) return true;
  try {
    const parsed = new URL(url);
    return BLOCKED_HOSTS.includes(parsed.hostname);
  } catch {
    return true;
  }
}

async function extractContentFromTab(tabId: number): Promise<ExtractedContent> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/extractor.js'],
    });
  } catch {
    // content script가 이미 주입되었거나 주입 불가
  }

  await new Promise((r) => setTimeout(r, 150));

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: 'EXTRACT_CONTENT' },
      (response: { success: boolean; data?: ExtractedContent; error?: string }) => {
        if (chrome.runtime.lastError) {
          reject(new Error('페이지와 통신할 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.'));
          return;
        }
        if (!response?.success || !response.data) {
          reject(new Error(response?.error ?? '페이지 내용을 추출할 수 없습니다.'));
          return;
        }
        resolve(response.data);
      },
    );
  });
}

async function handleExtractAndSummarize(mode: SummaryMode) {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs[0];

  if (!tab?.id || !tab.url) {
    throw new Error('현재 탭을 찾을 수 없습니다. 웹 페이지를 열고 다시 시도해주세요.');
  }

  if (isBlockedUrl(tab.url)) {
    throw new Error('이 페이지에서는 요약할 수 없습니다. 일반 웹 페이지나 유튜브에서 사용해주세요.');
  }

  const content = await extractContentFromTab(tab.id);

  if (content.type === 'webpage' && !content.text) {
    throw new Error('이 페이지에서 요약할 콘텐츠를 찾을 수 없습니다. 기사나 블로그 같은 텍스트가 있는 페이지에서 사용해주세요.');
  }

  return handleSummarize(content, mode);
}

async function handleSummarize(content: ExtractedContent, mode: SummaryMode) {
  const settings = await getSettings();

  if (!settings.anthropicApiKey) {
    throw new Error('Anthropic API 키가 설정되지 않았습니다. 설정 탭에서 입력해주세요.');
  }

  let finalContent = content;
  if (content.type === 'youtube' && !content.text && content.videoId) {
    const transcriptResult = await fetchTranscript(content.videoId);

    if (transcriptResult && transcriptResult.segments.length > 0) {
      finalContent = {
        ...content,
        text: segmentsToText(transcriptResult.segments),
        hasSubtitles: true,
      };
    } else {
      return { needsWhisper: true, videoId: content.videoId };
    }
  }

  const result = await summarize(finalContent, mode, settings.anthropicApiKey);

  const historyItem: HistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url: content.url,
    title: content.title,
    contentType: content.type,
    mode,
    result,
    createdAt: Date.now(),
  };
  await addToHistory(historyItem);

  return { result, historyItem };
}
