import {
  DEFAULT_ASSOCIATES,
  DEFAULT_PRIORITIES,
  DEFAULT_REASONS,
  DEFAULT_REPAIR_ACTIONS,
  CantileverEntry,
  SettingsData,
} from "../types";
import { demoEntries } from "./demoData";

const ENTRIES_KEY = "cantilever.entries.v1";
const SETTINGS_KEY = "cantilever.settings.v1";

const defaultSettings: SettingsData = {
  associates: DEFAULT_ASSOCIATES,
  reasons: DEFAULT_REASONS,
  repairActions: DEFAULT_REPAIR_ACTIONS,
  priorities: DEFAULT_PRIORITIES,
  commonLocations: ["2H-108-50", "4C-022-30", "6A-014-20"],
};

const readJson = <T,>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Version 1 stores records in localStorage so the app can run without company
// approval or servers. A future Microsoft backend can replace these functions
// with Microsoft Graph calls to Lists, SharePoint document libraries, OneDrive,
// Power Automate, Teams webhooks, or Azure APIs while keeping the app screens.
export const storageService = {
  init() {
    if (!localStorage.getItem(ENTRIES_KEY)) writeJson(ENTRIES_KEY, demoEntries);
    if (!localStorage.getItem(SETTINGS_KEY)) writeJson(SETTINGS_KEY, defaultSettings);
  },
  getEntries(): CantileverEntry[] {
    return readJson<CantileverEntry[]>(ENTRIES_KEY, []);
  },
  saveEntries(entries: CantileverEntry[]) {
    writeJson(ENTRIES_KEY, entries);
  },
  upsertEntry(entry: CantileverEntry) {
    const entries = this.getEntries();
    const index = entries.findIndex((item) => item.id === entry.id);
    const next = { ...entry, updatedAt: new Date().toISOString() };
    if (index >= 0) entries[index] = next;
    else entries.unshift(next);
    this.saveEntries(entries);
    return next;
  },
  deleteEntry(id: string) {
    this.saveEntries(this.getEntries().filter((entry) => entry.id !== id));
  },
  getSettings(): SettingsData {
    return readJson<SettingsData>(SETTINGS_KEY, defaultSettings);
  },
  saveSettings(settings: SettingsData) {
    writeJson(SETTINGS_KEY, settings);
  },
  clearDemoData() {
    this.saveEntries(this.getEntries().filter((entry) => !entry.id.startsWith("demo-")));
  },
  resetDemoData() {
    this.saveEntries(demoEntries);
  },
};
