import { Readability } from '@mozilla/readability';

export interface ParsedArticle {
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
}

export function parseArticle(doc: Document): ParsedArticle | null {
  // Readability는 원본 DOM을 수정하므로 복제본 사용
  const docClone = doc.cloneNode(true) as Document;
  const reader = new Readability(docClone);
  const article = reader.parse();

  if (!article) return null;

  return {
    title: article.title,
    content: article.content,
    textContent: article.textContent,
    excerpt: article.excerpt,
  };
}

// Readability가 실패할 경우 폴백으로 직접 추출
export function extractFallback(doc: Document): string {
  const selectors = ['article', 'main', '[role="main"]', '.content', '#content', 'body'];

  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    if (el) {
      // 스크립트, 스타일, 네비게이션 제거
      const clone = el.cloneNode(true) as Element;
      clone.querySelectorAll('script, style, nav, header, footer, aside, .ad, .advertisement').forEach(
        (node) => node.remove()
      );
      const text = clone.textContent?.trim() ?? '';
      if (text.length > 200) return text;
    }
  }

  return doc.body?.textContent?.trim() ?? '';
}
