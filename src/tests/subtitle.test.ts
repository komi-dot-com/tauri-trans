import { describe, it, expect } from 'vitest';
import { parseSubtitle, detectFormat } from '../services/subtitle/parser';
import { validateSubtitles, checkBalancedTags, timeToMillis } from '../services/subtitle/validator';
import { serializeSubtitle } from '../services/subtitle/writer';
import { SubtitleEntry } from '../types';

describe('Subtitle Parser', () => {
  it('should detect file formats correctly', () => {
    const srtContent = `1\n00:00:01,000 --> 00:00:04,000\nHello World\n`;
    const vttContent = `WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nHello World\n`;
    const assContent = `[Script Info]\nTitle: Test\n\n[Events]\nFormat: Start, End, Text\nDialogue: 0:00:01.00,0:00:04.00,Hello World`;
    
    expect(detectFormat(srtContent)).toBe('srt');
    expect(detectFormat(vttContent)).toBe('vtt');
    expect(detectFormat(assContent)).toBe('ass');
  });

  it('should parse SRT file content successfully', () => {
    const srt = `1
00:00:01,200 --> 00:00:04,500
Hello, world!
This is a test line.

2
00:00:05,000 --> 00:00:08,000
Second block.`;

    const { entries, errors, format } = parseSubtitle(srt);
    expect(format).toBe('srt');
    expect(errors.length).toBe(0);
    expect(entries.length).toBe(2);
    expect(entries[0].id).toBe(1);
    expect(entries[0].startTime).toBe('00:00:01,200');
    expect(entries[0].endTime).toBe('00:00:04,500');
    expect(entries[0].text).toBe('Hello, world!\nThis is a test line.');
    expect(entries[1].text).toBe('Second block.');
  });

  it('should parse VTT files successfully', () => {
    const vtt = `WEBVTT

1
00:00:01.200 --> 00:00:04.500
Hello VTT!

2
00:00:05.100 --> 00:00:07.000
Second VTT line.`;

    const { entries, errors, format } = parseSubtitle(vtt);
    expect(format).toBe('vtt');
    expect(errors.length).toBe(0);
    expect(entries.length).toBe(2);
    expect(entries[0].startTime).toBe('00:00:01,200');
    expect(entries[0].endTime).toBe('00:00:04,500');
    expect(entries[1].text).toBe('Second VTT line.');
  });
});

describe('Subtitle QA Validator', () => {
  it('should convert timestamp to milliseconds correctly', () => {
    expect(timeToMillis('00:00:01,000')).toBe(1000);
    expect(timeToMillis('01:30:15,500')).toBe(5415500); // 1.5h + 30m + 15s + 500ms
  });

  it('should check balanced HTML tags', () => {
    expect(checkBalancedTags('<i>Hello</i>')).toBe(true);
    expect(checkBalancedTags('<i>Hello')).toBe(false);
    expect(checkBalancedTags('<b><i>Hello</i></b>')).toBe(true);
    expect(checkBalancedTags('<b>Hello</i>')).toBe(false);
  });

  it('should validate timestamps, overlaps and empty texts', () => {
    const entries: SubtitleEntry[] = [
      {
        id: 1,
        startTime: '00:00:05,000',
        endTime: '00:00:02,000', // Chronology error (End is before Start)
        text: 'Hello',
      },
      {
        id: 2,
        startTime: '00:00:01,000', // Overlap error (Starts before entry 1 ends)
        endTime: '00:00:08,000',
        text: '<i>Unbalanced Tag', // Tag error
      },
      {
        id: 3,
        startTime: '00:00:10,000',
        endTime: '00:00:12,000',
        text: '', // Empty warning
      }
    ];

    const errors = validateSubtitles(entries);
    
    const chronologyErr = errors.find(e => e.type === 'chronology');
    const overlapErr = errors.find(e => e.type === 'overlap');
    const emptyErr = errors.find(e => e.type === 'empty_text');
    const tagErr = errors.find(e => e.type === 'unbalanced_tags');

    expect(chronologyErr).toBeDefined();
    expect(overlapErr).toBeDefined();
    expect(emptyErr).toBeDefined();
    expect(tagErr).toBeDefined();
  });
});

describe('Subtitle Writer / Serializer', () => {
  const entries: SubtitleEntry[] = [
    {
      id: 1,
      startTime: '00:00:01,000',
      endTime: '00:00:04,000',
      text: 'Original Text',
      translatedText: 'Translated Text',
    }
  ];

  it('should serialize to translated-only SRT', () => {
    const result = serializeSubtitle(entries, { format: 'srt', mode: 'translated' });
    expect(result).toContain('1\n');
    expect(result).toContain('00:00:01,000 --> 00:00:04,000\n');
    expect(result).toContain('Translated Text\n');
    expect(result).not.toContain('Original Text');
  });

  it('should serialize to bilingual SRT', () => {
    const result = serializeSubtitle(entries, { format: 'srt', mode: 'bilingual' });
    expect(result).toContain('Original Text\nTranslated Text');
  });

  it('should serialize to VTT with correct timestamp format', () => {
    const result = serializeSubtitle(entries, { format: 'vtt', mode: 'translated' });
    expect(result).toContain('WEBVTT\n');
    expect(result).toContain('00:00:01.000 --> 00:00:04.000\n');
  });
});
