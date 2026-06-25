import { CantileverEntry } from "../types";

const headers: (keyof CantileverEntry)[] = [
  "id",
  "dateReported",
  "reportedBy",
  "area",
  "fullLocation",
  "aisle",
  "sectionBay",
  "level",
  "exactRackPosition",
  "cantileverSide",
  "conditionStatus",
  "reason",
  "priority",
  "photoDataUrl",
  "notes",
  "dateRepaired",
  "repairedBy",
  "repairAction",
  "reviewFlag",
  "source",
  "followUpNeeded",
  "followUpNotes",
  "createdAt",
  "updatedAt",
];

const escapeCell = (value: unknown) => {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

export const entriesToCsv = (entries: CantileverEntry[]) => {
  const lines = [headers.join(",")];
  entries.forEach((entry) => lines.push(headers.map((header) => escapeCell(entry[header])).join(",")));
  return lines.join("\n");
};

const parseLine = (line: string) => {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
};

export const csvToEntries = (csv: string): CantileverEntry[] => {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const rawKeys = parseLine(lines[0]);
  const keyMap: Record<string, keyof CantileverEntry> = {
    "date reported": "dateReported",
    "date repaired": "dateRepaired",
    area: "area",
    aisle: "aisle",
    location: "fullLocation",
    "reason for replacement": "reason",
    "replaced by": "repairedBy",
    notes: "notes",
    "review flag": "reviewFlag",
  };
  const keys = rawKeys.map((key) => keyMap[key.trim().toLowerCase()] || key) as (keyof CantileverEntry)[];
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const item: Partial<CantileverEntry> = {};
    keys.forEach((key, index) => {
      const value = cells[index] ?? "";
      (item as Record<string, unknown>)[key] = key === "followUpNeeded" ? value === "true" : value;
    });
    return {
      id: item.id || crypto.randomUUID(),
      dateReported: item.dateReported || "",
      reportedBy: item.reportedBy || "",
      area: item.area || "",
      fullLocation: item.fullLocation || "",
      aisle: item.aisle || "",
      sectionBay: item.sectionBay || "",
      level: item.level || "",
      exactRackPosition: item.exactRackPosition || "",
      cantileverSide: item.cantileverSide || "Unknown",
      conditionStatus: item.conditionStatus || (item.dateRepaired ? "Replaced" : "Damaged - Needs Replacement"),
      reason: item.reason || "Other",
      priority: item.priority || "Medium",
      photoDataUrl: item.photoDataUrl || "",
      notes: item.notes || "",
      dateRepaired: item.dateRepaired || "",
      repairedBy: item.repairedBy || "",
      repairAction: item.repairAction || (item.dateRepaired ? "Replaced arm" : ""),
      reviewFlag: item.reviewFlag || (item.dateRepaired ? "Complete" : "Needs repair"),
      source: item.source || "CSV import",
      followUpNeeded: Boolean(item.followUpNeeded),
      followUpNotes: item.followUpNotes || "",
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as CantileverEntry;
  });
};
