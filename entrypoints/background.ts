import type { RuntimeMessage, RuntimeMessageResponse } from '../src/types/messages';
import { CHATGPT_HOME_URL, MESSAGE_TYPES } from '../src/shared/constants';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    console.info('[FileWorkflow] installed');
  });

  chrome.commands?.onCommand?.addListener(async (command) => {
    if (command !== 'toggle-panel') return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;
    await chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.TOGGLE_PANEL } satisfies RuntimeMessage);
  });

  chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
    handleRuntimeMessage(message).then(sendResponse);
    return true;
  });
});

async function handleRuntimeMessage(message: RuntimeMessage): Promise<RuntimeMessageResponse> {
  if (message.type === MESSAGE_TYPES.OPEN_CHATGPT) {
    await chrome.tabs.create({ url: CHATGPT_HOME_URL });
    return { ok: true };
  }

  return { ok: false, error: `未知消息：${message.type}` };
}
