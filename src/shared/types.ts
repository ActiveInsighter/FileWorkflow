export type QueueMode = 'idle' | 'running' | 'waiting' | 'pausing' | 'paused' | 'ending' | 'done' | 'error';

export type WorkflowStatus = 'pending' | 'running' | 'waiting' | 'paused' | 'active' | 'closed' | 'succeeded' | 'failed' | 'cancelled' | 'ended';

export interface QueueBaseItem {
  id: string;
  index: number;
  source: string;
  activityIndex: number;
  depth: number;
  repeatIndex: number;
  repeatTotal: number;
  loopPath: number[];
}

export interface QueueMessageItem extends QueueBaseItem {
  type: 'message';
  content: string;
}

export interface QueueUrlItem extends QueueBaseItem {
  type: 'url';
  content: string;
  url: string;
}

export type QueueItem = QueueMessageItem | QueueUrlItem;

export interface ActivityPlan {
  activityIndex: number;
  url: string;
  messageItems: QueueMessageItem[];
}

export interface ParsedWorkflow {
  taskTitle: string;
  eventTitle: string;
  items: QueueItem[];
  activities: ActivityPlan[];
  errors: string[];
  highlightedHtml: string;
}

export interface RunnerState {
  running: boolean;
  paused: boolean;
  pauseRequested: boolean;
  endRequested: boolean;
  items: QueueItem[];
  index: number;
  startedAt: number;
  finishedAt: number;
  status: string;
  inputDirty: boolean;
  waitingUntil: number;
  currentWaitMinutes: number;
  taskId: string;
  eventId: string;
  activityIdsByIndex: Record<number, string>;
  currentActivityIndex: number;
  currentActivityId: string;
}

export interface QueueSettings {
  autoScroll: boolean;
  randomWait: boolean;
  randomWaitMinMinutes: number;
  randomWaitMaxMinutes: number;
  supabaseEnabled: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface QueueViewModel {
  mode: QueueMode;
  total: number;
  current: number;
  lineCount: number;
  taskTitle: string;
  eventTitle: string;
  messageCount: number;
  activityCount: number;
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
  taskId: string;
  eventId: string;
  activityIdsByIndex: Record<number, string>;
  currentActivityIndex: number;
  currentActivityId: string;
}
