export interface ParsedPrompt {
  id: string;
  text: string;
  urlCommand?: string;
}

const separatorPattern = /^\s*(?:---+|===+)\s*$/;
const urlCommandPattern = /^\s*<\s*(https?:\/\/[^>\s]+)\s*>\s*$/i;

export function parseQueueText(text: string): ParsedPrompt[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const hasSeparator = lines.some((line) => separatorPattern.test(line));
  const rawPrompts = hasSeparator ? parseBySeparator(lines) : lines.map((line) => line.trim()).filter(Boolean);

  return rawPrompts.map((prompt, index) => {
    const url = prompt.match(urlCommandPattern)?.[1];
    return { id: `prompt-${index + 1}`, text: prompt, urlCommand: url || undefined };
  });
}

function parseBySeparator(lines: string[]): string[] {
  const blocks: string[] = [];
  const buffer: string[] = [];
  const flush = () => {
    const value = buffer.join('\n').trim();
    if (value) blocks.push(value);
    buffer.length = 0;
  };

  for (const line of lines) {
    if (separatorPattern.test(line)) flush();
    else buffer.push(line);
  }
  flush();
  return blocks;
}
