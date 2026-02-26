import { Readability } from '@mozilla/readability';
import { extractFallback } from '@/lib/readability';
import { extractVideoId } from '@/lib/youtube';
import type { ExtractedContent, Message } from '@/types';

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    extractContent()
      .then((content) => sendResponse({ success: true, data: content }))
      .catch((error) => sendResponse({ success: false, error: (error as Error).message }));
    return true;
  }
});

async function extractContent(): Promise<ExtractedContent> {
  const url = window.location.href;
  const isYoutube =
    url.includes('youtube.com/watch') || url.includes('youtu.be/');

  if (isYoutube) {
    return extractYoutubeContent(url);
  }

  return extractWebpageContent(url);
}

function extractYoutubeContent(url: string): ExtractedContent {
  const videoId = extractVideoId(url);
  const title =
    document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() ??
    document.querySelector('h1.title')?.textContent?.trim() ??
    document.title.replace(' - YouTube', '').trim();

  return {
    type: 'youtube',
    title,
    text: '', // 자막은 Service Worker에서 별도 추출
    url,
    videoId: videoId ?? undefined,
    hasSubtitles: undefined,
  };
}

function extractWebpageContent(url: string): ExtractedContent {
  const docClone = document.cloneNode(true) as Document;
  const reader = new Readability(docClone);
  const article = reader.parse();

  let text = '';
  let title = document.title;

  if (article && article.textContent.length > 200) {
    text = article.textContent.trim();
    title = article.title || title;
  } else {
    // Readability 실패 시 폴백
    text = extractFallback(document);
  }

  return {
    type: 'webpage',
    title,
    text,
    url,
  };
}
