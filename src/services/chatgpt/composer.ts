import { getComposer } from './domAdapter';

export function dispatchInput(el: HTMLElement): void {
  try {
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  } catch {
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

export function setComposerText(text: string): void {
  const composer = getComposer();
  if (!composer) throw new Error('找不到输入框');

  composer.focus();

  if (composer instanceof HTMLTextAreaElement) {
    composer.value = text;
    dispatchInput(composer);
    return;
  }

  composer.textContent = '';
  String(text).split('\n').forEach((line, index) => {
    if (index > 0) composer.appendChild(document.createElement('br'));
    composer.appendChild(document.createTextNode(line));
  });
  dispatchInput(composer);
}
