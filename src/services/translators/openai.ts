import { ProviderConfig, TranslationMode } from '../../types';
import { buildGeminiPrompt } from './gemini'; // Re-use prompt builder

export async function translateOpenAI(
  texts: string[],
  sourceLang: string,
  targetLang: string,
  config: ProviderConfig,
  mode: TranslationMode
): Promise<string[]> {
  const { apiKey, model, temperature, endpoint } = config;
  if (!apiKey) {
    throw new Error('OpenAI API key is missing.');
  }

  // Support custom endpoint (for OpenAI compatible services) or fallback to official
  const baseUrl = endpoint || 'https://api.openai.com/v1';
  const url = `${baseUrl}/chat/completions`;

  const prompt = buildGeminiPrompt(sourceLang, targetLang, mode);

  const isCustomEndpoint = !!endpoint && !endpoint.includes('api.openai.com');

  const requestBody: any = {
    model: model || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: prompt
      },
      {
        role: 'user',
        content: `Translate these subtitle texts (JSON array): ${JSON.stringify(texts)}`
      }
    ],
    temperature: temperature
  };

  // Only enforce json_object on official OpenAI API. Local models (LM Studio/Gemma) might not support it perfectly.
  if (!isCustomEndpoint) {
    requestBody.response_format = { type: 'json_object' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  try {
    const textResponse = data.choices?.[0]?.message?.content;
    if (!textResponse) {
      throw new Error('Empty response from OpenAI.');
    }
    
    // Clean up markdown wrapping if present (often happens with local models like Gemma)
    let jsonStr = textResponse.trim();
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    
    const parsed = JSON.parse(jsonStr);
    if (!parsed.translations || !Array.isArray(parsed.translations)) {
      throw new Error('Invalid translation format received from OpenAI.');
    }

    let results = parsed.translations;
    if (results.length !== texts.length) {
      console.warn(`OpenAI batch length mismatch. Expected ${texts.length}, got ${results.length}. Adjusting...`);
      if (results.length < texts.length) {
        while (results.length < texts.length) {
          results.push(texts[results.length]);
        }
      } else {
        results = results.slice(0, texts.length);
      }
    }
    return results;
  } catch (e) {
    console.error('Failed to parse OpenAI response:', e, data);
    throw new Error(`Failed to parse OpenAI response: ${(e as Error).message}`);
  }
}
