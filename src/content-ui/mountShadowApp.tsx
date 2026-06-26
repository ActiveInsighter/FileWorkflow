import React from 'react';
import { createRoot } from 'react-dom/client';
import { ContentApp } from '../app/ContentApp';
import css from '../app/ContentApp.css?inline';
import { ROOT_HOST_ID } from '../shared/constants';

export interface MountedPanelController {
  toggle: () => void;
  destroy: () => void;
}

export function mountShadowApp(): MountedPanelController {
  const old = document.getElementById(ROOT_HOST_ID);
  old?.remove();

  const host = document.createElement('div');
  host.id = ROOT_HOST_ID;
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647';
  document.documentElement.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  const mountNode = document.createElement('div');
  shadowRoot.append(style, mountNode);

  const root = createRoot(mountNode);
  root.render(
    <React.StrictMode>
      <ContentApp />
    </React.StrictMode>
  );

  return {
    toggle() {
      host.hidden = !host.hidden;
    },
    destroy() {
      root.unmount();
      host.remove();
    }
  };
}
