// 요약 모드
export type SummaryMode = 'learn' | 'summary';

// 콘텐츠 타입
export type ContentType = 'webpage' | 'youtube';

// 추출된 콘텐츠
export interface ExtractedContent {
  type: ContentType;
  title: string;
  text: string;
  url: string;
  videoId?: string;
  hasSubtitles?: boolean;
}

// 추천도
export interface Recommendation {
  score: 1 | 2 | 3 | 4 | 5;
  reason: string;
  bestFor: string;
  skipIf: string;
  // 웹 페이지용
  worthFullRead?: boolean;
  worthFullReadReason?: string;
  // 유튜브용
  worthWatching?: boolean;
  worthWatchingReason?: string;
  summaryIsSufficient?: boolean;
  summaryIsSufficientReason?: string;
}

// 핵심 개념 (학습 모드)
export interface CoreConcept {
  concept: string;
  explanation: string;
  whyItMatters?: string;
  timestamp?: string;
}

// 주요 순간 (유튜브)
export interface KeyMoment {
  timestamp: string;
  description: string;
}

// 학습 모드 결과
export interface LearnResult {
  mode: 'learn';
  videoTitle?: string;
  coreConcepts: CoreConcept[];
  keyTakeaways: string[];
  backgroundContext: string;
  practicalApplication: string;
  furtherLearning?: string;
  keyMoments?: KeyMoment[];
  recommendation: Recommendation;
}

// 일반 모드 결과
export interface SummaryResult {
  mode: 'summary';
  threeLineSummary: [string, string, string];
  fullSummary: string;
  keyMoments?: KeyMoment[];
  recommendation: Recommendation;
}

export type SummarizeResult = LearnResult | SummaryResult;

// 히스토리 아이템
export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  contentType: ContentType;
  mode: SummaryMode;
  result: SummarizeResult;
  createdAt: number;
}

// 설정
export interface Settings {
  defaultMode: SummaryMode;
  geminiApiKey: string;
  notionToken: string;
  notionDatabaseId: string;
  slackWebhookUrl: string;
  summaryLanguage: 'ko' | 'en';
  watchLaterEnabled: boolean;
  watchLaterInterval: 30 | 60 | 180 | 360;
  watchLaterAutoExport: 'slack' | 'notion' | 'both' | 'none';
}

// 기본 설정값
export const DEFAULT_SETTINGS: Settings = {
  defaultMode: 'summary',
  geminiApiKey: '',
  notionToken: '',
  notionDatabaseId: '',
  slackWebhookUrl: '',
  summaryLanguage: 'ko',
  watchLaterEnabled: false,
  watchLaterInterval: 60,
  watchLaterAutoExport: 'none',
};

// Watch Later 처리된 영상 추적
export interface WatchLaterState {
  processedVideoIds: string[];
  lastCheckedAt: number;
  dailyRequestCount: number;
  dailyResetDate: string;
}

export const DEFAULT_WATCH_LATER_STATE: WatchLaterState = {
  processedVideoIds: [],
  lastCheckedAt: 0,
  dailyRequestCount: 0,
  dailyResetDate: '',
};

// 메시지 타입 (Service Worker <-> Content Script <-> Side Panel)
export type MessageType =
  | 'EXTRACT_CONTENT'
  | 'EXTRACT_AND_SUMMARIZE'
  | 'CONTENT_EXTRACTED'
  | 'SUMMARIZE'
  | 'SUMMARY_RESULT'
  | 'SUMMARY_ERROR'
  | 'OPEN_SIDEPANEL'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'GET_HISTORY'
  | 'CLEAR_HISTORY'
  | 'SAVE_HISTORY'
  | 'EXPORT_NOTION'
  | 'EXPORT_SLACK'
  | 'SYNC_WATCH_LATER'
  | 'GET_WATCH_LATER_STATUS';

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface SummarizeMessage extends Message {
  type: 'SUMMARIZE';
  payload: {
    content: ExtractedContent;
    mode: SummaryMode;
  };
}

export interface SummaryResultMessage extends Message {
  type: 'SUMMARY_RESULT';
  payload: SummarizeResult;
}

export interface SummaryErrorMessage extends Message {
  type: 'SUMMARY_ERROR';
  payload: { message: string };
}
