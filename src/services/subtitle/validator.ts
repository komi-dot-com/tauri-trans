import { SubtitleEntry } from '../../types';

export interface ValidationError {
  entryId: number;
  type: 'empty_text' | 'invalid_timestamp' | 'chronology' | 'overlap' | 'unbalanced_tags';
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Converts HH:MM:SS,mmm string to milliseconds
 */
export function timeToMillis(timeStr: string): number {
  const parts = timeStr.replace('.', ',').split(':');
  if (parts.length < 3) return 0;
  
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  
  const sParts = parts[2].split(',');
  const s = parseInt(sParts[0], 10) || 0;
  const ms = parseInt(sParts[1], 10) || 0;
  
  return h * 3600000 + m * 60000 + s * 1000 + ms;
}

/**
 * Validates formatting HTML tags like <i>, <b>, <u>, <font>
 */
export function checkBalancedTags(text: string): boolean {
  const tags = ['i', 'b', 'u', 'font'];
  for (const tag of tags) {
    const openCount = (text.match(new RegExp(`<${tag}[^>]*>`, 'gi')) || []).length;
    const closeCount = (text.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
    if (openCount !== closeCount) {
      return false;
    }
  }
  return true;
}

/**
 * Validates subtitle entries and checks for errors/warnings
 */
export function validateSubtitles(entries: SubtitleEntry[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    // 1. Check empty text
    if (!entry.text || entry.text.trim() === '') {
      errors.push({
        entryId: entry.id,
        type: 'empty_text',
        message: `Subtitle block ${entry.id} is empty.`,
        severity: 'warning',
      });
    }

    // 2. Validate timestamps
    const startMs = timeToMillis(entry.startTime);
    const endMs = timeToMillis(entry.endTime);
    
    if (isNaN(startMs) || isNaN(endMs) || startMs < 0 || endMs < 0) {
      errors.push({
        entryId: entry.id,
        type: 'invalid_timestamp',
        message: `Subtitle block ${entry.id} has invalid timestamp format: "${entry.startTime} --> ${entry.endTime}"`,
        severity: 'error',
      });
      continue;
    }

    // 3. Chronology check: Start time must be before End time
    if (startMs >= endMs) {
      errors.push({
        entryId: entry.id,
        type: 'chronology',
        message: `Subtitle block ${entry.id} has start time (${entry.startTime}) greater than or equal to end time (${entry.endTime}).`,
        severity: 'error',
      });
    }

    // 4. Overlap check with previous entry
    if (i > 0) {
      const prevEntry = entries[i - 1];
      const prevEndMs = timeToMillis(prevEntry.endTime);
      if (startMs < prevEndMs) {
        errors.push({
          entryId: entry.id,
          type: 'overlap',
          message: `Subtitle block ${entry.id} overlaps with block ${prevEntry.id} (Starts at ${entry.startTime} before block ${prevEntry.id} ends at ${prevEntry.endTime}).`,
          severity: 'warning',
        });
      }
    }

    // 5. Check balanced formatting tags
    if (!checkBalancedTags(entry.text)) {
      errors.push({
        entryId: entry.id,
        type: 'unbalanced_tags',
        message: `Subtitle block ${entry.id} has unbalanced formatting tags (e.g. <i> without </i>).`,
        severity: 'warning',
      });
    }
  }

  return errors;
}
