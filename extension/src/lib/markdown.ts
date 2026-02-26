import type { HistoryItem } from '@/types';

export function buildMarkdown(item: HistoryItem): string {
  const result = item.result;
  const date = new Date(item.createdAt).toLocaleDateString('ko-KR');
  const typeLabel = item.contentType === 'youtube' ? '🎬 유튜브' : '📄 웹 페이지';
  const modeLabel = result.mode === 'learn' ? '🎓 학습 모드' : '📄 일반 모드';
  const stars = '⭐'.repeat(result.recommendation.score) + '☆'.repeat(5 - result.recommendation.score);

  const lines: string[] = [
    `# ${item.title}`,
    '',
    `> **${typeLabel}** | **${modeLabel}** | ${date}`,
    `> 🔗 ${item.url}`,
    '',
    '---',
    '',
    `## 추천도: ${stars} (${result.recommendation.score}/5)`,
    '',
    `${result.recommendation.reason}`,
    '',
    `- ✅ **추천 대상**: ${result.recommendation.bestFor}`,
    `- ⏭️ **스킵 대상**: ${result.recommendation.skipIf}`,
  ];

  if ('worthWatching' in result.recommendation) {
    lines.push(
      `- 🎬 **직접 시청**: ${result.recommendation.worthWatching ? '권장' : '불필요'} — ${result.recommendation.worthWatchingReason ?? ''}`
    );
  }
  if ('worthFullRead' in result.recommendation) {
    lines.push(
      `- 📖 **전문 읽기**: ${result.recommendation.worthFullRead ? '권장' : '불필요'} — ${result.recommendation.worthFullReadReason ?? ''}`
    );
  }

  lines.push('', '---', '');

  if (result.mode === 'learn') {
    lines.push('## 핵심 개념', '');
    result.coreConcepts.forEach((c) => {
      lines.push(`### ${c.concept}${c.timestamp ? ` \`[${c.timestamp}]\`` : ''}`);
      lines.push('');
      lines.push(c.explanation);
      if (c.whyItMatters) lines.push('', `> 💡 ${c.whyItMatters}`);
      lines.push('');
    });

    lines.push('## 배울 점', '');
    result.keyTakeaways.forEach((t) => lines.push(`- ${t}`));
    lines.push('');

    lines.push('## 실제 적용', '');
    lines.push(result.practicalApplication, '');

    lines.push('## 배경 지식', '');
    lines.push(result.backgroundContext, '');

    if (result.furtherLearning) {
      lines.push('## 더 알아보기', '');
      lines.push(result.furtherLearning, '');
    }
  } else {
    lines.push('## 3줄 요약', '');
    result.threeLineSummary.forEach((l, i) => lines.push(`${i + 1}. ${l}`));
    lines.push('');

    lines.push('## 전체 요약', '');
    lines.push(result.fullSummary, '');
  }

  if ('keyMoments' in result && result.keyMoments && result.keyMoments.length > 0) {
    lines.push('## 주요 타임스탬프', '');
    result.keyMoments.forEach((m) => lines.push(`- \`[${m.timestamp}]\` ${m.description}`));
    lines.push('');
  }

  return lines.join('\n');
}
