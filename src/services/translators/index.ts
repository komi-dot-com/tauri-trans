import { TranslationProviderType, ProviderConfig, TranslationMode } from '../../types';
import { translateGemini } from './gemini';
import { translateOpenAI } from './openai';
import { translateDeepL } from './deepl';
import { translateLibre } from './libre';
import { invoke } from '@tauri-apps/api/core';

/**
 * Checks cache for a single text using Tauri invoke
 */
async function checkCache(
  sourceText: string,
  sourceLang: string,
  targetLang: string,
  provider: TranslationProviderType,
  mode: TranslationMode
): Promise<string | null> {
  try {
    const cached = await invoke<string | null>('db_get_cache', {
      sourceLang,
      targetLang,
      provider,
      mode,
      sourceText,
    });
    return cached;
  } catch (e) {
    console.error('Failed to get cache from DB:', e);
    return null;
  }
}

/**
 * Saves translation to cache using Tauri invoke
 */
async function saveToCache(
  sourceText: string,
  translatedText: string,
  sourceLang: string,
  targetLang: string,
  provider: TranslationProviderType,
  mode: TranslationMode
): Promise<void> {
  try {
    await invoke('db_set_cache', {
      sourceLang,
      targetLang,
      provider,
      mode,
      sourceText,
      translatedText,
    });
  } catch (e) {
    console.error('Failed to write translation cache to DB:', e);
  }
}

/**
 * Translates a single batch of texts with retry logic and caching
 */
export async function translateBatch(
  texts: string[],
  sourceLang: string,
  targetLang: string,
  provider: TranslationProviderType,
  config: ProviderConfig,
  mode: TranslationMode,
  useCache: boolean = true,
  retries: number = 3,
  retryDelayMs: number = 1000
): Promise<string[]> {
  if (texts.length === 0) return [];

  // Step 1: Check Cache if enabled
  const results: (string | null)[] = new Array(texts.length).fill(null);
  const cacheMissIndices: number[] = [];
  const cacheMissTexts: string[] = [];

  if (useCache) {
    const cacheLookups = await Promise.all(
      texts.map((text) => checkCache(text, sourceLang, targetLang, provider, mode))
    );

    for (let i = 0; i < texts.length; i++) {
      if (cacheLookups[i] !== null) {
        results[i] = cacheLookups[i];
      } else {
        cacheMissIndices.push(i);
        cacheMissTexts.push(texts[i]);
      }
    }
  } else {
    for (let i = 0; i < texts.length; i++) {
      cacheMissIndices.push(i);
      cacheMissTexts.push(texts[i]);
    }
  }

  // If everything is cached, return results directly
  if (cacheMissTexts.length === 0) {
    return results as string[];
  }

  // Step 2: Translate Cache Misses
  let translatedMisses: string[] = [];
  let attempt = 0;

  while (attempt <= retries) {
    try {
      switch (provider) {
        case 'gemini':
          translatedMisses = await translateGemini(cacheMissTexts, sourceLang, targetLang, config, mode);
          break;
        case 'openai':
        case 'custom':
          translatedMisses = await translateOpenAI(cacheMissTexts, sourceLang, targetLang, config, mode);
          break;
        case 'deepl':
          translatedMisses = await translateDeepL(cacheMissTexts, sourceLang, targetLang, config, mode);
          break;
        case 'libre':
          translatedMisses = await translateLibre(cacheMissTexts, sourceLang, targetLang, config);
          break;
        default:
          throw new Error(`Unsupported translation provider: ${provider}`);
      }
      break; // Success! Break retry loop
    } catch (e) {
      attempt++;
      if (attempt > retries) {
        throw new Error(
          `Translation failed after ${retries} retries. Provider error: ${(e as Error).message}`
        );
      }
      console.warn(`Translation attempt ${attempt} failed: ${(e as Error).message}. Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
    }
  }

  // Step 3: Populate Results and Cache the new translations
  for (let i = 0; i < cacheMissIndices.length; i++) {
    const originalIndex = cacheMissIndices[i];
    const translatedText = translatedMisses[i];
    results[originalIndex] = translatedText;

    if (useCache && translatedText) {
      // Run cache writing in background asynchronously (non-blocking)
      saveToCache(texts[originalIndex], translatedText, sourceLang, targetLang, provider, mode);
    }
  }

  return results as string[];
}
