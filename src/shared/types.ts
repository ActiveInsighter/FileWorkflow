export type QueueMode = 'idle' | 'running' | 'waiting' | 'pausing' | 'paused' | 'ending' | 'done' | 'error';

export interface RunnerState {
  running: boolean;
  paused: boolean;
  pauseRequested: boolean;
  endRequested: boolean;
  prompts: string[];
  index: number;
  startedAt: number;
  finishedAt: number;
  status: string;
  inputDirty: boolean;
  waitingUntil: number;
  currentWaitMinutes: number;
  completedByEndSignal: boolean;
  skipUntilUrl: boolean;
}

export interface QueueSettings {
  autoScroll: boolean;
  randomWait: boolean;
}

export interface QueueViewModel {
  mode: QueueMode;
  total: number;
  current: number;
  lineCount: number;
  elapsedText: string;
  shortStatus: string;
  detail: string;
  waitRange: string;
  canStart: boolean;
  canPauseOrEnd: boolean;
  canForceFinish: boolean;
  startLabel: string;
  pauseEndLabel: string;
  pauseEndDanger: boolean;
}

export interface NavigationRunState {
  active: boolean;
  promptText: string;
  index: number;
  startedAt: number;
  savedAt: number;
}
