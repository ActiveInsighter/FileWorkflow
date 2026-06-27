import { create } from 'zustand';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/constants';
import { safeJsonGet, safeJsonSet } from '../shared/storage';
import type { ExtensionSettings } from '../types/settings';

interface SettingsStore extends ExtensionSettings {
  patch: (patch: Partial<ExtensionSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  ...safeJsonGet<Partial<ExtensionSettings>>(STORAGE_KEYS.settings, {}),
  patch: patch => {
    const next = { ...get(), ...patch };
    safeJsonSet(STORAGE_KEYS.settings, next);
    set(next);
  }
}));
