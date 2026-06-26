import { mountShadowApp } from '../src/content-ui/mountShadowApp';
import { MESSAGE_TYPES } from '../src/shared/constants';
import type { RuntimeMessage } from '../src/types/messages';

export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  runAt: 'document_idle',
  main() {
    const controller = mountShadowApp();

    chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
      if (message.type === MESSAGE_TYPES.TOGGLE_PANEL) {
        controller.toggle();
      }
    });
  }
});
