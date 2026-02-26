import React, { useState, useEffect, useCallback } from 'react';
import type { SummaryMode, HistoryItem, SummarizeResult, ExtractedContent } from '@/types';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('summarize');
  const [mode, setMode] = useState<SummaryMode>('summary');
  const [state, setState] = useState<SummarizeState>({ status: 'idle' });
  const [toast, setToast] = useState<string | null>(null);

  // 기본 모드 설정에서 불러오기
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response: { success: boolean; data: { defaultMode: SummaryMode } }) => {
      if (response.success && response.data.defaultMode) {
        setMode(response.data.defaultMode);
      }
    });
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSummarize = useCallback(async () => {
    setState({ status: 'loading', message: '페이지 내용을 분석하는 중...' });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id || !tab.url) {
      setState({ status: 'error', message: '현재 탭을 찾을 수 없습니다.' });
      return;
    }

    const BLOCKED_PREFIXES = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'devtools://'];
    const BLOCKED_HOSTS = ['accounts.google.com', 'chromewebstore.google.com', 'chrome.google.com'];
    try {
      const url = new URL(tab.url);
      if (
        BLOCKED_PREFIXES.some((p) => tab.url!.startsWith(p)) ||
        BLOCKED_HOSTS.includes(url.hostname)
      ) {
        setState({
          status: 'error',
          message: '이 페이지에서는 요약할 수 없습니다. 일반 웹 페이지나 유튜브에서 사용해주세요.',
        });
        return;
      }
    } catch {
      setState({ status: 'error', message: '유효하지 않은 페이지입니다.' });
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/extractor.js'],
      });
    } catch {
      // 이미 주입되었거나 주입 불가능한 페이지
    }

    await new Promise((r) => setTimeout(r, 100));

    chrome.tabs.sendMessage(
      tab.id,
      { type: 'EXTRACT_CONTENT' },
      (contentResponse: { success: boolean; data: ExtractedContent; error?: string }) => {
        if (chrome.runtime.lastError || !contentResponse?.success) {
          setState({
            status: 'error',
            message: contentResponse?.error ?? '페이지 내용을 가져올 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.',
          });
          return;
        }

        if (!contentResponse.data.text && contentResponse.data.type === 'webpage') {
          setState({
            status: 'error',
            message: '이 페이지에서 요약할 콘텐츠를 찾을 수 없습니다. 기사나 블로그 같은 텍스트 콘텐츠가 있는 페이지에서 사용해주세요.',
          });
          return;
        }

        setState({ status: 'loading', message: 'AI가 요약하는 중...' });

        chrome.runtime.sendMessage(
          { type: 'SUMMARIZE', payload: { content: contentResponse.data, mode } },
          (response: {
            success: boolean;
            data?: { result: SummarizeResult; historyItem: HistoryItem; needsWhisper?: boolean; videoId?: string };
            error?: string;
          }) => {
            if (!response?.success) {
              setState({ status: 'error', message: response?.error ?? '요약 중 오류가 발생했습니다.' });
              return;
            }

            if (response.data?.needsWhisper && response.data.videoId) {
              setState({ status: 'needs_whisper', videoId: response.data.videoId });
              return;
            }

            if (response.data?.historyItem) {
              setState({ status: 'success', item: response.data.historyItem });
            }
          }
        );
      }
    );
  }, [mode]);

  const handleWhisperConfirm = useCallback(
    (videoId: string) => {
      setState({ status: 'loading', message: '음성을 텍스트로 변환하는 중... (1~3분 소요)' });

      chrome.runtime.sendMessage(
        { type: 'WHISPER_TRANSCRIBE', payload: { videoId } },
        (transcribeResponse: { success: boolean; data?: { transcript: string }; error?: string }) => {
          if (!transcribeResponse.success) {
            setState({
              status: 'error',
              message: transcribeResponse.error ?? 'Whisper 변환 중 오류가 발생했습니다.',
            });
            return;
          }

          // 트랜스크립트로 요약 진행
          setState({ status: 'loading', message: 'AI가 요약하는 중...' });

          chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            const content: ExtractedContent = {
              type: 'youtube',
              title: '유튜브 영상',
              text: transcribeResponse.data?.transcript ?? '',
              url: tab.url ?? '',
              videoId,
              hasSubtitles: false,
            };

            chrome.runtime.sendMessage(
              { type: 'SUMMARIZE', payload: { content, mode } },
              (response: { success: boolean; data?: { historyItem: HistoryItem }; error?: string }) => {
                if (!response.success) {
                  setState({ status: 'error', message: response.error ?? '요약 중 오류가 발생했습니다.' });
                  return;
                }
                if (response.data?.historyItem) {
                  setState({ status: 'success', item: response.data.historyItem });
                }
              }
            );
          });
        }
      );
    },
    [mode]
  );

  const handleExportNotion = (item: HistoryItem) => {
    chrome.runtime.sendMessage(
      { type: 'EXPORT_NOTION', payload: { item } },
      (response: { success: boolean; data?: { url: string }; error?: string }) => {
        if (response.success) {
          showToast('✅ Notion에 저장됐습니다!');
          if (response.data?.url) chrome.tabs.create({ url: response.data.url });
        } else {
          showToast(`❌ ${response.error ?? 'Notion 저장 실패'}`);
        }
      }
    );
  };

  const handleExportSlack = (item: HistoryItem) => {
    chrome.runtime.sendMessage(
      { type: 'EXPORT_SLACK', payload: { item } },
      (response: { success: boolean; error?: string }) => {
        if (response.success) {
          showToast('✅ Slack으로 전송됐습니다!');
        } else {
          showToast(`❌ ${response.error ?? 'Slack 전송 실패'}`);
        }
      }
    );
  };

  const handleCopyMarkdown = (item: HistoryItem) => {
    const markdown = buildMarkdown(item);
    navigator.clipboard.writeText(markdown).then(() => {
      showToast('✅ 마크다운으로 복사됐습니다!');
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">👁️</span>
            <h1 className="font-bold text-gray-900 text-sm">See You Later</h1>
          </div>
          <span className="text-xs text-gray-400">AI 콘텐츠 요약</span>
        </div>
      </header>

      {/* 탭 네비게이션 */}
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

      {/* 콘텐츠 영역 */}
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

      {/* 토스트 알림 */}
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
      {/* 모드 선택 */}
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

      {/* 상태별 UI */}
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
