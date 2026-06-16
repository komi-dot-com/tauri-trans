import { ProviderConfig } from '../../types';

export async function translateLibre(
  texts: string[],
  sourceLang: string,
  targetLang: string,
  config: ProviderConfig
): Promise<string[]> {
  const { apiKey, endpoint } = config;
  const baseUrl = endpoint || 'https://libretranslate.com';
  const url = `${baseUrl}/translate`;

  const mappedSource = sourceLang === 'auto' ? 'auto' : sourceLang.toLowerCase();
  const mappedTarget = targetLang.toLowerCase();

  const requestBody: Record<string, any> = {
    q: texts,
    source: mappedSource,
    target: mappedTarget,
    format: 'text',
  };

  if (apiKey) {
    requestBody.api_key = apiKey;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LibreTranslate Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  try {
    if (Array.isArray(data)) {
      return data.map((t: any) => t.translatedText || t);
    }
    if (data.translatedText) {
      if (Array.isArray(data.translatedText)) {
        return data.translatedText;
      }
      return [data.translatedText];
    }
    throw new Error('Invalid translation format received from LibreTranslate.');
  } catch (e) {
    console.error('Failed to parse LibreTranslate response:', e, data);
    throw new Error(`Failed to parse LibreTranslate response: ${(e as Error).message}`);
  }
}
