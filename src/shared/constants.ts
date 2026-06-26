export const APP_ROOT_ID = 'fileworkflow-chatgpt-queue-root';
export const PANEL_ID = 'fileworkflow-chatgpt-queue-panel';
export const STYLE_ID = 'fileworkflow-chatgpt-queue-style';

export const EDGE_GAP = 8;
export const END_SIGNAL_MAX_CHARS = 64;

export const RANDOM_WAIT = {
  minMinutes: 1,
  maxMinutes: 10
};

export const STORAGE_KEYS = {
  promptText: 'fileworkflow.promptQueue.promptText.v1',
  panelPosition: 'fileworkflow.promptQueue.panelPosition.v1',
  collapsed: 'fileworkflow.promptQueue.collapsed.v1',
  autoScroll: 'fileworkflow.promptQueue.autoScroll.v1',
  randomWait: 'fileworkflow.promptQueue.randomWait.v1',
  runState: 'fileworkflow.promptQueue.runState.v1'
};

export const LEGACY_PROMPT_KEYS = [
  'chatgpt-prompt-queue.promptText.v17',
  'chatgpt-prompt-queue.promptText.v16',
  'chatgpt-prompt-queue.promptText.v13',
  'chatgpt-prompt-queue.promptText.v12',
  'chatgpt-prompt-queue.promptText.v11',
  'chatgpt-prompt-queue.promptText.v10'
];
