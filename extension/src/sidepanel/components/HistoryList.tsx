import React, { useState, useEffect } from 'react';
import type { HistoryItem } from '@/types';
import SummaryCard from './SummaryCard';

interface HistoryListProps {
  onExportNotion: (item: HistoryItem) => void;
  onExportSlack: (item: HistoryItem) => void;
  onCopyMarkdown: (item: HistoryItem) => void;
}

export default function HistoryList({
  onExportNotion,
  onExportSlack,
  onCopyMarkdown,
}: HistoryListProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleClearHistory = () => {
    if (!confirm('히스토리를 모두 삭제할까요?')) return;
    chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, () => {
      setHistory([]);
    });
  };

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
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">총 {history.length}개</p>
        <button onClick={handleClearHistory} className="text-xs text-red-400 hover:text-red-600">
          전체 삭제
        </button>
      </div>
      {history.map((item) => (
        <SummaryCard
          key={item.id}
          item={item}
          onExportNotion={onExportNotion}
          onExportSlack={onExportSlack}
          onCopyMarkdown={onCopyMarkdown}
        />
      ))}
    </div>
  );
}
