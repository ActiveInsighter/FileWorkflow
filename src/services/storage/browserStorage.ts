type StorageValue = string | number | boolean | null | object | unknown[];

function hasChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

export const storage = {
  async get<T>(key: string): Promise<T | undefined> {
    if (hasChromeStorage()) {
      const result = await chrome.storage.local.get(key);
      return result[key] as T | undefined;
    }
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  },

  async set<T extends StorageValue>(key: string, value: T): Promise<void> {
    if (hasChromeStorage()) {
      await chrome.storage.local.set({ [key]: value });
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    if (hasChromeStorage()) {
      await chrome.storage.local.remove(key);
      return;
    }
    window.localStorage.removeItem(key);
  }
};
