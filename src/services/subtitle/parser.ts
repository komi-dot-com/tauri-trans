import { SubtitleEntry, SubtitleFormat } from '../../types';

export interface ParseResult {
  entries: SubtitleEntry[];
  errors: { line: number; message: string; severity: 'warning' | 'error' }[];
  format: SubtitleFormat;
}

/**
 * Normalizes newlines to \n
 */
export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Detects if a subtitle file is WebVTT, SRT, or ASS
 */
export function detectFormat(content: string): SubtitleFormat {
  const normalized = normalizeNewlines(content).trim();
  if (normalized.startsWith('WEBVTT')) {
    return 'vtt';
  }
  if (normalized.includes('[Script Info]') || normalized.includes('Dialogue:')) {
    return 'ass';
  }
  return 'srt'; // Default to srt
}

/**
 * Parses SRT content
 */
export function parseSRT(content: string): ParseResult {
  const normalized = normalizeNewlines(content);
  const blocks = normalized.split(/\n\n+/);
  const entries: SubtitleEntry[] = [];
  const errors: ParseResult['errors'] = [];
  let blockIndex = 0;

  for (const block of blocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;
    blockIndex++;

    const lines = trimmedBlock.split('\n');
    if (lines.length < 2) {
      errors.push({
        line: blockIndex * 3, // rough estimate
        message: `Block ${blockIndex} is corrupted: has fewer than 2 lines. Content: "${trimmedBlock}"`,
        severity: 'error',
      });
      continue;
    }

    // Line 1: ID (should be integer, but let's be lenient)
    const idStr = lines[0].trim();
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      errors.push({
        line: blockIndex * 3,
        message: `Block ${blockIndex} has an invalid or missing Subtitle ID: "${idStr}"`,
        severity: 'warning',
      });
    }

    // Line 2: Timestamps (00:00:01,000 --> 00:00:04,000)
    const timestampLine = lines[1].trim();
    const timeMatch = timestampLine.match(/(\d{2}:\d{2}:\d{2}[,. ]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,. ]\d{3})/);
    
    if (!timeMatch) {
      errors.push({
        line: blockIndex * 3 + 1,
        message: `Block ${blockIndex} (ID: ${idStr}) has invalid timestamps format: "${timestampLine}"`,
        severity: 'error',
      });
      continue;
    }

    const startTime = timeMatch[1].replace('.', ',');
    const endTime = timeMatch[2].replace('.', ',');
    
    // Subtitle Text (lines 3+)
    const text = lines.slice(2).join('\n').trim();
    if (!text) {
      errors.push({
        line: blockIndex * 3 + 2,
        message: `Block ${blockIndex} (ID: ${idStr}) contains empty subtitle text.`,
        severity: 'warning',
      });
    }

    entries.push({
      id: isNaN(id) ? blockIndex : id,
      startTime,
      endTime,
      text,
    });
  }

  return {
    entries,
    errors,
    format: 'srt',
  };
}

/**
 * Parses WebVTT content
 */
export function parseVTT(content: string): ParseResult {
  const normalized = normalizeNewlines(content);
  const lines = normalized.split('\n');
  const entries: SubtitleEntry[] = [];
  const errors: ParseResult['errors'] = [];
  
  let entryId = 1;
  let i = 0;

  // Skip WEBVTT header and metadata
  if (lines.length > 0 && lines[0].trim().startsWith('WEBVTT')) {
    i++;
  }

  while (i < lines.length) {
    // Skip empty lines
    if (!lines[i].trim()) {
      i++;
      continue;
    }

    let id = entryId;
    let line = lines[i].trim();

    // If this line does not contain '-->', it might be an ID
    if (!line.includes('-->')) {
      const parsedId = parseInt(line, 10);
      if (!isNaN(parsedId)) {
        id = parsedId;
      }
      i++;
      if (i >= lines.length) break;
      line = lines[i].trim();
    }

    // Now we expect a timestamp line
    if (!line.includes('-->')) {
      errors.push({
        line: i + 1,
        message: `Expected timestamp line but got: "${line}"`,
        severity: 'error',
      });
      i++;
      continue;
    }

    const timeMatch = line.match(/(\d{2}:)?(\d{2}:\d{2}[. ,]\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}[. ,]\d{3})/);
    if (!timeMatch) {
      errors.push({
        line: i + 1,
        message: `Invalid VTT timestamp format: "${line}"`,
        severity: 'error',
      });
      i++;
      continue;
    }

    // Format timestamps to HH:MM:SS,mmm
    const formatTime = (full: string, h: string, ms: string) => {
      let time = ms.replace('.', ',');
      if (!h) {
        time = '00:' + time;
      }
      return time;
    };

    // Extract start and end
    const parts = line.split('-->');
    const startTime = parts[0].trim().replace('.', ',');
    const endTime = parts[1].trim().split(/\s+/)[0].replace('.', ',');


    i++;
    // Gather text lines until empty line
    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i].trim());
      i++;
    }

    const text = textLines.join('\n');
    if (!text) {
      errors.push({
        line: i,
        message: `Empty text for subtitle entry (ID: ${id})`,
        severity: 'warning',
      });
    }

    entries.push({
      id,
      startTime: startTime.includes(':') && startTime.split(':').length === 2 ? `00:${startTime}` : startTime,
      endTime: endTime.includes(':') && endTime.split(':').length === 2 ? `00:${endTime}` : endTime,
      text,
    });
    
    entryId++;
  }

  return {
    entries,
    errors,
    format: 'vtt',
  };
}

