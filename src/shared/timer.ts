export function createTimer(): (ms: number) => Promise<void> {
  const code = `
    self.onmessage = e => {
      const { id, delay } = e.data || {};
      setTimeout(() => self.postMessage({ id }), Math.max(0, delay || 0));
    };
  `;

  try {
    const url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);

    let seq = 0;
    const waiting = new Map<number, () => void>();

    worker.onmessage = event => {
      const resolve = waiting.get(event.data?.id);
      if (!resolve) return;
      waiting.delete(event.data.id);
      resolve();
    };

    return ms => new Promise(resolve => {
      const id = ++seq;
      waiting.set(id, resolve);
      worker.postMessage({ id, delay: ms });
    });
  } catch {
    return ms => new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const sleep = createTimer();

export async function waitFor<T>(
  fn: () => T | null | false,
  options: { timeout?: number; interval?: number; shouldStop?: () => boolean; stopMessage?: string } = {}
): Promise<T> {
  const timeout = options.timeout ?? 15000;
  const interval = options.interval ?? 250;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (options.shouldStop?.()) throw new Error(options.stopMessage || '已停止');
    const result = fn();
    if (result) return result;
    await sleep(interval);
  }

  throw new Error('等待超时');
}

export async function sleepInterruptible(
  ms: number,
  shouldStop: () => boolean,
  stopMessage = '已停止',
  step = 1000
): Promise<void> {
  const end = Date.now() + Math.max(0, ms || 0);
  while (Date.now() < end) {
    if (shouldStop()) throw new Error(stopMessage);
    await sleep(Math.min(step, Math.max(0, end - Date.now())));
  }
}
