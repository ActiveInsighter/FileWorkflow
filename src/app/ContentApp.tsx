import { useEffect } from 'react';
import { QueuePanel } from '../components/QueuePanel';
import { useQueueStore } from '../stores/queueStore';
import { useSettingsStore } from '../stores/settingsStore';

export function ContentApp() {
  const hydrateQueue = useQueueStore((state) => state.hydrate);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateSettings();
    void hydrateQueue();
  }, [hydrateQueue, hydrateSettings]);

  return <QueuePanel />;
}
