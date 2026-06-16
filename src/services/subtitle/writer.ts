import { SubtitleEntry, SubtitleFormat } from '../../types';

export interface ExportOptions {
  format: SubtitleFormat;
  mode: 'translated' | 'bilingual' | 'original';
  keepFormatting?: boolean;
}

/**
 * Formats a timestamp from HH:MM:SS,mmm back to the target format
 */
export function formatTimestamp(timeStr: string, format: SubtitleFormat): string {
  if (format === 'srt') {
    return timeStr.replace('.', ',');
  }
  if (format === 'vtt') {
    return timeStr.replace(',', '.');
  }
  if (format === 'ass') {
    // Convert HH:MM:SS,mmm to H:MM:SS.cs
    const parts = timeStr.split(':');
    if (parts.length < 3) return '0:00:00.00';
    const h = parseInt(parts[0], 10).toString(); // remove leading zero if single digit, but standard is 1 digit H
    const m = parts[1];
    const sParts = parts[2].split(',');
    const s = sParts[0];
    const ms = sParts[1] || '000';
    const cs = ms.substring(0, 2); // centiseconds
    return `${h}:${m}:${s}.${cs}`;
  }
  return timeStr;
}

/**
 * Gets the text content based on the export mode (original, translated, or bilingual)
 */
function getEntryText(entry: SubtitleEntry, mode: ExportOptions['mode']): string {
  const original = entry.text.trim();
  const translated = (entry.translatedText || entry.text).trim();

  if (mode === 'original') {
    return original;
  }
  if (mode === 'bilingual') {
    if (original === translated) return original;
    return `${original}\n${translated}`;
  }
  return translated;
}

/**
 * Serializes entries to SRT format
 */
export function serializeSRT(entries: SubtitleEntry[], mode: ExportOptions['mode']): string {
  let result = '';
  entries.forEach((entry, index) => {
    const text = getEntryText(entry, mode);
    result += `${entry.id}\n`;
    result += `${formatTimestamp(entry.startTime, 'srt')} --> ${formatTimestamp(entry.endTime, 'srt')}\n`;
    result += `${text}\n\n`;
  });
  return result.trim() + '\n';
}

/**
 * Serializes entries to VTT format
 */
export function serializeVTT(entries: SubtitleEntry[], mode: ExportOptions['mode']): string {
  let result = 'WEBVTT\n\n';
  entries.forEach((entry) => {
    const text = getEntryText(entry, mode);
    result += `${entry.id}\n`;
    result += `${formatTimestamp(entry.startTime, 'vtt')} --> ${formatTimestamp(entry.endTime, 'vtt')}\n`;
    result += `${text}\n\n`;
  });
  return result.trim() + '\n';
}

/**
 * Serializes entries to ASS format
 */
export function serializeASS(
  entries: SubtitleEntry[],
  mode: ExportOptions['mode'],
  originalContent?: string
): string {
  // If we have the original ASS file content, we can preserve styles perfectly.
  // Otherwise, we create a basic ASS skeleton.
  let header = `[Script Info]
Title: Translated Subtitle
ScriptType: v4.00+
Collisions: Normal
PlayResX: 640
PlayResY: 360
Timer: 100.0000

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let events = '';
  entries.forEach((entry) => {
    const text = getEntryText(entry, mode).replace(/\n/g, '\\N'); // ASS line break is \N
    const start = formatTimestamp(entry.startTime, 'ass');
    const end = formatTimestamp(entry.endTime, 'ass');
    
    // Use saved styles (which contains formatting prefix like "Marked, Style, Name, MarginL, MarginR, MarginV, Effect")
    // or fallback to default
    let linePrefix = entry.styles || '0,Default,,0,0,0,,';
    
    events += `Dialogue: ${linePrefix}${text}\n`;
  });

  if (originalContent) {
    // If originalContent is provided, we can extract its header up to "[Events]" and swap the Dialogue lines
    const normalized = originalContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const eventsIndex = normalized.indexOf('[Events]');
    if (eventsIndex !== -1) {
      const headerPart = normalized.substring(0, eventsIndex);
      const eventsSection = normalized.substring(eventsIndex);
      const lines = eventsSection.split('\n');
      
      let formatLine = 'Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text';
      for (const l of lines) {
        if (l.trim().startsWith('Format:')) {
          formatLine = l.trim();
          break;
        }
      }
      
      header = `${headerPart}[Events]\n${formatLine}\n`;
    }
  }

  return header + events;
}

/**
 * Main writer entry point
 */
export function serializeSubtitle(
  entries: SubtitleEntry[],
  options: ExportOptions,
  originalContent?: string
): string {
  if (options.format === 'vtt') {
    return serializeVTT(entries, options.mode);
  }
  if (options.format === 'ass') {
    return serializeASS(entries, options.mode, originalContent);
  }
  return serializeSRT(entries, options.mode);
}
