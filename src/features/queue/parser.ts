import { normalizePromptUnit } from '../../shared/format';

export function getLogicalQueueLines(raw: string): string[] {
  const lines = String(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const result: string[] = [];
  let buffer = '';
  let collectingUrl = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!collectingUrl) {
      const startsUrlCommand = /^<\s*https:\/\//i.test(trimmed);
      const endsUrlCommand = />\s*$/.test(trimmed);
      if (startsUrlCommand && !endsUrlCommand) {
        buffer = trimmed;
        collectingUrl = true;
        continue;
      }
      result.push(line);
      continue;
    }

    buffer += trimmed;
    if (/>\s*$/.test(trimmed)) {
      result.push(buffer);
      buffer = '';
      collectingUrl = false;
    }
  }

  if (collectingUrl && buffer) result.push(buffer);
  return result;
}

export function parsePrompts(raw: string): string[] {
  const text = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return [];

  if (/^\s*(?:---+|===+)\s*$/m.test(text)) {
    return text
      .split(/^\s*(?:---+|===+)\s*$/m)
      .map(item => item.trim())
      .filter(Boolean);
  }

  return getLogicalQueueLines(text)
    .map(item => item.trim())
    .filter(Boolean);
}

export function getUrlCommand(text: string): string {
  const raw = String(text || '').replace(/\s+/g, '').trim();
  const match = raw.match(/^<((?:https:\/\/)[^<>]+)>$/i);
  if (!match) return '';
  try {
    const url = new URL(match[1]);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export function getQueueFingerprint(raw: string): string {
  return parsePrompts(raw)
    .map(normalizePromptUnit)
    .filter(Boolean)
    .join('\n---\n');
}
