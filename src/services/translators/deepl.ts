import { ProviderConfig, TranslationMode } from '../../types';

export async function translateDeepL(
  texts: string[],
  sourceLang: string,
  targetLang: string,
  config: ProviderConfig,
  mode: TranslationMode
): Promise<string[]> {
  const { apiKey } = config;
  if (!apiKey) {
    throw new Error('DeepL API key is missing.');
  }

  // Determine endpoint based on API key suffix
  // Free keys end with :fx
  const isFree = apiKey.endsWith(':fx');
  const url = isFree
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';

  // Map languages to DeepL codes (e.g. en -> EN-US, en-US -> EN-US, vi -> VI, etc.)
  // DeepL target language codes are uppercase and support EN-US, EN-GB, DE, FR, JA, etc.
  let mappedTarget = targetLang.toUpperCase();
  if (mappedTarget === 'EN') mappedTarget = 'EN-US';
  if (mappedTarget === 'PT') mappedTarget = 'PT-PT';

  const mappedSource = sourceLang === 'auto' ? undefined : sourceLang.toUpperCase();

  let formality = 'default';
  if (mode === 'movie' || mode === 'anime') {
    formality = 'prefer_less'; // More casual and conversational for media
  } else if (mode === 'context') {
    formality = 'default';
  }

  const requestBody: Record<string, any> = {
    text: texts,
    target_lang: mappedTarget,
    preserve_formatting: true, // Keep spaces and punctuation intact
    tag_handling: 'xml', // Prevent DeepL from breaking subtitle tags like <i>, <b>, or ASS tags
    formality: formality, // Automatically adjust tone based on Translation Mode
  };

  if (mappedSource) {
    requestBody.source_lang = mappedSource;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `DeepL-Auth-Key ${apiKey}`
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepL API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  try {
    if (!data.translations || !Array.isArray(data.translations)) {
      throw new Error('Invalid translation format received from DeepL.');
    }
    return data.translations.map((t: any) => t.text);
  } catch (e) {
    console.error('Failed to parse DeepL response:', e, data);
    throw new Error(`Failed to parse DeepL response: ${(e as Error).message}`);
  }
}
