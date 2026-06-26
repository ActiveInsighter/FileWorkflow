export interface TaskSnapshot {
  taskId: string;
  name: string;
  status: string;
  promptText: string;
  totalCount: number;
  completedCount: number;
  updatedAtMs: number;
}

export interface TaskRepository {
  saveTask(snapshot: TaskSnapshot): Promise<void>;
}

class LocalTaskRepository implements TaskRepository {
  async saveTask(snapshot: TaskSnapshot): Promise<void> {
    localStorage.setItem(`fileworkflow.task.${snapshot.taskId}`, JSON.stringify(snapshot));
  }
}

export function createTaskRepository(): TaskRepository {
  return new LocalTaskRepository();
}
