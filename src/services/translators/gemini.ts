import { ProviderConfig, TranslationMode } from '../../types';

export function buildGeminiPrompt(sourceLang: string, targetLang: string, mode: TranslationMode): string {
  const basePrompt = `You are a professional subtitle translator.
Translate the following subtitle texts from ${sourceLang === 'auto' ? 'automatically detected language' : sourceLang} to ${targetLang}.

Rules:
- Preserve meaning, emotional intent, jokes, and idioms.
- Keep all subtitle formatting tags (like <i>, <b>, <u>, or ASS tags like {\\an8}, {\\i1}) exactly in their correct positions.
- Do not translate timestamps.
- Do not add explanations.
- Return ONLY a JSON array of strings in the format: {"translations": ["translated_text_1", "translated_text_2", ...]}
- Ensure the output array contains exactly the same number of elements as the input array, in the exact same order.`;

  let modeRules = '';
  switch (mode) {
    case 'context':
      modeRules = `\n- Context-Aware Mode: The lines are sequential. Maintain consistent conversational flow, subject references, and pronouns across lines.`;
      break;
    case 'movie':
      modeRules = `\n- Movie Mode: Optimize for dialogue flow, emotional tone, character dynamics, and natural spoken speed. Avoid literal machine translation.`;
      break;
    case 'anime':
      modeRules = `\n- Anime Mode: Preserve honorifics (like -san, -kun, -chan, senpai) and Japanese cultural terms. Maintain distinct character speaking styles.`;
      break;
    default:
      modeRules = `\n- Standard Mode: Translate quickly and accurately while keeping subtitle reading speed constraints.`;
  }

  return basePrompt + modeRules;
}

export async function translateGemini(
  texts: string[],
  sourceLang: string,
  targetLang: string,
  config: ProviderConfig,
  mode: TranslationMode
): Promise<string[]> {
  const { apiKey, model, temperature } = config;
  if (!apiKey) {
    throw new Error('Gemini API key is missing.');
  }

  const prompt = buildGeminiPrompt(sourceLang, targetLang, mode);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          { text: `Input subtitle texts (JSON array): ${JSON.stringify(texts)}` }
        ]
      }
    ],
    generationConfig: {
      temperature: temperature,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          translations: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'List of translated subtitle texts matching the input index and length exactly.'
          }
        },
        required: ['translations']
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  try {
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error('Empty response from Gemini.');
    }
    
    // Clean up markdown wrapping if present
    let jsonStr = textResponse.trim();
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    
    const parsed = JSON.parse(jsonStr);
    if (!parsed.translations || !Array.isArray(parsed.translations)) {
      throw new Error('Invalid translation format received from Gemini.');
    }
    
    // Validate length match, if it mismatch, pad or truncate
    let results = parsed.translations;
    if (results.length !== texts.length) {
      console.warn(`Gemini batch length mismatch. Expected ${texts.length}, got ${results.length}. Adjusting...`);
      if (results.length < texts.length) {
        while (results.length < texts.length) {
          results.push(texts[results.length]); // fallback to original
        }
      } else {
        results = results.slice(0, texts.length);
      }
    }
    return results;
  } catch (e) {
    console.error('Failed to parse Gemini response:', e, data);
    throw new Error(`Failed to parse Gemini response: ${(e as Error).message}`);
  }
}
