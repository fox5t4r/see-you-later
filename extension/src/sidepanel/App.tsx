import React, { useState, useEffect, useCallback } from 'react';
import type { SummaryMode, HistoryItem, ExtractedContent } from '@/types';
import SummaryCard from './components/SummaryCard';
import SettingsView from './components/SettingsView';
import HistoryList from './components/HistoryList';
import { buildMarkdown } from '@/lib/markdown';

type Tab = 'summarize' | 'history' | 'settings';
type SummarizeState =
  | { status: 'idle' }
  | { status: 'loading'; message: string }
  | { status: 'needs_whisper'; videoId: string }
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

  useEffect(() => {
    sendMsg<{ defaultMode?: SummaryMode }>({ type: 'GET_SETTINGS' }).then((data) => {
      if (data?.defaultMode) setMode(data.defaultMode);
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
        needsWhisper?: boolean;
        videoId?: string;
      }>({ type: 'EXTRACT_AND_SUMMARIZE', payload: { mode } });

      if (data?.needsWhisper && data.videoId) {
        setState({ status: 'needs_whisper', videoId: data.videoId });
        return;
      }

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

  const handleWhisperConfirm = useCallback(
    async (videoId: string) => {
      setState({ status: 'loading', message: '음성을 텍스트로 변환하는 중... (1~3분 소요)' });

      try {
        const transcribeData = await sendMsg<{ transcript: string }>({
          type: 'WHISPER_TRANSCRIBE',
          payload: { videoId },
        });

        setState({ status: 'loading', message: 'AI가 요약하는 중...' });

        const content: ExtractedContent = {
          type: 'youtube',
          title: '유튜브 영상',
          text: transcribeData?.transcript ?? '',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          videoId,
          hasSubtitles: false,
        };

        const data = await sendMsg<{ historyItem?: HistoryItem }>({
          type: 'SUMMARIZE',
          payload: { content, mode },
        });

        if (data?.historyItem) {
          setState({ status: 'success', item: data.historyItem });
        } else {
          setState({ status: 'error', message: '요약 결과를 받지 못했습니다.' });
        }
      } catch (error) {
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Whisper 변환 중 오류가 발생했습니다.',
        });
      }
    },
    [mode],
  );

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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">👁️</span>
            <h1 className="font-bold text-gray-900 text-sm">See You Later</h1>
          </div>
          <span className="text-xs text-gray-400">AI 콘텐츠 요약</span>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex">
          {([
            { id: 'summarize', label: '요약', icon: '✨' },
            { id: 'history', label: '히스토리', icon: '📚' },
            { id: 'settings', label: '설정', icon: '⚙️' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
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
            onModeChange={setMode}
            onSummarize={handleSummarize}
            onWhisperConfirm={handleWhisperConfirm}
            onRetry={() => setState({ status: 'idle' })}
            onExportNotion={handleExportNotion}
            onExportSlack={handleExportSlack}
            onCopyMarkdown={handleCopyMarkdown}
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
          <SettingsView onSaved={() => setActiveTab('summarize')} />
        )}
      </main>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

interface SummarizeTabProps {
  mode: SummaryMode;
  state: SummarizeState;
  onModeChange: (mode: SummaryMode) => void;
  onSummarize: () => void;
  onWhisperConfirm: (videoId: string) => void;
  onRetry: () => void;
  onExportNotion: (item: HistoryItem) => void;
  onExportSlack: (item: HistoryItem) => void;
  onCopyMarkdown: (item: HistoryItem) => void;
}

function SummarizeTab({
  mode,
  state,
  onModeChange,
  onSummarize,
  onWhisperConfirm,
  onRetry,
  onExportNotion,
  onExportSlack,
  onCopyMarkdown,
}: SummarizeTabProps) {
  return (
    <div className="p-3 space-y-3">
      {state.status !== 'loading' && (
        <div className="card p-3">
          <p className="text-xs text-gray-500 mb-2 font-medium">요약 모드 선택</p>
          <div className="flex gap-2">
            {([
              { value: 'summary', label: '일반 모드', desc: '3줄 + 전체 요약', icon: '📄' },
              { value: 'learn', label: '학습 모드', desc: '개념 + 배울 점', icon: '🎓' },
            ] as const).map((m) => (
              <button
                key={m.value}
                onClick={() => onModeChange(m.value)}
                className={`flex-1 p-2.5 rounded-lg border text-left transition-colors ${
                  mode === m.value
                    ? 'bg-primary-50 border-primary-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="text-base mb-0.5">{m.icon}</div>
                <div className={`text-xs font-semibold ${mode === m.value ? 'text-primary-700' : 'text-gray-700'}`}>
                  {m.label}
                </div>
                <div className="text-xs text-gray-400">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {state.status === 'idle' && (
        <button onClick={onSummarize} className="btn-primary w-full py-3 text-sm">
          ✨ 현재 페이지 요약하기
        </button>
      )}

      {state.status === 'loading' && (
        <div className="card p-6 flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-600 text-center">{state.message}</p>
        </div>
      )}

      {state.status === 'needs_whisper' && (
        <div className="card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎙️</span>
            <div>
              <p className="font-semibold text-sm text-gray-900 mb-1">자막이 없는 영상입니다</p>
              <p className="text-xs text-gray-500">
                Whisper AI로 음성을 텍스트로 변환한 후 요약할 수 있습니다.
                <br />
                <span className="text-yellow-600">⚠️ 추가 비용이 발생하며 1~3분이 소요됩니다.</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onWhisperConfirm(state.videoId)}
              className="btn-primary flex-1 text-sm"
            >
              🎙️ Whisper로 변환하기
            </button>
            <button onClick={onRetry} className="btn-secondary flex-1 text-sm">
              취소
            </button>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="card p-4 space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-sm text-red-600">{state.message}</p>
          </div>
          <button onClick={onRetry} className="btn-secondary w-full text-sm">
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
