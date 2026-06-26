import { normalizeText } from '../../shared/format';

export function isFromPanel(el: Element | null): boolean {
  return Boolean(el?.closest?.('#fileworkflow-chatgpt-queue-panel'));
}

export function isVisible(el: Element | null): el is HTMLElement {
  if (!el || !document.contains(el) || isFromPanel(el)) return false;
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && style.opacity !== '0'
    && rect.width > 0
    && rect.height > 0;
}

export function visibleOne(selectors: string, root: ParentNode = document): HTMLElement | null {
  return Array.from(root.querySelectorAll(selectors)).find(isVisible) || null;
}

export function getComposer(): HTMLElement | HTMLTextAreaElement | null {
  const selectors = [
    '#prompt-textarea',
    '[data-testid="prompt-textarea"]',
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'textarea[placeholder]',
    'textarea',
    'div[contenteditable="true"]'
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (isVisible(el)) return el as HTMLElement | HTMLTextAreaElement;
  }

  return null;
}

export function isComposerReady(): boolean {
  const composer = getComposer();
  if (!composer) return false;
  const maybeTextarea = composer as HTMLTextAreaElement;
  if (maybeTextarea.disabled || maybeTextarea.readOnly) return false;
  if (composer.getAttribute('aria-disabled') === 'true') return false;
  if (composer.getAttribute('contenteditable') === 'false') return false;
  return true;
}

export function getSendButton(): HTMLButtonElement | null {
  const composer = getComposer();
  const roots = composer ? [composer.closest('form'), document].filter(Boolean) as ParentNode[] : [document];
  const selectors = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="发送"]',
    'form button[type="submit"]'
  ].join(',');

  for (const root of roots) {
    const button = visibleOne(selectors, root) as HTMLButtonElement | null;
    if (button && !button.disabled && button.getAttribute('aria-disabled') !== 'true') return button;
  }
  return null;
}

export function getStopButton(): HTMLButtonElement | null {
  return visibleOne([
    'button[data-testid="stop-button"]',
    'button[aria-label*="Stop"]',
    'button[aria-label*="停止"]'
  ].join(',')) as HTMLButtonElement | null;
}

export function getAssistantMessages(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'))
    .filter(el => !isFromPanel(el) && document.contains(el)) as HTMLElement[];
}

export function getAssistantCount(): number {
  return getAssistantMessages().length;
}

export function getAssistantContentText(message: HTMLElement | undefined): string {
  if (!message) return '';
  const content = message.querySelector('.markdown, .prose, [data-message-id]') || message;
  const clone = content.cloneNode(true) as HTMLElement;
  clone.querySelectorAll([
    'button', 'textarea', 'input', 'select', 'svg', 'script', 'style',
    '[data-testid*="copy"]', '[data-testid*="feedback"]', '[data-testid*="composer"]'
  ].join(',')).forEach(node => node.remove());
  return normalizeText(clone.textContent || clone.innerText || '');
}

export function getLastAssistantText(): string {
  const messages = getAssistantMessages();
  return getAssistantContentText(messages[messages.length - 1]);
}

export function hasBusyIndicator(): boolean {
  const last = getAssistantMessages().pop();
  const roots = [last, document.querySelector('main')].filter(Boolean) as ParentNode[];
  return roots.some(root => Boolean((root as Element).querySelector('[aria-busy="true"], [data-testid*="loading"], .result-streaming')));
}

export function isGenerating(): boolean {
  return Boolean(getStopButton()) || hasBusyIndicator();
}

export function getReplySignature(): string {
  const messages = getAssistantMessages();
  const last = messages[messages.length - 1];
  if (!last) return `empty|${messages.length}`;
  const rect = last.getBoundingClientRect();
  const text = normalizeText(last.textContent || last.innerText || '');
  return [messages.length, text.length, text.slice(-180), Math.round(rect.height), last.childElementCount].join('|');
}

export function scrollToBottom(): void {
  const scroller = document.scrollingElement || document.documentElement;
  scroller.scrollTop = scroller.scrollHeight;
  window.scrollTo(0, document.body.scrollHeight);
}
