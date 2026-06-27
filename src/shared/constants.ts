import type { ExtensionSettings } from '../types/settings';

export const CHATGPT_HOME_URL = 'https://chatgpt.com/';
export const ROOT_HOST_ID = 'fileworkflow-shadow-host';
export const END_SIGNAL_MAX_CHARS = 18;

export const STORAGE_KEYS = {
  queueText: 'fw.queue.text',
  runState: 'fw.queue.runState',
  settings: 'fw.settings'
} as const;

export const MESSAGE_TYPES = {
  OPEN_CHATGPT: 'FW_OPEN_CHATGPT',
  TOGGLE_PANEL: 'FW_TOGGLE_PANEL'
} as const;

export const RANDOM_WAIT = {
  minMinutes: 2,
  maxMinutes: 6
} as const;

export const DEFAULT_QUEUE_TEXT = `[task: 408 逐节整理]
[event: 数据结构第 1 章]
<https://chatgpt.com/>
{现在总结数据结构第 1 章}*1
{继续总结}*2
{
  {按原 PDF 内容继续整理下一小节}*2
  {如果本活动内容已经整理完，请把当前 activity 状态改为 succeeded}*1
}*1`;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoScroll: true,
  randomWait: false,
  randomWaitMinMinutes: RANDOM_WAIT.minMinutes,
  randomWaitMaxMinutes: RANDOM_WAIT.maxMinutes,
  supabaseEnabled: false,
  supabaseUrl: 'https://atgvnspqsynwsdnmtpkq.supabase.co',
  supabaseAnonKey: ''
};

export const EVENT_PAUSE_STATUSES = ['paused', 'pause', 'waiting', 'hold'] as const;
export const EVENT_TERMINAL_STATUSES = ['succeeded', 'success', 'completed', 'complete', 'done', 'ended', 'finished', 'cancelled', 'canceled', 'failed'] as const;
export const ACTIVITY_TERMINAL_STATUSES = ['succeeded', 'success', 'completed', 'complete', 'done', 'ended', 'finished', 'closed', 'cancelled', 'canceled', 'failed'] as const;
