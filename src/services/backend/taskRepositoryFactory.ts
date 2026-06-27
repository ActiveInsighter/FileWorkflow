import type { ExtensionSettings } from '../../types/settings';
import type { ActivityPlan, ParsedWorkflow, QueueItem, QueueMessageItem, WorkflowStatus } from '../../shared/types';
import { safeJsonGet, safeJsonSet } from '../../shared/storage';
import { SupabaseRestClient } from '../supabase/supabaseRestClient';

export interface WorkflowRunSnapshot {
  taskId: string;
  eventId: string;
  rawInputText: string;
  parsed: ParsedWorkflow;
}

export interface ActivitySnapshot {
  activityId: string;
  taskId: string;
  eventId: string;
  activity: ActivityPlan;
  url: string;
  title: string;
  site: string;
}

export interface MessageProgressSnapshot {
  taskId: string;
  eventId: string;
  activityId: string;
  item: QueueMessageItem;
  items: QueueItem[];
}

export interface WorkflowRepository {
  initializeRun(snapshot: WorkflowRunSnapshot): Promise<void>;
  startActivity(snapshot: ActivitySnapshot): Promise<void>;
  updateMessageDone(snapshot: MessageProgressSnapshot): Promise<void>;
  updateEventStatus(eventId: string, status: WorkflowStatus, reason?: string): Promise<void>;
  updateActivityStatus(activityId: string, status: WorkflowStatus, reason?: string): Promise<void>;
  getEventStatus(eventId: string): Promise<string | null>;
  getActivityStatus(activityId: string): Promise<string | null>;
  finishTask(taskId: string, eventId: string, status: WorkflowStatus): Promise<void>;
}

const LOCAL_STATE_KEY = 'fw.workflow.localState';

interface LocalState {
  events: Record<string, string>;
  activities: Record<string, string>;
}

class LocalWorkflowRepository implements WorkflowRepository {
  async initializeRun(snapshot: WorkflowRunSnapshot): Promise<void> {
    const state = readLocalState();
    state.events[snapshot.eventId] = 'running';
    writeLocalState(state);
  }

  async startActivity(snapshot: ActivitySnapshot): Promise<void> {
    const state = readLocalState();
    state.activities[snapshot.activityId] = 'active';
    writeLocalState(state);
  }

  async updateMessageDone(_snapshot: MessageProgressSnapshot): Promise<void> {
    // Local mode only keeps control status. Supabase mode stores detailed progress.
  }

  async updateEventStatus(eventId: string, status: WorkflowStatus): Promise<void> {
    const state = readLocalState();
    state.events[eventId] = status;
    writeLocalState(state);
  }

  async updateActivityStatus(activityId: string, status: WorkflowStatus): Promise<void> {
    const state = readLocalState();
    state.activities[activityId] = status;
    writeLocalState(state);
  }

  async getEventStatus(eventId: string): Promise<string | null> {
    return readLocalState().events[eventId] || null;
  }

  async getActivityStatus(activityId: string): Promise<string | null> {
    return readLocalState().activities[activityId] || null;
  }

  async finishTask(taskId: string, eventId: string, status: WorkflowStatus): Promise<void> {
    const state = readLocalState();
    state.events[eventId] = status;
    writeLocalState(state);
    localStorage.setItem(`fw.workflow.task.${taskId}`, JSON.stringify({ taskId, eventId, status, finishedAt: Date.now() }));
  }
}

class SupabaseWorkflowRepository extends LocalWorkflowRepository {
  private readonly client: SupabaseRestClient;

  constructor(private readonly settings: ExtensionSettings) {
    super();
    this.client = new SupabaseRestClient({ url: settings.supabaseUrl, anonKey: settings.supabaseAnonKey });
  }

  override async initializeRun(snapshot: WorkflowRunSnapshot): Promise<void> {
    await super.initializeRun(snapshot);
    const now = new Date().toISOString();
    await safeRemote(async () => {
      await this.client.upsert('workflow_tasks', {
        id: snapshot.taskId,
        title: snapshot.parsed.taskTitle,
        description: snapshot.parsed.eventTitle,
        status: 'running',
        input_source: 'chatgpt-web-extension',
        total_events: 1,
        finished_events: 0,
        failed_events: 0,
        metadata: {
          source: 'FileWorkflow Chrome Extension',
          queue_item_count: snapshot.parsed.items.length,
          activity_count: snapshot.parsed.activities.length
        },
        started_at: now,
        updated_at: now
      }, 'id');

      await this.client.upsert('workflow_events', {
        id: snapshot.eventId,
        task_id: snapshot.taskId,
        title: snapshot.parsed.eventTitle,
        description: snapshot.parsed.taskTitle,
        status: 'running',
        event_index: 0,
        raw_input_text: snapshot.rawInputText,
        message_queue: snapshot.parsed.items,
        current_message_index: 0,
        allow_parallel: false,
        result: null,
        metadata: {
          task_title: snapshot.parsed.taskTitle,
          activity_count: snapshot.parsed.activities.length,
          parser: 'nested-polling-v1'
        },
        started_at: now,
        updated_at: now
      }, 'id');
    });
  }

