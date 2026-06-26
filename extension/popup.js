document.getElementById('open-chatgpt')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://chatgpt.com/' });
});

document.getElementById('open-options')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
