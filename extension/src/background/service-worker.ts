import { summarize } from '@/lib/claude';
import { getSettings, addToHistory, saveSettings, getHistory, clearHistory } from '@/lib/storage';
import { fetchTranscript, segmentsToText, extractVideoId } from '@/lib/youtube';
import { transcribeVideo } from '@/lib/whisper-client';
import { exportToNotion } from '@/lib/notion';
import { exportToSlack } from '@/lib/slack';
import type {
  Message,
  SummarizeMessage,
  ExtractedContent,
  SummaryMode,
  HistoryItem,
} from '@/types';

// 확장 아이콘 클릭 시 사이드 패널 열기
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// 사이드 패널을 아이콘 클릭으로 열 수 있도록 설정
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

// 메시지 핸들러
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // 비동기 응답을 위해 true 반환
});

async function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) {
  try {
    switch (message.type) {
      case 'SUMMARIZE': {
        const { content, mode } = (message as SummarizeMessage).payload;
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
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    sendResponse({ success: false, error: message });
  }
}

async function handleSummarize(content: ExtractedContent, mode: SummaryMode) {
  const settings = await getSettings();

  if (!settings.anthropicApiKey) {
    throw new Error('Anthropic API 키가 설정되지 않았습니다. 설정 탭에서 입력해주세요.');
  }

  // 유튜브이고 텍스트가 없으면 자막 추출 시도
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
      // 자막 없음 - 클라이언트에서 Whisper 확인 필요
      return { needsWhisper: true, videoId: content.videoId };
    }
  }

  const result = await summarize(finalContent, mode, settings.anthropicApiKey);

  // 히스토리에 저장
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
