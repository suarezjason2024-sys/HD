import {
  DEFAULT_ASSOCIATES,
  DEFAULT_AREAS,
  DEFAULT_PRIORITIES,
  DEFAULT_REASONS,
  DEFAULT_REPAIR_ACTIONS,
  CantileverEntry,
  SettingsData,
} from "../types";
import { demoEntries } from "./demoData";

const ENTRIES_KEY = "cantilever.entries.v1";
const SETTINGS_KEY = "cantilever.settings.v1";
const SEED_VERSION_KEY = "cantilever.seedVersion.v1";
const CURRENT_SEED_VERSION = "excel-tracker-2026-06";

const defaultSettings: SettingsData = {
  associates: DEFAULT_ASSOCIATES,
  reasons: DEFAULT_REASONS,
  repairActions: DEFAULT_REPAIR_ACTIONS,
  priorities: DEFAULT_PRIORITIES,
  areas: DEFAULT_AREAS,
  commonLocations: ["2E-107-30", "CS2-2A-DIM-120-40", "2G-109-40"],
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
    const currentEntries = readJson<CantileverEntry[]>(ENTRIES_KEY, []);
    if (!currentEntries.length) {
      writeJson(ENTRIES_KEY, demoEntries);
      localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION);
    } else if (localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION) {
      const existingIds = new Set(currentEntries.map((entry) => entry.id));
      const missingSeedEntries = demoEntries.filter((entry) => !existingIds.has(entry.id));
      writeJson(ENTRIES_KEY, [...missingSeedEntries, ...currentEntries]);
      localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION);
    }
    if (!localStorage.getItem(SETTINGS_KEY)) writeJson(SETTINGS_KEY, defaultSettings);
  },
  getEntries(): CantileverEntry[] {
    return readJson<Partial<CantileverEntry>[]>(ENTRIES_KEY, []).map((entry) => ({
      area: "",
      reviewFlag: entry.dateRepaired ? "Complete" : "Needs repair",
      source: "Local record",
      ...entry,
    } as CantileverEntry));
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
    return { ...defaultSettings, ...readJson<Partial<SettingsData>>(SETTINGS_KEY, {}) };
  },
  saveSettings(settings: SettingsData) {
    writeJson(SETTINGS_KEY, settings);
  },
  clearDemoData() {
    this.saveEntries(this.getEntries().filter((entry) => !entry.id.startsWith("demo-") && !entry.id.startsWith("excel-")));
    localStorage.removeItem(SEED_VERSION_KEY);
  },
  resetDemoData() {
    this.saveEntries(demoEntries);
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION);
  },
};
