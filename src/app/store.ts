import { create } from 'zustand';
import { SubtitleFile, Settings, Stats, SubtitleFormat, SubtitleEntry } from '../types';
import { parseSubtitle } from '../services/subtitle/parser';
import { validateSubtitles } from '../services/subtitle/validator';
import { translateSubtitleFile } from '../services/subtitle/translator';
import { serializeSubtitle } from '../services/subtitle/writer';
import { invoke } from '@tauri-apps/api/core';

// Module-level map to track active cancellation controllers
const activeAbortControllers = new Map<string, AbortController>();

interface AppState {
  files: SubtitleFile[];
  activeFileIndex: number;
  settings: Settings;
  stats: Stats;
  isLoadingStats: boolean;
  
  // Actions
  loadSettings: () => void;
  updateSettings: (newSettings: Partial<Settings>) => void;
  openFiles: (filePaths: string[]) => Promise<void>;
  removeFile: (index: number) => void;
  setActiveFileIndex: (index: number) => void;
  updateEntryText: (fileIdx: number, entryIdx: number, newText: string, isTranslated: boolean) => void;
  
  // Translation Trigger
  startTranslation: (fileIdx: number) => Promise<void>;
  cancelTranslation: (fileIdx: number) => void;
  
  // Exporting
  exportSubtitleFile: (
    fileIdx: number,
    format: SubtitleFormat,
    mode: 'translated' | 'bilingual' | 'original',
    savePath: string
  ) => Promise<void>;
  
  // Database Stats
  refreshStats: () => Promise<void>;
  clearDatabaseCache: () => Promise<void>;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  useCache: true,
  maxConcurrent: 1,
  selectedProvider: 'gemini',
  sourceLang: 'auto',
  targetLang: 'vi',
  translationMode: 'standard',
  rateLimitMs: 1000,
  batchSize: 20,
  providers: {
    gemini: {
      apiKey: '',
      model: 'gemini-1.5-flash',
      temperature: 0.3,
    },
    openai: {
      apiKey: '',
      model: 'gpt-4o-mini',
      temperature: 0.3,
    },
    deepl: {
      apiKey: '',
      model: '',
      temperature: 0.0,
    },
    libre: {
      apiKey: '',
      model: '',
      endpoint: 'https://libretranslate.com',
      temperature: 0.0,
    },
    custom: {
      apiKey: '',
      model: 'local-model',
      endpoint: 'http://localhost:11434/v1',
      temperature: 0.3,
    },
  },
};

const DEFAULT_STATS: Stats = {
  totalTranslationsDone: 0,
  totalCachedEntries: 0,
  totalCharsTranslated: 0,
  totalLinesTranslated: 0,
  totalCostUsd: 0,
  averageSpeedLpm: 0,
  history: [],
};

