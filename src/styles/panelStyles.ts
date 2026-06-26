import { PANEL_ID } from '../shared/constants';

export const panelStyles = `
#${PANEL_ID} {
  --fw-pq-bg: rgba(0, 0, 0, 0.12);
  --fw-pq-glass: rgba(0, 0, 0, 0.04);
  --fw-pq-glass-hover: rgba(0, 0, 0, 0.07);
  --fw-pq-border: rgba(255, 255, 255, 0.10);
  --fw-pq-border-strong: rgba(255, 255, 255, 0.18);
  --fw-pq-text: rgba(255, 255, 255, 0.94);
  --fw-pq-muted: rgba(255, 255, 255, 0.58);
  --fw-pq-accent: #10a37f;
  --fw-pq-danger: #f87171;
  --fw-pq-white-idle: rgba(255, 255, 255, 0.145);
  --fw-pq-white-hover: rgba(255, 255, 255, 0.30);

  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
  width: min(312px, calc(100vw - 16px));
  height: 338px;
  max-height: calc(100vh - 16px);
  color: var(--fw-pq-text);
  background: var(--fw-pq-bg);
  border: 1px solid var(--fw-pq-border);
  border-radius: 18px;
  box-shadow: 0 20px 64px rgba(0, 0, 0, 0.42), 0 1px 0 rgba(255, 255, 255, 0.045) inset;
  backdrop-filter: blur(34px) saturate(112%);
  -webkit-backdrop-filter: blur(34px) saturate(112%);
  overflow: hidden;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 12px;
  line-height: 1.45;
  user-select: none;
  isolation: isolate;
}

#${PANEL_ID} * { box-sizing: border-box; }

#${PANEL_ID} .fw-pq-header {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 5px 9px 5px 10px;
  background: rgba(0, 0, 0, 0.026);
  border-bottom: 1px solid rgba(255, 255, 255, 0.075);
  cursor: grab;
  touch-action: none;
}

#${PANEL_ID} .fw-pq-title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 730;
}

#${PANEL_ID} .fw-pq-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.035);
}

#${PANEL_ID}[data-mode="running"] .fw-pq-dot {
  background: var(--fw-pq-accent);
  box-shadow: 0 0 0 4px rgba(16, 163, 127, 0.15), 0 0 18px rgba(16, 163, 127, 0.48);
}

#${PANEL_ID}[data-mode="waiting"] .fw-pq-dot,
#${PANEL_ID}[data-mode="pausing"] .fw-pq-dot,
#${PANEL_ID}[data-mode="paused"] .fw-pq-dot {
  background: rgba(250, 204, 21, 0.88);
}

#${PANEL_ID} .fw-pq-badge,
#${PANEL_ID} .fw-pq-collapse,
#${PANEL_ID} .fw-pq-button,
#${PANEL_ID} .fw-pq-stat,
#${PANEL_ID} .fw-pq-force {
  background: var(--fw-pq-glass);
  border: 1px solid rgba(255, 255, 255, 0.082);
  backdrop-filter: blur(22px) saturate(108%);
  -webkit-backdrop-filter: blur(22px) saturate(108%);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.055) inset;
}

#${PANEL_ID} .fw-pq-badge {
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 9px;
  border-radius: 999px;
  color: var(--fw-pq-muted);
  font-size: 11px;
  white-space: nowrap;
}

#${PANEL_ID} .fw-pq-collapse {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: rgba(255, 255, 255, 0.62);
  cursor: pointer;
}

#${PANEL_ID} .fw-pq-body {
  height: calc(100% - 34px);
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 7px 10px;
  min-height: 0;
  user-select: text;
}

#${PANEL_ID} .fw-pq-field {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 5px;
}

#${PANEL_ID} .fw-pq-label,
#${PANEL_ID} .fw-pq-options,
#${PANEL_ID} .fw-pq-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 10.5px;
}

#${PANEL_ID} .fw-pq-label { justify-content: space-between; }
#${PANEL_ID} .fw-pq-label b { color: rgba(255, 255, 255, 0.86); font-size: 11.5px; }

#${PANEL_ID} .fw-pq-input-shell {
  --fw-pq-input-scroll-x: 0px;
  --fw-pq-input-scroll-y: 0px;
  position: relative;
  flex: 1 1 120px;
  min-height: 120px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 16px;
  overflow: hidden;
  background: var(--fw-pq-glass);
}

#${PANEL_ID} .fw-pq-input-highlight,
#${PANEL_ID} .fw-pq-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 120px;
  margin: 0;
  padding: 8px 76px 10px 11px;
  border: 0;
  border-radius: 16px;
  white-space: pre;
  overflow-wrap: normal;
  word-break: normal;
  font: 12.5px/1.58 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0.01em;
  tab-size: 4;
}

#${PANEL_ID} .fw-pq-input-highlight {
  z-index: 1;
  width: max-content;
  min-width: 100%;
  overflow: visible;
  pointer-events: none;
  color: var(--fw-pq-text);
  transform: translate(var(--fw-pq-input-scroll-x), var(--fw-pq-input-scroll-y));
}

#${PANEL_ID} .fw-pq-url-token,
#${PANEL_ID} .fw-pq-angle-token {
  color: rgba(147, 197, 253, 0.96);
}

#${PANEL_ID} .fw-pq-input {
  z-index: 2;
  resize: none;
  overflow-y: auto;
  overflow-x: auto;
  outline: none;
  background: transparent;
  color: transparent;
  -webkit-text-fill-color: transparent;
  caret-color: rgba(255, 255, 255, 0.96);
  scrollbar-gutter: stable;
  scrollbar-width: thin;
}

#${PANEL_ID} .fw-pq-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

#${PANEL_ID} .fw-pq-button {
  flex: 0 0 82px;
  width: 82px;
  min-height: 29px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--fw-pq-white-idle);
  color: rgba(255, 255, 255, 0.96);
  font-size: 12px;
  font-weight: 720;
  cursor: pointer;
}

#${PANEL_ID} .fw-pq-button:hover:not(:disabled) {
  background: var(--fw-pq-white-hover);
}

#${PANEL_ID} .fw-pq-button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

#${PANEL_ID} .fw-pq-stats {
  display: grid;
  grid-template-columns: 0.76fr 0.94fr 0.94fr 0.82fr;
  gap: 7px;
}

#${PANEL_ID} .fw-pq-stat {
  min-width: 0;
  padding: 6px 7px;
  border-radius: 12px;
}

#${PANEL_ID} .fw-pq-stat span {
  display: block;
  color: rgba(255, 255, 255, 0.42);
  font-size: 10.5px;
}

#${PANEL_ID} .fw-pq-stat b {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.94);
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#${PANEL_ID} .fw-pq-toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  white-space: nowrap;
}

#${PANEL_ID} .fw-pq-toggle {
  appearance: none;
  width: 32px;
  height: 18px;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 999px;
  background: var(--fw-pq-white-idle);
  cursor: pointer;
}

#${PANEL_ID} .fw-pq-toggle::after {
  content: "";
  position: absolute;
  left: 2px;
  top: 2px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.90);
  transition: transform 160ms ease;
}

#${PANEL_ID} .fw-pq-toggle:checked::after { transform: translateX(14px); }
#${PANEL_ID} .fw-pq-wait-range { margin-left: auto; color: rgba(255,255,255,.38); }
#${PANEL_ID} .fw-pq-footer { min-height: 24px; }
#${PANEL_ID} .fw-pq-detail { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#${PANEL_ID} .fw-pq-force { min-height: 24px; padding: 0 8px; border-radius: 9px; color: rgba(255,255,255,.66); font-size: 11px; cursor: pointer; }

#${PANEL_ID}[data-collapsed="true"] { width: min(210px, calc(100vw - 16px)); height: 34px; }
#${PANEL_ID}[data-collapsed="true"] .fw-pq-body { display: none; }

@media (max-width: 480px) {
  #${PANEL_ID} { width: min(292px, calc(100vw - 16px)); right: 8px; bottom: 8px; }
}
`;
