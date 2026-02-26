import { summarize, summarizeYouTubeByUrl } from '@/lib/gemini';
import { getSettings, addToHistory, saveSettings, getHistory, clearHistory } from '@/lib/storage';
import { fetchTranscript, segmentsToText } from '@/lib/youtube';
import { exportToNotion } from '@/lib/notion';
import { exportToSlack } from '@/lib/slack';
import {
  fetchWatchLaterVideos,
  getWatchLaterState,
  saveWatchLaterState,
  trackDailyUsage,
  canMakeRequest,
} from '@/lib/watch-later';
import type {
  Message,
  ExtractedContent,
  SummaryMode,
  HistoryItem,
  Settings,
} from '@/types';

const BLOCKED_PREFIXES = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'devtools://'];
const BLOCKED_HOSTS = ['accounts.google.com', 'chromewebstore.google.com', 'chrome.google.com'];
const WATCH_LATER_ALARM = 'watch-later-sync';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === WATCH_LATER_ALARM) {
    runWatchLaterSync().catch((err) => {
      console.error('Watch Later sync failed:', err);
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  setupWatchLaterAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  setupWatchLaterAlarm();
});

async function setupWatchLaterAlarm() {
  const settings = await getSettings();
  await chrome.alarms.clear(WATCH_LATER_ALARM);

  if (settings.watchLaterEnabled) {
    chrome.alarms.create(WATCH_LATER_ALARM, {
      periodInMinutes: settings.watchLaterInterval,
    });
  }
}

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

      case 'GET_SETTINGS': {
        const settings = await getSettings();
        sendResponse({ success: true, data: settings });
        break;
      }

      case 'SAVE_SETTINGS': {
        const newSettings = message.payload as Partial<Settings>;
        await saveSettings(newSettings);
        await setupWatchLaterAlarm();
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

      case 'SYNC_WATCH_LATER': {
        runWatchLaterSync()
          .then((count) => sendResponse({ success: true, data: { count } }))
          .catch((err) => sendResponse({ success: false, error: err.message }));
        return;
      }

      case 'GET_WATCH_LATER_STATUS': {
        const wlState = await getWatchLaterState();
        sendResponse({ success: true, data: wlState });
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

  if (!settings.geminiApiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. 설정 탭에서 입력해주세요.');
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
      await trackDailyUsage();
      const result = await summarizeYouTubeByUrl(content, mode, settings.geminiApiKey);

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
  }

  await trackDailyUsage();
  const result = await summarize(finalContent, mode, settings.geminiApiKey);

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

async function runWatchLaterSync(): Promise<number> {
  const settings = await getSettings();

  if (!settings.watchLaterEnabled || !settings.geminiApiKey) return 0;
  if (settings.watchLaterAutoExport === 'none') return 0;

  const hasSlack = settings.watchLaterAutoExport !== 'notion' && !!settings.slackWebhookUrl;
  const hasNotion = settings.watchLaterAutoExport !== 'slack'
    && !!settings.notionToken && !!settings.notionDatabaseId;

  if (!hasSlack && !hasNotion) return 0;

  const wlState = await getWatchLaterState();
  const videos = await fetchWatchLaterVideos();

  if (videos.length === 0) return 0;

  const newVideos = wlState.processedVideoIds.length === 0
    ? videos
    : videos.filter((v) => !wlState.processedVideoIds.includes(v.videoId));

  if (newVideos.length === 0) return 0;

  let processed = 0;

  for (const video of newVideos) {
    if (!canMakeRequest(wlState)) {
      break;
    }

    try {
      const content: ExtractedContent = {
        type: 'youtube',
        title: video.title,
        text: '',
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
        videoId: video.videoId,
      };

      const transcriptResult = await fetchTranscript(video.videoId);
      let result;

      if (transcriptResult && transcriptResult.segments.length > 0) {
        content.text = segmentsToText(transcriptResult.segments);
        content.hasSubtitles = true;
        result = await summarize(content, settings.defaultMode, settings.geminiApiKey);
      } else {
        result = await summarizeYouTubeByUrl(content, settings.defaultMode, settings.geminiApiKey);
      }

      await trackDailyUsage();

      const historyItem: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url: content.url,
        title: video.title,
        contentType: 'youtube',
        mode: settings.defaultMode,
        result,
        createdAt: Date.now(),
      };
      await addToHistory(historyItem);

      if (hasSlack) {
        await exportToSlack(historyItem, settings.slackWebhookUrl).catch(() => {});
      }
      if (hasNotion) {
        await exportToNotion(historyItem, settings.notionToken, settings.notionDatabaseId).catch(() => {});
      }

      wlState.processedVideoIds.push(video.videoId);
      processed++;

      // Rate limiting: 분당 10회 한도 준수를 위해 6초 대기
      await new Promise((r) => setTimeout(r, 6500));
    } catch {
      continue;
    }
  }

  wlState.lastCheckedAt = Date.now();
  // 최근 500개만 유지하여 스토리지 절약
  if (wlState.processedVideoIds.length > 500) {
    wlState.processedVideoIds = wlState.processedVideoIds.slice(-500);
  }
  await saveWatchLaterState(wlState);

  if (processed > 0) {
    const target = hasSlack && hasNotion ? 'Slack과 Notion' : hasSlack ? 'Slack' : 'Notion';
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: 'See You Later',
      message: `${processed}개의 새 영상 요약이 ${target}으로 전송되었습니다.`,
    });
  }

  return processed;
}