  override async startActivity(snapshot: ActivitySnapshot): Promise<void> {
    await super.startActivity(snapshot);
    const now = new Date().toISOString();
    await safeRemote(async () => {
      await this.client.upsert('workflow_activities', {
        id: snapshot.activityId,
        task_id: snapshot.taskId,
        event_id: snapshot.eventId,
        url: snapshot.url,
        url_hash: hashText(snapshot.url),
        title: snapshot.title,
        site: snapshot.site,
        status: 'active',
        polling_queue: snapshot.activity.messageItems,
        current_polling_index: 0,
        polling_repeat_total: snapshot.activity.messageItems.length,
        polling_repeat_done: 0,
        last_seen_at: now,
        metadata: {
          activity_index: snapshot.activity.activityIndex,
          planned_url: snapshot.activity.url || null
        },
        updated_at: now
      }, 'id');
    });
  }

  override async updateMessageDone(snapshot: MessageProgressSnapshot): Promise<void> {
    const now = new Date().toISOString();
    await safeRemote(async () => {
      await this.client.update('workflow_events', {
        current_message_index: snapshot.item.index + 1,
        message_queue: snapshot.items.map(item => item.index === snapshot.item.index ? { ...item, completed: true } : item),
        heartbeat_at: now,
        updated_at: now
      }, { id: snapshot.eventId });

      await this.client.update('workflow_activities', {
        current_polling_index: snapshot.item.index + 1,
        polling_repeat_done: snapshot.item.index + 1,
        last_message_at: now,
        last_seen_at: now,
        updated_at: now
      }, { id: snapshot.activityId });
    });
  }

  override async updateEventStatus(eventId: string, status: WorkflowStatus, reason?: string): Promise<void> {
    await super.updateEventStatus(eventId, status);
    const now = new Date().toISOString();
    await safeRemote(async () => {
      await this.client.update('workflow_events', {
        status,
        last_error: reason || null,
        heartbeat_at: now,
        updated_at: now,
        ...(isFinishedStatus(status) ? { finished_at: now } : {})
      }, { id: eventId });
    });
  }

  override async updateActivityStatus(activityId: string, status: WorkflowStatus, reason?: string): Promise<void> {
    await super.updateActivityStatus(activityId, status);
    const now = new Date().toISOString();
    await safeRemote(async () => {
      await this.client.update('workflow_activities', {
        status,
        last_seen_at: now,
        metadata: { reason: reason || null },
        updated_at: now
      }, { id: activityId });
    });
  }

  override async getEventStatus(eventId: string): Promise<string | null> {
    const local = await super.getEventStatus(eventId);
    const remote = await safeRemote(async () => {
      const row = await this.client.selectOne<{ status?: string }>('workflow_events', 'status', { id: eventId });
      return row?.status || null;
    });
    return remote || local;
  }

  override async getActivityStatus(activityId: string): Promise<string | null> {
    const local = await super.getActivityStatus(activityId);
    const remote = await safeRemote(async () => {
      const row = await this.client.selectOne<{ status?: string }>('workflow_activities', 'status', { id: activityId });
      return row?.status || null;
    });
    return remote || local;
  }

  override async finishTask(taskId: string, eventId: string, status: WorkflowStatus): Promise<void> {
    await super.finishTask(taskId, eventId, status);
    const now = new Date().toISOString();
    await safeRemote(async () => {
      await this.client.update('workflow_events', {
        status,
        finished_at: now,
        updated_at: now
      }, { id: eventId });

      await this.client.update('workflow_tasks', {
        status,
        finished_events: status === 'succeeded' ? 1 : 0,
        failed_events: status === 'failed' ? 1 : 0,
        finished_at: now,
        updated_at: now
      }, { id: taskId });
    });
  }
}

export function createWorkflowRepository(settings: ExtensionSettings): WorkflowRepository {
  if (settings.supabaseEnabled && settings.supabaseUrl && settings.supabaseAnonKey) {
    return new SupabaseWorkflowRepository(settings);
  }
  return new LocalWorkflowRepository();
}

export function createTaskRepository(): WorkflowRepository {
  return new LocalWorkflowRepository();
}

function readLocalState(): LocalState {
  return safeJsonGet<LocalState>(LOCAL_STATE_KEY, { events: {}, activities: {} });
}

function writeLocalState(state: LocalState): void {
  safeJsonSet(LOCAL_STATE_KEY, state);
}

async function safeRemote<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.warn('[FileWorkflow] Supabase sync skipped:', error);
    return null;
  }
}

function isFinishedStatus(status: WorkflowStatus): boolean {
  return ['succeeded', 'failed', 'cancelled', 'ended', 'closed'].includes(status);
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
