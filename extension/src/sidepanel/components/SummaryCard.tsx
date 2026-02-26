import React, { useState } from 'react';
import type { SummarizeResult, HistoryItem } from '@/types';

interface SummaryCardProps {
  item: HistoryItem;
  onExportNotion: (item: HistoryItem) => void;
  onExportSlack: (item: HistoryItem) => void;
  onCopyMarkdown: (item: HistoryItem) => void;
}

export default function SummaryCard({
  item,
  onExportNotion,
  onExportSlack,
  onCopyMarkdown,
}: SummaryCardProps) {
  const { result } = item;
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyMarkdown(item);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600 bg-green-50';
    if (score >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="card overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`badge ${item.contentType === 'youtube' ? 'badge-red' : 'badge-blue'}`}>
                {item.contentType === 'youtube' ? '유튜브' : '웹 페이지'}
              </span>
              <span className={`badge ${result.mode === 'learn' ? 'badge-purple' : 'badge-green'}`}>
                {result.mode === 'learn' ? '학습 모드' : '일반 모드'}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
              {item.title}
            </h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-ghost flex-shrink-0 p-1"
            aria-label={isExpanded ? '접기' : '펼치기'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 추천도 */}
          <RecommendationSection result={result} scoreColor={scoreColor} />

          {/* 모드별 콘텐츠 */}
          {result.mode === 'learn' ? (
            <LearnContent result={result} />
          ) : (
            <SummaryContent result={result} />
          )}

          {/* 내보내기 버튼 */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => onExportNotion(item)}
              className="btn-secondary flex-1 text-xs py-1.5"
              title="Notion에 저장"
            >
              Notion 저장
            </button>
            <button
              onClick={() => onExportSlack(item)}
              className="btn-secondary flex-1 text-xs py-1.5"
              title="Slack으로 전송"
            >
              Slack 전송
            </button>
            <button
              onClick={handleCopy}
              className="btn-secondary flex-1 text-xs py-1.5"
              title="마크다운으로 복사"
            >
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationSection({
  result,
  scoreColor,
}: {
  result: SummarizeResult;
  scoreColor: (score: number) => string;
}) {
  const rec = result.recommendation;

  return (
    <div className={`rounded-lg p-3 ${scoreColor(rec.score)}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm">추천도</span>
        <span className="font-bold text-sm tracking-wide">{rec.score} <span className="text-xs font-normal opacity-70">/ 5</span></span>
      </div>
      <p className="text-xs leading-relaxed mt-1">{rec.reason}</p>
      <div className="mt-3 space-y-1.5">
        <p className="text-xs">
          <span className="font-bold opacity-80">추천 대상:</span> {rec.bestFor}
        </p>
        <p className="text-xs">
          <span className="font-bold opacity-80">스킵 대상:</span> {rec.skipIf}
        </p>
        {'worthWatching' in rec && (
          <p className="text-xs">
            <span className="font-bold opacity-80">
              {rec.worthWatching ? '직접 시청 권장' : '요약으로 충분'}
            </span>
            {rec.worthWatchingReason && `: ${rec.worthWatchingReason}`}
          </p>
        )}
        {'worthFullRead' in rec && (
          <p className="text-xs">
            <span className="font-bold opacity-80">
              {rec.worthFullRead ? '전문 읽기 권장' : '요약으로 충분'}
            </span>
            {rec.worthFullReadReason && `: ${rec.worthFullReadReason}`}
          </p>
        )}
      </div>
    </div>
  );
}

function LearnContent({ result }: { result: Extract<SummarizeResult, { mode: 'learn' }> }) {
  return (
    <div className="space-y-3">
      {/* 핵심 개념 */}
      {result.coreConcepts.length > 0 && (
        <section>
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
            핵심 개념
          </h4>
          <div className="space-y-2">
            {result.coreConcepts.map((concept, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-primary-700">{concept.concept}</span>
                  {concept.timestamp && (
                    <span className="text-xs text-gray-400 font-mono">[{concept.timestamp}]</span>
                  )}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{concept.explanation}</p>
                {concept.whyItMatters && (
                  <p className="text-xs text-primary-600 mt-1.5 bg-primary-50 p-2 rounded-md border border-primary-100">
                    <span className="font-medium">💡 핵심 이유: </span>
                    {concept.whyItMatters}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 배울 점 */}
      <section>
        <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
          배울 점
        </h4>
        <ul className="space-y-1">
          {result.keyTakeaways.map((t, i) => (
            <li key={i} className="flex gap-2 text-xs text-gray-700">
              <span className="text-primary-500 flex-shrink-0">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 실제 적용 */}
      <section>
        <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-1">
          실제 적용
        </h4>
        <p className="text-xs text-gray-700 leading-relaxed">{result.practicalApplication}</p>
      </section>

      {/* 배경 지식 */}
      {result.backgroundContext && (
        <section>
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-1">
            배경 지식
          </h4>
          <p className="text-xs text-gray-600 leading-relaxed">{result.backgroundContext}</p>
        </section>
      )}

      {/* 더 알아보기 */}
      {result.furtherLearning && (
        <section>
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-1">
            더 알아보기
          </h4>
          <p className="text-xs text-gray-600 leading-relaxed">{result.furtherLearning}</p>
        </section>
      )}

      {/* 주요 타임스탬프 */}
      {result.keyMoments && result.keyMoments.length > 0 && (
        <KeyMomentsSection moments={result.keyMoments} />
      )}
    </div>
  );
}

function SummaryContent({ result }: { result: Extract<SummarizeResult, { mode: 'summary' }> }) {
  const [showFull, setShowFull] = useState(false);

  return (
    <div className="space-y-3">
      {/* 3줄 요약 */}
      <section>
        <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
          3줄 요약
        </h4>
        <ol className="space-y-1.5">
          {result.threeLineSummary.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-800">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <span className="leading-relaxed">{line}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 전체 요약 */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">
            전체 요약
          </h4>
          <button
            onClick={() => setShowFull(!showFull)}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            {showFull ? '접기' : '펼치기'}
          </button>
        </div>
        <p
          className={`text-xs text-gray-700 leading-relaxed ${
            showFull ? '' : 'line-clamp-4'
          }`}
        >
          {result.fullSummary}
        </p>
      </section>

      {/* 주요 타임스탬프 */}
      {result.keyMoments && result.keyMoments.length > 0 && (
        <KeyMomentsSection moments={result.keyMoments} />
      )}
    </div>
  );
}

function KeyMomentsSection({
  moments,
}: {
  moments: Array<{ timestamp: string; description: string }>;
}) {
  return (
    <section>
      <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
        주요 타임스탬프
      </h4>
      <div className="space-y-1">
        {moments.map((m, i) => (
          <div key={i} className="flex gap-2 text-xs">
            <span className="font-mono text-primary-600 flex-shrink-0">[{m.timestamp}]</span>
            <span className="text-gray-700">{m.description}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