export const useAppStore = create<AppState>((set, get) => ({
  files: [],
  activeFileIndex: -1,
  settings: DEFAULT_SETTINGS,
  stats: DEFAULT_STATS,
  isLoadingStats: false,

  loadSettings: () => {
    const saved = localStorage.getItem('srt_translator_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new settings schema changes
        const merged = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          providers: {
            ...DEFAULT_SETTINGS.providers,
            ...(parsed.providers || {}),
          },
        };
        set({ settings: merged });
        // Set body theme class
        document.documentElement.classList.toggle('dark', merged.theme === 'dark');
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    } else {
      document.documentElement.classList.add('dark');
    }
  },

  updateSettings: (newSettings) => {
    set((state) => {
      const merged = { ...state.settings, ...newSettings };
      // Save to localStorage
      localStorage.setItem('srt_translator_settings', JSON.stringify(merged));
      
      // Update body theme if theme changes
      if (newSettings.theme) {
        document.documentElement.classList.toggle('dark', newSettings.theme === 'dark');
      }
      
      return { settings: merged };
    });
  },

  openFiles: async (filePaths) => {
    const newFiles: SubtitleFile[] = [];
    
    for (const path of filePaths) {
      try {
        // Read file using Rust backend
        const response = await invoke<{
          name: string;
          size: number;
          content: string;
          encoding: string;
        }>('read_subtitle_file', { path });

        // Parse content
        const parseResult = parseSubtitle(response.content);
        
        // Calculate characters and lines count
        const charsCount = parseResult.entries.reduce((sum, e) => sum + e.text.length, 0);
        const linesCount = parseResult.entries.length;

        newFiles.push({
          name: response.name,
          path: path,
          size: response.size,
          format: parseResult.format,
          encoding: response.encoding,
          entries: parseResult.entries,
          translatedEntries: undefined,
          status: 'idle',
          progress: 0,
          charsCount,
          linesCount,
          translatedLinesCount: 0,
          startTimeMillis: 0,
          elapsedTimeMillis: 0,
        });
      } catch (e) {
        console.error(`Error opening file ${path}:`, e);
        // We could display an alert or notification
      }
    }

    if (newFiles.length > 0) {
      set((state) => {
        const updatedFiles = [...state.files, ...newFiles];
        const nextIndex = state.activeFileIndex === -1 ? 0 : state.activeFileIndex;
        return {
          files: updatedFiles,
          activeFileIndex: nextIndex,
        };
      });
    }
  },

  removeFile: (index) => {
    set((state) => {
      const file = state.files[index];
      if (file && activeAbortControllers.has(file.path)) {
        activeAbortControllers.get(file.path)?.abort();
        activeAbortControllers.delete(file.path);
      }

      const updated = state.files.filter((_, i) => i !== index);
      let nextIndex = state.activeFileIndex;
      if (updated.length === 0) {
        nextIndex = -1;
      } else if (nextIndex >= updated.length) {
        nextIndex = updated.length - 1;
      }
      return {
        files: updated,
        activeFileIndex: nextIndex,
      };
    });
  },

  setActiveFileIndex: (index) => {
    set({ activeFileIndex: index });
  },

  updateEntryText: (fileIdx, entryIdx, newText, isTranslated) => {
    set((state) => {
      const updatedFiles = [...state.files];
      const targetFile = { ...updatedFiles[fileIdx] };
      
      if (isTranslated && targetFile.translatedEntries) {
        const updatedEntries = [...targetFile.translatedEntries];
        updatedEntries[entryIdx] = { ...updatedEntries[entryIdx], translatedText: newText };
        targetFile.translatedEntries = updatedEntries;
      } else {
        const updatedEntries = [...targetFile.entries];
        updatedEntries[entryIdx] = { ...updatedEntries[entryIdx], text: newText };
        targetFile.entries = updatedEntries;
      }

      updatedFiles[fileIdx] = targetFile;
      return { files: updatedFiles };
    });
  },

  startTranslation: async (fileIdx) => {
    const file = get().files[fileIdx];
    if (!file || file.status === 'translating') return;

    // Check if API key is missing
    const provider = get().settings.selectedProvider;
    const apiKey = get().settings.providers[provider].apiKey;
    if (provider !== 'libre' && !apiKey) {
      set((state) => {
        const updated = [...state.files];
        updated[fileIdx] = {
          ...updated[fileIdx],
          status: 'failed',
          error: `API key is missing for ${provider.toUpperCase()}. Please configure it in Settings.`,
        };
        return { files: updated };
      });
      return;
    }

    const abortController = new AbortController();
    activeAbortControllers.set(file.path, abortController);

    set((state) => {
      const updated = [...state.files];
      updated[fileIdx] = {
        ...updated[fileIdx],
        status: 'translating',
        progress: 0,
        error: undefined,
        startTimeMillis: Date.now(),
        elapsedTimeMillis: 0,
      };
      return { files: updated };
    });

    // Spawn a timer to update elapsed time
    const timer = setInterval(() => {
      set((state) => {
        const currentFile = state.files[fileIdx];
        if (!currentFile || currentFile.status !== 'translating') {
          clearInterval(timer);
          return {};
        }
        const updated = [...state.files];
        updated[fileIdx] = {
          ...updated[fileIdx],
          elapsedTimeMillis: Date.now() - currentFile.startTimeMillis,
        };
        return { files: updated };
      });
    }, 1000);

    try {
      const translated = await translateSubtitleFile(
        file,
        get().settings,
        (progressUpdate) => {
          set((state) => {
            const updated = [...state.files];
            const currentFile = updated[fileIdx];
            if (!currentFile) return {};

            updated[fileIdx] = {
              ...currentFile,
              progress: progressUpdate.progress,
              status: progressUpdate.status,
              error: progressUpdate.error,
              translatedEntries: progressUpdate.translatedEntries,
              translatedLinesCount: progressUpdate.translatedEntries.filter(e => e.translatedText).length,
            };
            return { files: updated };
          });
        },
        abortController.signal
      );

      // Clean up abort controller on completion
      activeAbortControllers.delete(file.path);
      clearInterval(timer);

      // Refresh DB stats after translating a file
      get().refreshStats();
    } catch (e) {
      clearInterval(timer);
      activeAbortControllers.delete(file.path);
      
      set((state) => {
        const updated = [...state.files];
        if (updated[fileIdx]) {
          updated[fileIdx] = {
            ...updated[fileIdx],
            status: 'failed',
            error: (e as Error).message || 'Translation failed',
          };
        }
        return { files: updated };
      });
    }
  },

  cancelTranslation: (fileIdx) => {
    const file = get().files[fileIdx];
    if (file && activeAbortControllers.has(file.path)) {
      activeAbortControllers.get(file.path)?.abort();
      activeAbortControllers.delete(file.path);
    }
  },

  exportSubtitleFile: async (fileIdx, format, mode, savePath) => {
    const file = get().files[fileIdx];
    if (!file) throw new Error('File not found');

    const entries = mode === 'original' ? file.entries : (file.translatedEntries || file.entries);
    
    // We need original content if we are exporting ASS to preserve style headers
    let originalContent: string | undefined;
    if (file.format === 'ass' && format === 'ass') {
      try {
        const response = await invoke<{ content: string }>('read_subtitle_file', { path: file.path });
        originalContent = response.content;
      } catch (e) {
        console.warn('Failed to read original ASS for export header formatting:', e);
      }
    }

    const serialized = serializeSubtitle(entries, { format, mode }, originalContent);
    
    // Write using Rust backend
    await invoke('write_subtitle_file', {
      path: savePath,
      content: serialized,
    });
  },

  refreshStats: async () => {
    set({ isLoadingStats: true });
    try {
      const rawStats = await invoke<any>('db_get_stats');
      set({
        stats: {
          totalTranslationsDone: rawStats.total_translations_done,
          totalCachedEntries: rawStats.total_cached_entries,
          totalCharsTranslated: rawStats.total_chars_translated,
          totalLinesTranslated: rawStats.total_lines_translated,
          totalCostUsd: rawStats.total_cost_usd,
          averageSpeedLpm: rawStats.average_speed_lpm,
          history: (rawStats.history || []).map((h: any) => ({
            id: h.id,
            file_name: h.file_name,
            provider: h.provider,
            source_lang: h.source_lang,
            target_lang: h.target_lang,
            total_chars: h.total_chars,
            total_lines: h.total_lines,
            cost_est: h.cost_est,
            speed_lpm: h.speed_lpm,
            created_at: h.created_at,
          })),
        },
        isLoadingStats: false,
      });
    } catch (e) {
      console.error('Failed to fetch statistics from database:', e);
      set({ isLoadingStats: false });
    }
  },

  clearDatabaseCache: async () => {
    try {
      await invoke('db_clear_cache');
      await get().refreshStats();
    } catch (e) {
      console.error('Failed to clear database cache:', e);
      throw e;
    }
  },
}));
