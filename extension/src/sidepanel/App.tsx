import React, { useState, useEffect, useCallback } from 'react';
import type { SummaryMode, HistoryItem } from '@/types';
import SummaryCard from './components/SummaryCard';
import SettingsView from './components/SettingsView';
import HistoryList from './components/HistoryList';
import { buildMarkdown } from '@/lib/markdown';

type Tab = 'summarize' | 'history' | 'settings';
type SummarizeState =
  | { status: 'idle' }
  | { status: 'loading'; message: string }
  | { status: 'success'; item: HistoryItem }
  | { status: 'error'; message: string };

function sendMsg<T = unknown>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: { success: boolean; data?: T; error?: string }) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.success) {
        reject(new Error(response?.error ?? '알 수 없는 오류'));
        return;
      }
      resolve(response.data as T);
    });
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('summarize');
  const [mode, setMode] = useState<SummaryMode>('summary');
  const [state, setState] = useState<SummarizeState>({ status: 'idle' });
  const [toast, setToast] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    sendMsg<{ defaultMode?: SummaryMode; geminiApiKey?: string }>({ type: 'GET_SETTINGS' }).then((data) => {
      if (data?.defaultMode) setMode(data.defaultMode);
      setHasApiKey(!!data?.geminiApiKey);
    }).catch(() => {});
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSummarize = useCallback(async () => {
    setState({ status: 'loading', message: '페이지 내용을 분석하는 중...' });

    try {
      const data = await sendMsg<{
        result?: unknown;
        historyItem?: HistoryItem;
      }>({ type: 'EXTRACT_AND_SUMMARIZE', payload: { mode } });

      if (data?.historyItem) {
        setState({ status: 'success', item: data.historyItem });
      } else {
        setState({ status: 'error', message: '요약 결과를 받지 못했습니다.' });
      }
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '요약 중 오류가 발생했습니다.',
      });
    }
  }, [mode]);

  const handleExportNotion = (item: HistoryItem) => {
    sendMsg<{ url: string }>({ type: 'EXPORT_NOTION', payload: { item } })
      .then((data) => {
        showToast('Notion에 저장됐습니다!');
        if (data?.url) chrome.tabs.create({ url: data.url });
      })
      .catch((e) => showToast(e.message ?? 'Notion 저장 실패'));
  };

  const handleExportSlack = (item: HistoryItem) => {
    sendMsg({ type: 'EXPORT_SLACK', payload: { item } })
      .then(() => showToast('Slack으로 전송됐습니다!'))
      .catch((e) => showToast(e.message ?? 'Slack 전송 실패'));
  };

  const handleCopyMarkdown = (item: HistoryItem) => {
    const markdown = buildMarkdown(item);
    navigator.clipboard.writeText(markdown).then(() => {
      showToast('마크다운으로 복사됐습니다!');
    });
  };

  const handleSettingsSaved = () => {
    sendMsg<{ geminiApiKey?: string }>({ type: 'GET_SETTINGS' }).then((data) => {
      setHasApiKey(!!data?.geminiApiKey);
    }).catch(() => {});
    setActiveTab('summarize');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-900 rounded-md flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse-fast" />
            </div>
            <h1 className="font-bold text-gray-900 text-sm tracking-tight">See You Later</h1>
          </div>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-md">AI 요약</span>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex">
          {([
            { id: 'summarize', label: '요약' },
            { id: 'history', label: '히스토리' },
            { id: 'settings', label: '설정' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'summarize' && (
          <SummarizeTab
            mode={mode}
            state={state}
            hasApiKey={hasApiKey}
            onModeChange={setMode}
            onSummarize={handleSummarize}
            onRetry={() => setState({ status: 'idle' })}
            onExportNotion={handleExportNotion}
            onExportSlack={handleExportSlack}
            onCopyMarkdown={handleCopyMarkdown}
            onGoToSettings={() => setActiveTab('settings')}
          />
        )}
        {activeTab === 'history' && (
          <HistoryList
            onExportNotion={handleExportNotion}
            onExportSlack={handleExportSlack}
            onCopyMarkdown={handleCopyMarkdown}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsView onSaved={handleSettingsSaved} />
        )}
      </main>

      {toast && (
        <div className="fixed bottom-4 left-4 right-4 bg-gray-800 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg z-50 animate-fade-in whitespace-pre-line leading-relaxed">
          {toast}
        </div>
      )}
    </div>
  );
}

interface SummarizeTabProps {
  mode: SummaryMode;
  state: SummarizeState;
  hasApiKey: boolean | null;
  onModeChange: (mode: SummaryMode) => void;
  onSummarize: () => void;
  onRetry: () => void;
  onExportNotion: (item: HistoryItem) => void;
  onExportSlack: (item: HistoryItem) => void;
  onCopyMarkdown: (item: HistoryItem) => void;
  onGoToSettings: () => void;
}

function SummarizeTab({
  mode,
  state,
  hasApiKey,
  onModeChange,
  onSummarize,
  onRetry,
  onExportNotion,
  onExportSlack,
  onCopyMarkdown,
  onGoToSettings,
}: SummarizeTabProps) {
  if (hasApiKey === false) {
    return (
      <div className="p-4 space-y-4">
        <div className="card p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <div className="w-6 h-6 border-2 border-gray-400 rounded-sm" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 mb-1">시작하기</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Gemini API 키를 설정하면 무료로 콘텐츠 요약을 사용할 수 있습니다.
              <br />
              Google AI Studio에서 무료로 발급받을 수 있습니다.
            </p>
          </div>
          <button onClick={onGoToSettings} className="btn-primary w-full text-sm">
            설정으로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {state.status !== 'loading' && (
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-3 font-medium">요약 모드 선택</p>
          <div className="flex gap-2">
            {([
              { value: 'summary', label: '일반 모드', desc: '3줄 + 전체 요약' },
              { value: 'learn', label: '학습 모드', desc: '개념 + 배울 점' },
            ] as const).map((m) => (
              <button
                key={m.value}
                onClick={() => onModeChange(m.value)}
                className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                  mode === m.value
                    ? 'bg-gray-900 border-gray-900 shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`text-sm font-bold mb-1 ${mode === m.value ? 'text-white' : 'text-gray-900'}`}>
                  {m.label}
                </div>
                <div className={`text-xs ${mode === m.value ? 'text-gray-300' : 'text-gray-500'}`}>
                  {m.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {state.status === 'idle' && (
        <button onClick={onSummarize} className="btn-primary w-full py-3.5 text-sm font-bold shadow-md">
          현재 페이지 요약하기
        </button>
      )}

      {state.status === 'loading' && (
        <div className="card p-8 flex flex-col items-center justify-center min-h-[200px] gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-gray-900 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-medium text-gray-600 text-center animate-pulse">{state.message}</p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="card p-5 space-y-4 border-red-100 bg-red-50/50">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-1 h-2.5 bg-red-500 rounded-full" />
            </div>
            <p className="text-sm text-red-700 font-medium leading-relaxed">{state.message}</p>
          </div>
          <button onClick={onRetry} className="btn-secondary w-full text-sm bg-white">
            다시 시도
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="space-y-3">
          <SummaryCard
            item={state.item}
            onExportNotion={onExportNotion}
            onExportSlack={onExportSlack}
            onCopyMarkdown={onCopyMarkdown}
          />
          <button onClick={onRetry} className="btn-secondary w-full text-sm">
            새로 요약하기
          </button>
        </div>
      )}
    </div>
  );
}
