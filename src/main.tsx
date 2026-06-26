import { createRoot, type Root } from 'react-dom/client';
import { App } from './app/App';
import { APP_ROOT_ID } from './shared/constants';
import { injectGlobalStyles } from './styles/injectGlobalStyles';

declare global {
  interface Window {
    __FILEWORKFLOW_CHATGPT_QUEUE__?: {
      root: Root;
      unmount: () => void;
    };
  }
}

function mount(): void {
  if (window.__FILEWORKFLOW_CHATGPT_QUEUE__) return;

  injectGlobalStyles();

  let container = document.getElementById(APP_ROOT_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = APP_ROOT_ID;
    document.body.appendChild(container);
  }

  const root = createRoot(container);
  root.render(<App />);

  window.__FILEWORKFLOW_CHATGPT_QUEUE__ = {
    root,
    unmount: () => {
      root.unmount();
      container?.remove();
      window.__FILEWORKFLOW_CHATGPT_QUEUE__ = undefined;
    }
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
