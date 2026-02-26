import React from 'react';

export default function Popup() {
  const openSidePanel = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
      window.close();
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">👁️</span>
        <div>
          <h1 className="font-bold text-sm text-gray-900">See You Later</h1>
          <p className="text-xs text-gray-400">AI 콘텐츠 요약</p>
        </div>
      </div>
      <button
        onClick={openSidePanel}
        className="btn-primary w-full text-sm py-2.5"
      >
        ✨ 사이드 패널 열기
      </button>
      <p className="text-xs text-gray-400 text-center">
        사이드 패널에서 요약을 시작하세요
      </p>
    </div>
  );
}
