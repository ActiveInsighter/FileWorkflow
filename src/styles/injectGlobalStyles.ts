import { STYLE_ID } from '../shared/constants';
import { panelStyles } from './panelStyles';

export function injectGlobalStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = panelStyles;
  document.head.appendChild(style);
}
