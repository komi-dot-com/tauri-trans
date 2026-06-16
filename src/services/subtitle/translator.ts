import { SubtitleEntry, SubtitleFile, Settings } from '../../types';
import { translateBatch } from '../translators';
import { invoke } from '@tauri-apps/api/core';

export interface TranslationProgressUpdate {
  progress: number;
  translatedEntries: SubtitleEntry[];
  status: 'translating' | 'completed' | 'failed';
  error?: string;
  speedLpm?: number;
  costEst?: number;
}

/**
 * Estimates cost in USD based on character count and provider
 */
export function estimateTranslationCost(charCount: number, provider: string): number {
  switch (provider) {
    case 'gemini':
      // Gemini 1.5 Flash is around $0.075 / 1M input tokens + $0.30 / 1M output tokens
      // Roughly $0.15 per million characters
      return (charCount / 1_000_000) * 0.15;
    case 'openai':
      // GPT-4o-mini is $0.15 / 1M input tokens + $0.60 / 1M output tokens
      // Roughly $0.40 per million characters
      return (charCount / 1_000_000) * 0.40;
    case 'deepl':
      // DeepL API Pro is €20 per 1M characters (roughly $22)
      return (charCount / 1_000_000) * 22.0;
    default:
      return 0.0; // Free / local
  }
}

/**
 * Translates an entire subtitle file in batches
 */
export async function translateSubtitleFile(
  file: SubtitleFile,
  settings: Settings,
  onProgress: (update: TranslationProgressUpdate) => void,
  abortSignal?: AbortSignal
): Promise<SubtitleEntry[]> {
  const entries = file.entries;
  const totalLines = entries.length;
  const batchSize = settings.batchSize || 30;
  const rateLimitMs = settings.rateLimitMs || 1000;
  
  const provider = settings.selectedProvider;
  const config = settings.providers[provider];
  const mode = settings.translationMode;
  const useCache = settings.useCache;

  const translatedEntries: SubtitleEntry[] = entries.map(e => ({ ...e }));
  
  let translatedLinesCount = 0;
  let totalCharsCount = 0;
  const startTime = Date.now();

  // Split entries into batches
  const batches: SubtitleEntry[][] = [];
  for (let i = 0; i < entries.length; i += batchSize) {
    batches.push(entries.slice(i, i + batchSize));
  }

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    // Check for cancellation
    if (abortSignal?.aborted) {
      throw new Error('Translation was cancelled by the user.');
    }

    const currentBatch = batches[batchIdx];
    const textsToTranslate = currentBatch.map(e => e.text);
    
    // Add up characters
    const batchChars = textsToTranslate.reduce((sum, t) => sum + t.length, 0);
    totalCharsCount += batchChars;

    try {
      // Translate the batch
      const translatedTexts = await translateBatch(
        textsToTranslate,
        settings.sourceLang,
        settings.targetLang,
        provider,
        config,
        mode,
        useCache
      );

      // Apply translations back
      currentBatch.forEach((entry, i) => {
        const globalIdx = batchIdx * batchSize + i;
        translatedEntries[globalIdx].translatedText = translatedTexts[i];
      });

      translatedLinesCount += currentBatch.length;
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const speedLpm = elapsedSeconds > 0 ? (translatedLinesCount / elapsedSeconds) * 60 : 0;
      const costEst = estimateTranslationCost(totalCharsCount, provider);
      const progress = Math.round((translatedLinesCount / totalLines) * 100);

      onProgress({
        progress,
        translatedEntries: [...translatedEntries],
        status: progress === 100 ? 'completed' : 'translating',
        speedLpm: Math.round(speedLpm),
        costEst: parseFloat(costEst.toFixed(4)),
      });

      // Respect rate limits between batches, unless it's the last batch
      if (batchIdx < batches.length - 1) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, rateLimitMs);
          abortSignal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Translation was cancelled by the user.'));
          });
        });
      }
    } catch (error) {
      console.error(`Error translating batch ${batchIdx}:`, error);
      onProgress({
        progress: Math.round((translatedLinesCount / totalLines) * 100),
        translatedEntries,
        status: 'failed',
        error: (error as Error).message || 'Unknown batch translation error',
      });
      throw error;
    }
  }

  // After successful translation, add to history database in Rust
  try {
    const elapsedMinutes = (Date.now() - startTime) / 60000;
    const finalSpeedLpm = elapsedMinutes > 0 ? totalLines / elapsedMinutes : totalLines;
    const finalCostEst = estimateTranslationCost(totalCharsCount, provider);
    
    await invoke('db_add_history', {
      fileName: file.name,
      provider: provider,
      sourceLang: settings.sourceLang,
      targetLang: settings.targetLang,
      totalChars: totalCharsCount,
      totalLines: totalLines,
      costEst: finalCostEst,
      speedLpm: finalSpeedLpm,
    });
  } catch (e) {
    console.error('Failed to save history entry to DB:', e);
  }

  return translatedEntries;
}
