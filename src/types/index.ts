export interface SubtitleEntry {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
  translatedText?: string;
  // Optional styling or metadata for VTT/ASS
  styles?: string;
}

export type SubtitleFormat = 'srt' | 'vtt' | 'ass';

export interface SubtitleFile {
  name: string;
  path: string;
  size: number;
  format: SubtitleFormat;
  encoding: string;
  entries: SubtitleEntry[];
  translatedEntries?: SubtitleEntry[];
  status: 'idle' | 'translating' | 'completed' | 'failed';
  progress: number; // 0 to 100
  error?: string;
  
  // Stats
  charsCount: number;
  linesCount: number;
  translatedLinesCount: number;
  startTimeMillis: number;
  elapsedTimeMillis: number;
}

export type TranslationProviderType = 'gemini' | 'openai' | 'deepl' | 'libre' | 'custom';

export type TranslationMode = 'standard' | 'context' | 'movie' | 'anime';

export interface ProviderConfig {
  apiKey: string;
  model: string;
  endpoint?: string;
  region?: string; // DeepL specific
  temperature: number;
}

export interface Settings {
  theme: 'dark' | 'light';
  useCache: boolean;
  maxConcurrent: number;
  providers: Record<TranslationProviderType, ProviderConfig>;
  selectedProvider: TranslationProviderType;
  sourceLang: string; // 'auto' or code
  targetLang: string;
  translationMode: TranslationMode;
  rateLimitMs: number; // Delay between batches
  batchSize: number; // Standard batch size
}

export interface HistoryItem {
  id: number;
  file_name: string;
  provider: string;
  source_lang: string;
  target_lang: string;
  total_chars: number;
  total_lines: number;
  cost_est: number;
  speed_lpm: number;
  created_at: string;
}

export interface Stats {
  totalTranslationsDone: number;
  totalCachedEntries: number;
  totalCharsTranslated: number;
  totalLinesTranslated: number;
  totalCostUsd: number;
  averageSpeedLpm: number;
  history: HistoryItem[];
}
