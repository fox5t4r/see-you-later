import type { WatchLaterState } from '@/types';
import { DEFAULT_WATCH_LATER_STATE } from '@/types';

const WL_STATE_KEY = 'syl_watch_later';
const DAILY_LIMIT = 240;
const WL_URL = 'https://www.youtube.com/playlist?list=WL';

export interface WatchLaterVideo {
  videoId: string;
  title: string;
}

export async function getWatchLaterState(): Promise<WatchLaterState> {
  const result = await chrome.storage.local.get(WL_STATE_KEY);
  const state = { ...DEFAULT_WATCH_LATER_STATE, ...(result[WL_STATE_KEY] ?? {}) } as WatchLaterState;

  const today = new Date().toISOString().slice(0, 10);
  if (state.dailyResetDate !== today) {
    state.dailyRequestCount = 0;
    state.dailyResetDate = today;
  }

  return state;
}

export async function saveWatchLaterState(state: WatchLaterState): Promise<void> {
  await chrome.storage.local.set({ [WL_STATE_KEY]: state });
}

export async function trackDailyUsage(): Promise<void> {
  const state = await getWatchLaterState();
  state.dailyRequestCount++;
  await saveWatchLaterState(state);
}

export function canMakeRequest(state: WatchLaterState): boolean {
  return state.dailyRequestCount < DAILY_LIMIT;
}

/**
 * YouTube Watch Later 목록을 가져옵니다.
 *
 * 서비스 워커에서 fetch()는 브라우저 쿠키 컨텍스트가 없어 항상 로그아웃 상태로 요청됩니다.
 * 대신 chrome.scripting으로 YouTube 탭에 스크립트를 주입하여 로그인 상태에서 직접 추출합니다.
 * YouTube 탭이 없으면 백그라운드 탭을 열어 처리 후 닫습니다.
 */
export async function fetchWatchLaterVideos(): Promise<WatchLaterVideo[]> {
  let tabId: number | null = null;
  let createdTab = false;

  try {
    // 이미 열려 있는 YouTube WL 탭 찾기
    const existingTabs = await chrome.tabs.query({ url: '*://www.youtube.com/playlist?list=WL*' });
    if (existingTabs.length > 0 && existingTabs[0].id != null) {
      tabId = existingTabs[0].id;
    } else {
      // 백그라운드 탭 생성
      const tab = await chrome.tabs.create({ url: WL_URL, active: false });
      tabId = tab.id ?? null;
      createdTab = true;

      if (tabId == null) return [];

      // 페이지 로드 완료 대기
      await waitForTabLoad(tabId);
    }

    // 탭에서 ytInitialData 추출
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractWatchLaterFromPage,
    });

    const videos = results?.[0]?.result as WatchLaterVideo[] | null;
    return videos ?? [];
  } catch (err) {
    console.error('[See You Later] Watch Later fetch failed:', err);
    return [];
  } finally {
    if (createdTab && tabId != null) {
      chrome.tabs.remove(tabId).catch(() => {});
    }
  }
}

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 10000);

    function listener(id: number, info: chrome.tabs.TabChangeInfo) {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        // DOM이 완전히 렌더링될 시간 추가 대기
        setTimeout(resolve, 1500);
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * YouTube 탭 내부에서 실행되는 함수 — ytInitialData에서 Watch Later 목록 파싱
 * chrome.scripting.executeScript의 func으로 전달되므로 클로저 사용 불가
 * YouTube의 내부 구조는 자주 변경되므로 여러 경로를 순서대로 시도
 */
function extractWatchLaterFromPage(): Array<{ videoId: string; title: string }> {
  const videos: Array<{ videoId: string; title: string }> = [];

  try {
    const data = (window as unknown as { ytInitialData?: unknown }).ytInitialData;
    if (!data) return videos;

    // playlistVideoRenderer를 재귀적으로 찾아 videoId와 title 추출
    function findVideoRenderers(obj: unknown): Array<{ videoId: string; title: string }> {
      const found: Array<{ videoId: string; title: string }> = [];
      if (!obj || typeof obj !== 'object') return found;

      if (Array.isArray(obj)) {
        for (const item of obj) {
          found.push(...findVideoRenderers(item));
        }
        return found;
      }

      const record = obj as Record<string, unknown>;

      if (record['playlistVideoRenderer']) {
        const renderer = record['playlistVideoRenderer'] as Record<string, unknown>;
        const videoId = renderer['videoId'] as string | undefined;
        if (videoId) {
          const titleObj = renderer['title'] as Record<string, unknown> | undefined;
          const runs = titleObj?.['runs'] as Array<{ text?: string }> | undefined;
          const simpleText = titleObj?.['simpleText'] as string | undefined;
          const title = runs?.[0]?.text ?? simpleText ?? '제목 없음';
          found.push({ videoId, title });
          return found;
        }
      }

      for (const key of Object.keys(record)) {
        // 불필요한 깊은 탐색 방지 (thumbnails, playerOverlays 등)
        if (key === 'thumbnail' || key === 'playerOverlays' || key === 'engagementPanels') continue;
        found.push(...findVideoRenderers(record[key]));
      }

      return found;
    }

    const found = findVideoRenderers(data);
    videos.push(...found);
  } catch {
    // 파싱 실패 시 빈 배열 반환
  }

  return videos;
}
