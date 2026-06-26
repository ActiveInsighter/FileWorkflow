import { LEGACY_PROMPT_KEYS, STORAGE_KEYS } from '../../shared/constants';
import { safeGet, safeSet } from '../../shared/storage';

export const DEFAULT_PROMPT_TEXT = [
  '第一条消息：请总结 TCP 三次握手。',
  '第二条消息：请总结 TCP 四次挥手。',
  '第三条消息：请对比 TCP 和 UDP。'
].join('\n');

export function getSavedPromptText(): string {
  const current = safeGet(STORAGE_KEYS.promptText, '');
  if (current) return current;

  for (const key of LEGACY_PROMPT_KEYS) {
    const legacy = safeGet(key, '');
    if (legacy) {
      safeSet(STORAGE_KEYS.promptText, legacy);
      return legacy;
    }
  }

  return DEFAULT_PROMPT_TEXT;
}
