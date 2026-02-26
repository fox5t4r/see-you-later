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

  const update = (key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

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

      {/* API 키 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-700">API 키</h3>
          <button
            onClick={() => setShowApiKeys(!showApiKeys)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {showApiKeys ? '숨기기' : '표시'}
          </button>
        </div>

        <div className="space-y-2">
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">
              Anthropic API Key <span className="text-red-500">*</span>
            </span>
            <input
              type={showApiKeys ? 'text' : 'password'}
              value={settings.anthropicApiKey ?? ''}
              onChange={(e) => update('anthropicApiKey', e.target.value)}
              placeholder="sk-ant-..."
              className="input-field font-mono text-xs"
            />
            <p className="text-xs text-gray-400 mt-1">
              Claude 요약에 사용됩니다.{' '}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                발급받기
              </a>
            </p>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">
              OpenAI API Key
              <span className="text-gray-400 font-normal"> (자막 없는 유튜브 영상용)</span>
            </span>
            <input
              type={showApiKeys ? 'text' : 'password'}
              value={settings.openaiApiKey ?? ''}
              onChange={(e) => update('openaiApiKey', e.target.value)}
              placeholder="sk-..."
              className="input-field font-mono text-xs"
            />
          </label>
        </div>
      </section>

      {/* Whisper 백엔드 */}
      <section className="space-y-2">
        <h3 className="font-semibold text-sm text-gray-700">Whisper 백엔드</h3>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">백엔드 URL</span>
          <input
            type="url"
            value={settings.backendUrl ?? 'http://localhost:8000'}
            onChange={(e) => update('backendUrl', e.target.value)}
            placeholder="http://localhost:8000"
            className="input-field text-xs"
          />
          <p className="text-xs text-gray-400 mt-1">자막 없는 영상 처리를 위한 FastAPI 서버 주소</p>
        </label>
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
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Database ID</span>
          <input
            type="text"
            value={settings.notionDatabaseId ?? ''}
            onChange={(e) => update('notionDatabaseId', e.target.value)}
            placeholder="32자리 ID"
            className="input-field font-mono text-xs"
          />
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
