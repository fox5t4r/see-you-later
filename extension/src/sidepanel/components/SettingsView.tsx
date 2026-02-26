import React, { useState, useEffect } from 'react';
import type { Settings } from '@/types';

interface SettingsViewProps {
  onSaved: () => void;
}

export default function SettingsView({ onSaved }: SettingsViewProps) {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response: { success: boolean; data: Settings }) => {
      if (response.success) setSettings(response.data);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    chrome.runtime.sendMessage(
      { type: 'SAVE_SETTINGS', payload: settings },
      (response: { success: boolean }) => {
        setSaving(false);
        if (response.success) {
          setSaved(true);
          setTimeout(() => {
            setSaved(false);
            onSaved();
          }, 1500);
        }
      }
    );
  };

  const handleSyncNow = () => {
    setSyncing(true);
    chrome.runtime.sendMessage(
      { type: 'SYNC_WATCH_LATER' },
      (response: { success: boolean; data?: { count: number }; error?: string }) => {
        setSyncing(false);
        if (response?.success) {
          const count = response.data?.count ?? 0;
          alert(count > 0 ? `${count}개의 영상 요약을 전송했습니다.` : '새로운 영상이 없습니다.');
        } else {
          alert(response?.error ?? '동기화 중 오류가 발생했습니다.');
        }
      }
    );
  };

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const hasWatchLaterExportTarget =
    (settings.watchLaterAutoExport === 'slack' || settings.watchLaterAutoExport === 'both')
      ? !!settings.slackWebhookUrl
      : (settings.watchLaterAutoExport === 'notion' || settings.watchLaterAutoExport === 'both')
        ? !!(settings.notionToken && settings.notionDatabaseId)
        : false;

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="font-bold text-base text-gray-900 mb-1">설정</h2>
        <p className="text-xs text-gray-500">API 키와 연동 서비스를 설정합니다.</p>
      </div>

      {/* 기본 모드 */}
      <section className="space-y-2">
        <h3 className="font-semibold text-sm text-gray-700">기본 요약 모드</h3>
        <div className="flex gap-2">
          {(['summary', 'learn'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => update('defaultMode', mode)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                settings.defaultMode === mode
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {mode === 'summary' ? '📄 일반 모드' : '🎓 학습 모드'}
            </button>
          ))}
        </div>
      </section>

      {/* Gemini API 키 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-700">Gemini API 키</h3>
          <button
            onClick={() => setShowApiKeys(!showApiKeys)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {showApiKeys ? '숨기기' : '표시'}
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">
            API Key <span className="text-red-500">*</span>
          </span>
          <input
            type={showApiKeys ? 'text' : 'password'}
            value={settings.geminiApiKey ?? ''}
            onChange={(e) => update('geminiApiKey', e.target.value)}
            placeholder="AIza..."
            className="input-field font-mono text-xs"
          />
          <p className="text-xs text-gray-400 mt-1">
            무료로 발급 가능합니다.{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              Google AI Studio에서 발급받기
            </a>
          </p>
        </label>

        {!settings.geminiApiKey && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-800">API 키 발급 방법 (무료)</p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>위 링크를 클릭하여 Google AI Studio 접속</li>
              <li>Google 계정으로 로그인</li>
              <li>"Create API Key" 버튼 클릭</li>
              <li>생성된 키를 위 입력란에 붙여넣기</li>
            </ol>
            <p className="text-xs text-blue-600">
              무료 한도: 하루 약 250회 요약 가능
            </p>
          </div>
        )}
      </section>

      {/* Watch Later 자동 요약 */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm text-gray-700">Watch Later 자동 요약</h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={settings.watchLaterEnabled ?? false}
              onChange={(e) => update('watchLaterEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-primary-600 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
          </div>
          <span className="text-xs text-gray-700">자동 요약 활성화</span>
        </label>

        {settings.watchLaterEnabled && (
          <div className="space-y-3 pl-1">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">확인 주기</span>
              <select
                value={settings.watchLaterInterval ?? 60}
                onChange={(e) => update('watchLaterInterval', Number(e.target.value) as Settings['watchLaterInterval'])}
                className="input-field text-xs"
              >
                <option value={30}>30분마다</option>
                <option value={60}>1시간마다</option>
                <option value={180}>3시간마다</option>
                <option value={360}>6시간마다</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">자동 내보내기 대상</span>
              <select
                value={settings.watchLaterAutoExport ?? 'none'}
                onChange={(e) => update('watchLaterAutoExport', e.target.value as Settings['watchLaterAutoExport'])}
                className="input-field text-xs"
              >
                <option value="none">선택 안 함</option>
                <option value="slack">Slack</option>
                <option value="notion">Notion</option>
                <option value="both">Slack + Notion 모두</option>
              </select>
            </label>

            <button
              onClick={handleSyncNow}
              disabled={syncing || !settings.geminiApiKey}
              className="btn-secondary w-full text-xs"
            >
              {syncing ? '동기화 중...' : '지금 동기화'}
            </button>
          </div>
        )}
      </section>

      {/* Notion */}
      <section className="space-y-2">
        <h3 className="font-semibold text-sm text-gray-700">Notion 연동</h3>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Integration Token</span>
          <input
            type={showApiKeys ? 'text' : 'password'}
            value={settings.notionToken ?? ''}
            onChange={(e) => update('notionToken', e.target.value)}
            placeholder="secret_..."
            className="input-field font-mono text-xs"
          />
          <p className="text-xs text-gray-400 mt-1">
            <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
              Integration 생성
            </a>
            {' '}후 Secret 키 입력
          </p>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">
            Page ID
            <span className="text-gray-400 font-normal"> (데이터베이스 또는 일반 페이지)</span>
          </span>
          <input
            type="text"
            value={settings.notionDatabaseId ?? ''}
            onChange={(e) => update('notionDatabaseId', e.target.value)}
            placeholder="notion.so/... URL에서 32자리 ID 복사"
            className="input-field font-mono text-xs"
          />
          <p className="text-xs text-gray-400 mt-1">
            저장할 Notion 페이지를 열고 우측 상단 ··· → <strong>Connections</strong>에서 Integration 연결 후 URL의 마지막 32자리 입력
          </p>
        </label>
      </section>

      {/* Slack */}
      <section className="space-y-2">
        <h3 className="font-semibold text-sm text-gray-700">Slack 연동</h3>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Webhook URL</span>
          <input
            type={showApiKeys ? 'text' : 'password'}
            value={settings.slackWebhookUrl ?? ''}
            onChange={(e) => update('slackWebhookUrl', e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="input-field font-mono text-xs"
          />
        </label>
      </section>

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className="btn-primary w-full"
      >
        {saved ? '✅ 저장됨' : saving ? '저장 중...' : '설정 저장'}
      </button>
    </div>
  );
}