/**
 * Parses ASS (Advanced SubStation Alpha) - basic implementation for text extraction
 */
export function parseASS(content: string): ParseResult {
  const normalized = normalizeNewlines(content);
  const lines = normalized.split('\n');
  const entries: SubtitleEntry[] = [];
  const errors: ParseResult['errors'] = [];
  let entryId = 1;

  let formatFields: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(';')) continue;

    if (line.startsWith('Format:')) {
      formatFields = line.substring(7).split(',').map(f => f.trim());
      continue;
    }

    if (line.startsWith('Dialogue:')) {
      const dialogueData = line.substring(9).trim();
      // Dialogue fields are comma-separated, but the last field (Text) can contain commas.
      // So we split up to formatFields.length - 1 times.
      const limit = formatFields.length > 0 ? formatFields.length - 1 : 9;
      const parts: string[] = [];
      let currentIdx = 0;
      
      for (let j = 0; j < limit; j++) {
        const nextComma = dialogueData.indexOf(',', currentIdx);
        if (nextComma === -1) break;
        parts.push(dialogueData.substring(currentIdx, nextComma).trim());
        currentIdx = nextComma + 1;
      }
      parts.push(dialogueData.substring(currentIdx)); // Rest is text

      // Map to standard fields
      // Default ASS format order: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
      // Let's find Start, End, and Text indexes from formatFields
      let startIdx = 1;
      let endIdx = 2;
      let textIdx = parts.length - 1;
      let styleIdx = 3;

      if (formatFields.length > 0) {
        startIdx = formatFields.indexOf('Start');
        endIdx = formatFields.indexOf('End');
        textIdx = formatFields.indexOf('Text');
        styleIdx = formatFields.indexOf('Style');
      }

      const rawStart = parts[startIdx] || '0:00:00.00';
      const rawEnd = parts[endIdx] || '0:00:00.00';
      let rawText = parts[parts.length - 1] || ''; // fallback to last part if textIdx is out of bounds

      // Convert ASS timestamp (H:MM:SS.cs) to HH:MM:SS,mmm
      const convertASSTime = (timeStr: string) => {
        const p = timeStr.split(':');
        if (p.length < 3) return '00:00:00,000';
        let h = p[0].padStart(2, '0');
        let m = p[1].padStart(2, '0');
        let sParts = p[2].split('.');
        let s = sParts[0].padStart(2, '0');
        let cs = sParts[1] || '00';
        let ms = cs.padEnd(3, '0').substring(0, 3);
        return `${h}:${m}:${s},${ms}`;
      };

      const startTime = convertASSTime(rawStart);
      const endTime = convertASSTime(rawEnd);

      // Save dialogue styles (e.g. Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,Text)
      // We keep the prefix structure so we can rewrite it during export
      const styles = parts.slice(0, parts.length - 1).join(',');

      // Remove ASS overrides like {\pos(400, 570)} or {\i1} for raw translation text,
      // but we should store the tags if we want to restore them.
      // Requirement: "preserve formatting tags, HTML subtitle tags"
      // We will parse out text, keep the formatting, translate, and re-insert or translate around formatting.
      entries.push({
        id: entryId++,
        startTime,
        endTime,
        text: rawText,
        styles,
      });
    }
  }

  return {
    entries,
    errors,
    format: 'ass',
  };
}

/**
 * Main parser entry point
 */
export function parseSubtitle(content: string): ParseResult {
  const format = detectFormat(content);
  if (format === 'vtt') {
    return parseVTT(content);
  }
  if (format === 'ass') {
    return parseASS(content);
  }
  return parseSRT(content);
}
