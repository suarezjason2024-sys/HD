import { CantileverEntry } from "../types";
import { monthKey, quarterKey } from "./date";

const badLocationValues = new Set(["0", "undefined", "null", "n/a", "na", "-", "--"]);

export const cleanKey = (value: string) => value.trim().replace(/\s+/g, " ").toUpperCase();

export const locationKey = (entry: CantileverEntry) => {
  const full = cleanKey(entry.fullLocation);
  if (full && !badLocationValues.has(full.toLowerCase())) return full;
  const parts = [entry.aisle, entry.sectionBay, entry.level].map(cleanKey).filter(Boolean);
  const fallback = parts.join("-");
  if (!fallback || badLocationValues.has(fallback.toLowerCase())) return "";
  return fallback;
};

export const validLocation = (entry: CantileverEntry) => Boolean(locationKey(entry));

export const countBy = (entries: CantileverEntry[], getKey: (entry: CantileverEntry) => string) => {
  const map = new Map<string, number>();
  entries.forEach((entry) => {
    const key = cleanKey(getKey(entry));
    if (!key || badLocationValues.has(key.toLowerCase())) return;
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

export const analytics = (entries: CantileverEntry[]) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.toISOString().slice(0, 7);
  const open = entries.filter((entry) => entry.conditionStatus === "Damaged - Needs Replacement");
  const monitored = entries.filter((entry) => entry.conditionStatus === "Monitor");
  const replaced = entries.filter((entry) => entry.conditionStatus === "Replaced");
  const replacementsThisMonth = replaced.filter((entry) => monthKey(entry.dateRepaired) === currentMonth).length;
  const replacementsThisYear = replaced.filter((entry) => {
    const year = new Date(`${entry.dateRepaired}T00:00:00`).getFullYear();
    return Number.isFinite(year) && year === currentYear;
  }).length;
  const topLocations = countBy(entries.filter(validLocation), locationKey);
  const topAisles = countBy(entries, (entry) => entry.aisle);
  const topReasons = countBy(entries, (entry) => entry.reason);
  const replacementMonths = countBy(replaced, (entry) => monthKey(entry.dateRepaired)).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  const replacementQuarters = countBy(replaced, (entry) => quarterKey(entry.dateRepaired)).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  const replacementYears = countBy(replaced, (entry) => entry.dateRepaired.slice(0, 4)).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  return {
    open,
    monitored,
    replaced,
    replacementsThisMonth,
    replacementsThisYear,
    totalCompleted: replaced.length,
    topLocations,
    topAisles,
    topReasons,
    replacementMonths,
    replacementQuarters,
    replacementYears,
    statusCounts: countBy(entries, (entry) => entry.conditionStatus),
    attentionLocations: topLocations.filter((item) => item.count >= 3),
    repeatLocations: topLocations.filter((item) => item.count > 1),
    mostCommonReason: topReasons[0]?.label || "None yet",
  };
};
