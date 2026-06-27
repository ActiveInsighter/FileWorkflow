import { normalizePromptUnit } from '../../shared/format';
import type { ActivityPlan, ParsedWorkflow, QueueItem, QueueMessageItem } from '../../shared/types';

const MAX_LOOP_DEPTH = 3;

interface DraftItem {
  type: 'message' | 'url';
  source: string;
  content: string;
  url?: string;
  depth: number;
  repeatIndex: number;
  repeatTotal: number;
  loopPath: number[];
}

interface ParseContext {
  errors: string[];
  loopSeq: number;
}

export function getLogicalQueueLines(raw: string): string[] {
  return String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

export function parsePrompts(raw: string): string[] {
  return parseWorkflowText(raw).items.map(item => item.content);
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
  const parsed = parseWorkflowText(raw);
  return [parsed.taskTitle, parsed.eventTitle, ...parsed.items.map(item => `${item.type}:${normalizePromptUnit(item.content)}`)]
    .filter(Boolean)
    .join('\n---\n');
}

export function parseWorkflowText(raw: string): ParsedWorkflow {
  const text = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');
  const errors: string[] = [];
  const taskTitle = parseHeader(lines[0] || '', 'task', errors);
  const eventTitle = parseHeader(lines[1] || '', 'event', errors);
  const body = lines.slice(2).join('\n');
  const context: ParseContext = { errors, loopSeq: 0 };
  const parsed = parseSequence(body, 0, 0, false, context);

  if (parsed.pos < body.length) {
    const rest = body.slice(parsed.pos).trim();
    if (rest) errors.push(`无法解析的剩余内容：${rest.slice(0, 60)}`);
  }

  let activityIndex = 0;
  const items: QueueItem[] = parsed.items.map((draft, index) => {
    if (draft.type === 'url') activityIndex += 1;
    return {
      id: `${draft.type}-${index}`,
      index,
      source: draft.source,
      type: draft.type,
      content: draft.content,
      url: draft.url || '',
      activityIndex,
      depth: draft.depth,
      repeatIndex: draft.repeatIndex,
      repeatTotal: draft.repeatTotal,
      loopPath: draft.loopPath
    } as QueueItem;
  });

  const activities = buildActivities(items);

  return {
    taskTitle,
    eventTitle,
    items,
    activities,
    errors,
    highlightedHtml: highlightWorkflowText(text)
  };
}

function parseHeader(line: string, kind: 'task' | 'event', errors: string[]): string {
  const label = kind === 'task' ? '(?:task|任务)' : '(?:event|事件)';
  const match = line.trim().match(new RegExp(`^\\[\\s*${label}\\s*[:：]\\s*(.+?)\\s*\\]$`, 'i'));
  if (!match?.[1]?.trim()) {
    errors.push(kind === 'task'
      ? '第 1 行必须写成 [task: 任务名称]'
      : '第 2 行必须写成 [event: 事件名称]');
    return '';
  }
  return match[1].trim();
}

function parseSequence(text: string, start: number, depth: number, stopAtBrace: boolean, context: ParseContext): { items: DraftItem[]; pos: number } {
  const items: DraftItem[] = [];
  let pos = start;

  while (pos < text.length) {
    pos = skipWhitespace(text, pos);
    if (pos >= text.length) break;

    const char = text[pos];
    if (char === '}') {
      if (stopAtBrace) return { items, pos };
      context.errors.push(`发现多余的 }，位置 ${pos}`);
      pos += 1;
      continue;
    }

    if (char === '{') {
      const blockDepth = depth + 1;
      if (blockDepth > MAX_LOOP_DEPTH) {
        context.errors.push(`轮询消息最多嵌套 ${MAX_LOOP_DEPTH} 层，位置 ${pos}`);
      }
      const loopId = ++context.loopSeq;
      const inner = parseSequence(text, pos + 1, blockDepth, true, context);
      pos = inner.pos;
      if (text[pos] !== '}') {
        context.errors.push(`缺少 }，位置 ${pos}`);
      } else {
        pos += 1;
      }
      const repeat = parseRepeat(text, pos);
      pos = repeat.pos;
      for (let round = 1; round <= repeat.count; round += 1) {
        for (const item of inner.items) {
          items.push({
            ...item,
            repeatIndex: round,
            repeatTotal: repeat.count,
            loopPath: [...item.loopPath, loopId, round]
          });
        }
      }
      continue;
    }

    if (char === '<') {
      const end = text.indexOf('>', pos + 1);
      if (end < 0) {
        const source = text.slice(pos).trim();
        context.errors.push(`URL 指令缺少 >：${source.slice(0, 60)}`);
        items.push(makeMessage(source, depth));
        break;
      }
      const source = text.slice(pos, end + 1).trim();
      const url = getUrlCommand(source);
      if (!url) {
        context.errors.push(`URL 指令必须写成 <https://...>：${source}`);
        items.push(makeMessage(source, depth));
      } else {
        items.push({
          type: 'url',
          source,
          content: source,
          url,
          depth,
          repeatIndex: 1,
          repeatTotal: 1,
          loopPath: []
        });
      }
      pos = end + 1;
      continue;
    }

    const next = findNextSpecial(text, pos);
    const source = text.slice(pos, next).trim();
    if (source) items.push(makeMessage(source, depth));
    pos = next;
  }

  return { items, pos };
}

function makeMessage(source: string, depth: number): DraftItem {
  return {
    type: 'message',
    source,
    content: source.trim(),
    depth,
    repeatIndex: 1,
    repeatTotal: 1,
    loopPath: []
  };
}

function skipWhitespace(text: string, pos: number): number {
  while (pos < text.length && /\s/.test(text[pos])) pos += 1;
  return pos;
}

function findNextSpecial(text: string, pos: number): number {
  let next = text.length;
  for (const marker of ['{', '}', '<']) {
    const found = text.indexOf(marker, pos);
    if (found >= 0 && found < next) next = found;
  }
  return next;
}

function parseRepeat(text: string, pos: number): { count: number; pos: number } {
  let cursor = skipInlineWhitespace(text, pos);
  if (text[cursor] !== '*') return { count: 1, pos };
  cursor += 1;
  cursor = skipInlineWhitespace(text, cursor);
  const match = text.slice(cursor).match(/^\d+/);
  if (!match) return { count: 1, pos: cursor };
  const count = Math.max(1, Math.min(999, Number(match[0]) || 1));
  return { count, pos: cursor + match[0].length };
}

function skipInlineWhitespace(text: string, pos: number): number {
  while (pos < text.length && /[ \t]/.test(text[pos])) pos += 1;
  return pos;
}

function buildActivities(items: QueueItem[]): ActivityPlan[] {
  const map = new Map<number, ActivityPlan>();
  for (const item of items) {
    if (!map.has(item.activityIndex)) {
      map.set(item.activityIndex, { activityIndex: item.activityIndex, url: '', messageItems: [] });
    }
    const activity = map.get(item.activityIndex)!;
    if (item.type === 'url') activity.url = item.url;
    if (item.type === 'message') activity.messageItems.push(item as QueueMessageItem);
  }
  return Array.from(map.values()).filter(activity => activity.messageItems.length > 0 || activity.url);
}

function highlightWorkflowText(raw: string): string {
  const lines = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines.map((line, index) => {
    const escaped = escapeHtml(line || ' ');
    if (index === 0) return wrapLine(escaped, /^\s*\[\s*(?:task|任务)\s*[:：]\s*.+?\s*\]\s*$/i.test(line), 'task');
    if (index === 1) return wrapLine(escaped, /^\s*\[\s*(?:event|事件)\s*[:：]\s*.+?\s*\]\s*$/i.test(line), 'event');
    return highlightBodyLine(line);
  }).join('\n');
}

function wrapLine(escaped: string, ok: boolean, kind: string): string {
  return `<span class="fw-token ${ok ? `fw-${kind}` : 'fw-invalid'}">${escaped}</span>`;
}

function highlightBodyLine(line: string): string {
  let escaped = escapeHtml(line || ' ');
  escaped = escaped.replace(/&lt;[^\n&]*?&gt;/g, token => {
    const raw = token.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    return `<span class="fw-token ${getUrlCommand(raw) ? 'fw-url' : 'fw-invalid'}">${token}</span>`;
  });
  escaped = escaped.replace(/([{}])/g, '<span class="fw-brace">$1</span>');
  escaped = escaped.replace(/(\*\d+)/g, '<span class="fw-repeat">$1</span>');
  return escaped;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
