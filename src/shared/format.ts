export function normalizeText(text: string): string {
  return String(text || '')
    .replace(/\u200b/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function normalizePromptUnit(text: string): string {
  return normalizeText(text).replace(/\s+/g, ' ');
}

export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '00:00';
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
