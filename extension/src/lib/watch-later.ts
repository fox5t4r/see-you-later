import type { WatchLaterState } from '@/types';
import { DEFAULT_WATCH_LATER_STATE } from '@/types';

const WL_STATE_KEY = 'syl_watch_later';
const DAILY_LIMIT = 240;

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
 * YouTube Watch Later 페이지를 fetch하여 영상 목록 추출.
 * 서비스 워커에서 credentials: 'include'로 YouTube 쿠키를 포함하여 요청합니다.
 */
export async function fetchWatchLaterVideos(): Promise<WatchLaterVideo[]> {
  try {
    const response = await fetch('https://www.youtube.com/playlist?list=WL', {
      credentials: 'include',
      headers: {
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    return parseWatchLaterHtml(html);
  } catch {
    return [];
  }
}

function parseWatchLaterHtml(html: string): WatchLaterVideo[] {
  const videos: WatchLaterVideo[] = [];

  // ytInitialData에서 playlist 영상 목록 추출
  const dataMatch = html.match(/var\s+ytInitialData\s*=\s*({.+?});\s*<\/script>/s);
  if (!dataMatch) return videos;

  try {
    const data = JSON.parse(dataMatch[1]);

    const contents =
      data?.contents
        ?.twoColumnBrowseResultsRenderer
        ?.tabs?.[0]
        ?.tabRenderer
        ?.content
        ?.sectionListRenderer
        ?.contents?.[0]
        ?.itemSectionRenderer
        ?.contents?.[0]
        ?.playlistVideoListRenderer
        ?.contents;

    if (!Array.isArray(contents)) return videos;

    for (const item of contents) {
      const renderer = item?.playlistVideoRenderer;
      if (!renderer) continue;

      const videoId = renderer.videoId;
      const title =
        renderer.title?.runs?.[0]?.text
        ?? renderer.title?.simpleText
        ?? '제목 없음';

      if (videoId && typeof videoId === 'string') {
        videos.push({ videoId, title });
      }
    }
  } catch {
    return videos;
  }

  return videos;
}
