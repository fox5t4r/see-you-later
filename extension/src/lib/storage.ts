import type { Settings, HistoryItem, DEFAULT_SETTINGS } from '@/types';
import { DEFAULT_SETTINGS as defaults } from '@/types';

const HISTORY_KEY = 'syl_history';
const SETTINGS_KEY = 'syl_settings';
const MAX_HISTORY = 50;

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...defaults, ...(result[SETTINGS_KEY] ?? {}) };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, ...settings } });
}

export async function getHistory(): Promise<HistoryItem[]> {
  const result = await chrome.storage.local.get(HISTORY_KEY);
  return (result[HISTORY_KEY] as HistoryItem[]) ?? [];
}

export async function addToHistory(item: HistoryItem): Promise<void> {
  const history = await getHistory();
  const updated = [item, ...history].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ [HISTORY_KEY]: updated });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(HISTORY_KEY);
}
