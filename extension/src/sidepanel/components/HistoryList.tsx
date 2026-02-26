import React, { useState, useEffect } from 'react';
import type { HistoryItem } from '@/types';
import SummaryCard from './SummaryCard';

interface HistoryListProps {
  onExportNotion: (item: HistoryItem) => void;
  onExportSlack: (item: HistoryItem) => void;
  onCopyMarkdown: (item: HistoryItem) => void;
}

type FilterKey = 'learn' | 'summary' | 'youtube' | 'webpage';

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'learn', label: '학습 모드' },
  { key: 'summary', label: '일반 모드' },
  { key: 'youtube', label: '유튜브' },
  { key: 'webpage', label: '웹 페이지' },
];

export default function HistoryList({
  onExportNotion,
  onExportSlack,
  onCopyMarkdown,
}: HistoryListProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());

  const loadHistory = () => {
    chrome.runtime.sendMessage(
      { type: 'GET_HISTORY' },
      (response: { success: boolean; data: HistoryItem[] }) => {
        setLoading(false);
        if (response.success) setHistory(response.data);
      }
    );
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearAll = () => {
    if (!confirm('히스토리를 모두 삭제할까요?')) return;
    chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, () => {
      setHistory([]);
      setSelectedIds(new Set());
      setIsSelectMode(false);
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개를 삭제할까요?`)) return;
    const remaining = history.filter((item) => !selectedIds.has(item.id));
    chrome.runtime.sendMessage(
      { type: 'SAVE_HISTORY', payload: remaining },
      () => {
        setHistory(remaining);
        setSelectedIds(new Set());
        setIsSelectMode(false);
      }
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredHistory = history.filter((item) => {
    if (activeFilters.size === 0) return true;
    const modeMatch =
      (activeFilters.has('learn') && item.result.mode === 'learn') ||
      (activeFilters.has('summary') && item.result.mode === 'summary');
    const typeMatch =
      (activeFilters.has('youtube') && item.contentType === 'youtube') ||
      (activeFilters.has('webpage') && item.contentType === 'webpage');

    const hasModeFilter = activeFilters.has('learn') || activeFilters.has('summary');
    const hasTypeFilter = activeFilters.has('youtube') || activeFilters.has('webpage');

    if (hasModeFilter && hasTypeFilter) return modeMatch && typeMatch;
    if (hasModeFilter) return modeMatch;
    if (hasTypeFilter) return typeMatch;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="loading-dots">
          <div />
          <div />
          <div />
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 mb-4 text-gray-300">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="font-medium text-gray-900 mb-1">히스토리가 없습니다</p>
        <p className="text-xs text-gray-500">요약한 콘텐츠가 여기에 저장됩니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 필터 바 */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-100 space-y-2 flex-shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                activeFilters.has(key)
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
          {activeFilters.size > 0 && (
            <button
              onClick={() => setActiveFilters(new Set())}
              className="px-2.5 py-1 rounded-full text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              초기화
            </button>
          )}
        </div>

        {/* 카운트 + 액션 */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {activeFilters.size > 0
              ? `${filteredHistory.length} / ${history.length}개`
              : `총 ${history.length}개`}
          </p>
          <div className="flex items-center gap-2">
            {isSelectMode ? (
              <>
                <span className="text-xs text-gray-400">{selectedIds.size}개 선택됨</span>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-medium"
                >
                  선택 삭제
                </button>
                <button
                  onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsSelectMode(true)}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  선택 삭제
                </button>
                <span className="text-gray-200">|</span>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  전체 삭제
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 리스트 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-500">해당 조건의 항목이 없습니다</p>
            <button
              onClick={() => setActiveFilters(new Set())}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
            >
              필터 초기화
            </button>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-2 ${isSelectMode ? 'cursor-pointer' : ''}`}
              onClick={isSelectMode ? () => toggleSelect(item.id) : undefined}
            >
              {isSelectMode && (
                <div className="flex-shrink-0 mt-3.5 ml-0.5">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedIds.has(item.id)
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {selectedIds.has(item.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
              <div className={`flex-1 min-w-0 ${isSelectMode ? 'pointer-events-none' : ''}`}>
                <SummaryCard
                  item={item}
                  onExportNotion={onExportNotion}
                  onExportSlack={onExportSlack}
                  onCopyMarkdown={onCopyMarkdown}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
