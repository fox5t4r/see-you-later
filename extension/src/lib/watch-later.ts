import type { WatchLaterState } from '@/types';
import { DEFAULT_WATCH_LATER_STATE } from '@/types';

const WL_STATE_KEY = 'syl_watch_later';
const DAILY_LIMIT = 240;
const WL_URL = 'https://www.youtube.com/playlist?list=WL';
const MAX_RETRIES = 3;

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
 * 서비스 워커의 fetch()는 브라우저 쿠키가 없어 항상 로그아웃 상태입니다.
 * chrome.scripting으로 YouTube 탭에 스크립트를 주입해 로그인 상태에서 직접 추출합니다.
 *
 * 전략 우선순위:
 *  1. DOM 파싱 (ytd-playlist-video-renderer 요소)
 *  2. ytInitialData 재귀 탐색
 *  3. <script> 태그에서 ytInitialData JSON 추출
 *
 * 실패 시 최대 3회 재시도하며 대기 시간을 점진적으로 늘립니다.
 */
export async function fetchWatchLaterVideos(): Promise<WatchLaterVideo[]> {
  let tabId: number | null = null;
  let createdTab = false;

  try {
    const existingTabs = await chrome.tabs.query({ url: '*://www.youtube.com/playlist?list=WL*' });

    if (existingTabs.length > 0 && existingTabs[0].id != null) {
      tabId = existingTabs[0].id;
      // 기존 탭은 데이터가 오래됐을 수 있으므로 새로고침
      await chrome.tabs.reload(tabId);
      await waitForTabLoad(tabId);
    } else {
      const tab = await chrome.tabs.create({ url: WL_URL, active: false });
      tabId = tab.id ?? null;
      createdTab = true;

      if (tabId == null) return [];
      await waitForTabLoad(tabId);
    }

    // 재시도 로직: 점진적으로 대기 시간 증가
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: extractWatchLaterFromPage,
      });

      const videos = results?.[0]?.result as WatchLaterVideo[] | null;
      if (videos && videos.length > 0) return videos;

      // YouTube SPA 렌더링 대기 후 재시도 (2초, 4초, 6초)
      await sleep((attempt + 1) * 2000);
    }

    return [];
  } catch (err) {
    console.error('[See You Later] Watch Later fetch failed:', err);
    return [];
  } finally {
    if (createdTab && tabId != null) {
      chrome.tabs.remove(tabId).catch(() => {});
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 15000);

    function listener(id: number, info: chrome.tabs.TabChangeInfo) {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        // YouTube SPA가 완전히 렌더링될 시간
        setTimeout(resolve, 3000);
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * YouTube 탭 내부에서 실행 — 다중 전략으로 Watch Later 목록 추출
 * chrome.scripting.executeScript의 func으로 전달되므로 클로저 사용 불가
 */
function extractWatchLaterFromPage(): Array<{ videoId: string; title: string }> {
  const seen = new Set<string>();
  const videos: Array<{ videoId: string; title: string }> = [];

  function addVideo(videoId: string, title: string) {
    if (videoId && !seen.has(videoId)) {
      seen.add(videoId);
      videos.push({ videoId, title: title || '제목 없음' });
    }
  }

  // === 전략 1: DOM 파싱 (YouTube SPA 렌더링 후 가장 신뢰도 높음) ===
  try {
    // 1-a: ytd-playlist-video-renderer 커스텀 요소
    const renderers = document.querySelectorAll('ytd-playlist-video-renderer');
    for (const el of renderers) {
      const link = el.querySelector('a#video-title, a.yt-simple-endpoint[href*="/watch"]') as HTMLAnchorElement | null;
      if (!link) continue;
      const href = link.href || link.getAttribute('href') || '';
      const match = href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (match) {
        addVideo(match[1], (link.textContent ?? '').trim());
      }
    }
    if (videos.length > 0) return videos;

    // 1-b: 일반적인 playlist 영역 내 링크
    const container = document.querySelector('#contents, ytd-playlist-video-list-renderer, [id="playlist-items"]');
    if (container) {
      const links = container.querySelectorAll('a[href*="/watch?v="]');
      for (const a of links) {
        const href = (a as HTMLAnchorElement).href || '';
        const match = href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (match) {
          const title = (a as HTMLElement).textContent?.trim()
            || a.getAttribute('title')
            || '';
          if (title.length > 1) {
            addVideo(match[1], title);
          }
        }
      }
    }
    if (videos.length > 0) return videos;
  } catch {
    // DOM 파싱 실패 — 다음 전략으로
  }

  // === 전략 2: window.ytInitialData 재귀 탐색 ===
  try {
    const ytData = (window as unknown as Record<string, unknown>).ytInitialData;
    if (ytData && typeof ytData === 'object') {
      findPlaylistVideos(ytData);
    }
    if (videos.length > 0) return videos;
  } catch {
    // ytInitialData 파싱 실패
  }

  // === 전략 3: <script> 태그에서 ytInitialData JSON 추출 ===
  try {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent ?? '';
      if (!text.includes('ytInitialData')) continue;

      const match = text.match(/var\s+ytInitialData\s*=\s*(\{.+?\});\s*(?:<\/script>|$)/s);
      if (match) {
        const parsed = JSON.parse(match[1]);
        findPlaylistVideos(parsed);
        if (videos.length > 0) return videos;
      }
    }
  } catch {
    // script 태그 파싱 실패
  }

  return videos;

  function findPlaylistVideos(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      for (const item of obj) findPlaylistVideos(item);
      return;
    }

    const record = obj as Record<string, unknown>;

    if (record['playlistVideoRenderer']) {
      const renderer = record['playlistVideoRenderer'] as Record<string, unknown>;
      const videoId = renderer['videoId'] as string | undefined;
      if (videoId) {
        const titleObj = renderer['title'] as Record<string, unknown> | undefined;
        const runs = titleObj?.['runs'] as Array<{ text?: string }> | undefined;
        const simpleText = titleObj?.['simpleText'] as string | undefined;
        addVideo(videoId, runs?.[0]?.text ?? simpleText ?? '제목 없음');
        return;
      }
    }

    for (const key of Object.keys(record)) {
      if (key === 'thumbnail' || key === 'playerOverlays' || key === 'engagementPanels') continue;
      findPlaylistVideos(record[key]);
    }
  }
}
