export const today = () => new Date().toISOString().slice(0, 10);

export const monthKey = (date: string) => (date ? date.slice(0, 7) : "");

export const quarterKey = (date: string) => {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
};

export const formatShortDate = (date: string) => {
  if (!date) return "Not set";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export const daysBetween = (start: string, end: string) => {
  if (!start || !end) return "";
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";
  return String(Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000)));
};
