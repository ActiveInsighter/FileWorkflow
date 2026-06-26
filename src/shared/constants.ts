import type { ExtensionSettings } from '../types/settings';

export const CHATGPT_HOME_URL = 'https://chatgpt.com/';
export const ROOT_HOST_ID = 'fileworkflow-shadow-host';

export const STORAGE_KEYS = {
  queueText: 'fw.queue.text',
  runState: 'fw.queue.runState',
  settings: 'fw.settings'
} as const;

export const MESSAGE_TYPES = {
  OPEN_CHATGPT: 'FW_OPEN_CHATGPT',
  TOGGLE_PANEL: 'FW_TOGGLE_PANEL'
} as const;

export const DEFAULT_QUEUE_TEXT = `现在总结数据结构第1章
继续总结
继续总结`;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoScroll: true,
  randomWait: false,
  randomWaitMinMinutes: 2,
  randomWaitMaxMinutes: 6,
  supabaseEnabled: false,
  supabaseUrl: '',
  supabaseAnonKey: ''
};
