import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { storageService } from "./data/storageService";
import { analytics as buildAnalytics } from "./utils/analytics";
import { csvToEntries, entriesToCsv } from "./utils/csv";
import { formatShortDate, today } from "./utils/date";
import { CantileverEntry, SettingsData, SIDE_OPTIONS, STATUS_OPTIONS, VERSION } from "./types";

type Page =
  | "dashboard"
  | "new"
  | "open"
  | "completed"
  | "analytics"
  | "search"
  | "settings";

const navItems: { page: Page; label: string }[] = [
  { page: "dashboard", label: "Dashboard" },
  { page: "new", label: "New Entry" },
  { page: "open", label: "Open / Monitor" },
  { page: "completed", label: "Completed" },
  { page: "analytics", label: "Analytics" },
  { page: "search", label: "Search" },
  { page: "settings", label: "Settings" },
];

const emptyEntry = (): CantileverEntry => ({
  id: crypto.randomUUID(),
  dateReported: today(),
  reportedBy: "",
  fullLocation: "",
  aisle: "",
  sectionBay: "",
  level: "",
  exactRackPosition: "",
  cantileverSide: "Unknown",
  conditionStatus: "Damaged - Needs Replacement",
  reason: "Bent",
  priority: "Medium",
  photoDataUrl: "",
  notes: "",
  dateRepaired: "",
  repairedBy: "",
  repairAction: "",
  followUpNeeded: false,
  followUpNotes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const fieldIncludes = (value: string, query: string) => value.toLowerCase().includes(query.toLowerCase().trim());

const priorityRank = (priority: string) => ({ Critical: 0, High: 1, Medium: 2, Low: 3 }[priority] ?? 4);
const displayLocation = (entry: CantileverEntry) =>
  entry.fullLocation.trim() || [entry.aisle, entry.sectionBay, entry.level].filter(Boolean).join("-") || "Location not set";

const parseLocation = (value: string) => {
  const parts = value.trim().split("-").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return { aisle: parts[0] ?? "", sectionBay: parts[1] ?? "", level: parts[2] ?? "" };
};

const statusClass = (status: string) =>
  status === "Damaged - Needs Replacement" ? "damaged" : status === "Monitor" ? "monitor" : status === "Replaced" ? "replaced" : "clear";

const shortStatus = (status: string) => (status === "Damaged - Needs Replacement" ? "Damaged" : status);

function App() {
  const [entries, setEntries] = useState<CantileverEntry[]>([]);
  const [settings, setSettings] = useState<SettingsData>(() => storageService.getSettings());
  const [page, setPage] = useState<Page>("dashboard");
  const [editing, setEditing] = useState<CantileverEntry | null>(null);

  useEffect(() => {
    storageService.init();
    setEntries(storageService.getEntries());
    setSettings(storageService.getSettings());
  }, []);

  const refresh = () => {
    setEntries(storageService.getEntries());
    setSettings(storageService.getSettings());
  };

  const saveEntry = (entry: CantileverEntry) => {
    const saved = storageService.upsertEntry(entry);
    refresh();
    setEditing(null);
    setPage(saved.conditionStatus === "Replaced" ? "completed" : "open");
  };

  const deleteEntry = (id: string) => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    storageService.deleteEntry(id);
    refresh();
  };

  const stats = useMemo(() => buildAnalytics(entries), [entries]);
  const recent = [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Maintenance field tool</p>
          <h1>Cantilever Replacement Tracker</h1>
        </div>
        <button className="primary small" onClick={() => { setEditing(emptyEntry()); setPage("new"); }}>
          New Entry
        </button>
      </header>

      <nav className="tabs" aria-label="Main pages">
        {navItems.map((item) => (
          <button key={item.page} className={page === item.page ? "active" : ""} onClick={() => setPage(item.page)}>
            {item.label}
          </button>
        ))}
      </nav>

      <main>
        {page === "dashboard" && (
          <Dashboard
            stats={stats}
            entries={entries}
            recent={recent}
            onNew={() => { setEditing(emptyEntry()); setPage("new"); }}
            onOpen={() => setPage("open")}
            onAnalytics={() => setPage("analytics")}
            onEdit={(entry) => { setEditing(entry); setPage("new"); }}
          />
        )}
        {page === "new" && (
          <EntryForm
            entry={editing ?? emptyEntry()}
            settings={settings}
            onCancel={() => { setEditing(null); setPage("dashboard"); }}
            onSave={saveEntry}
          />
        )}
        {page === "open" && (
          <EntryList
            title="Open / Monitor Items"
            entries={entries.filter((entry) => ["Damaged - Needs Replacement", "Monitor"].includes(entry.conditionStatus))}
            settings={settings}
            onEdit={(entry) => { setEditing(entry); setPage("new"); }}
            onDelete={deleteEntry}
            onSave={saveEntry}
            openMode
          />
        )}
        {page === "completed" && (
          <EntryList
            title="Completed Replacements"
            entries={entries.filter((entry) => entry.conditionStatus === "Replaced")}
            settings={settings}
            onEdit={(entry) => { setEditing(entry); setPage("new"); }}
            onDelete={deleteEntry}
            onSave={saveEntry}
          />
        )}
        {page === "analytics" && <AnalyticsPage stats={stats} entries={entries} />}
        {page === "search" && (
          <SearchPage entries={entries} onEdit={(entry) => { setEditing(entry); setPage("new"); }} onDelete={deleteEntry} />
        )}
        {page === "settings" && <SettingsPage settings={settings} entries={entries} onSettings={setSettings} onRefresh={refresh} />}
      </main>
    </div>
  );
}

function Dashboard({
  stats,
  entries,
  recent,
  onNew,
  onOpen,
  onAnalytics,
  onEdit,
}: {
  stats: ReturnType<typeof buildAnalytics>;
  entries: CantileverEntry[];
  recent: CantileverEntry[];
  onNew: () => void;
  onOpen: () => void;
  onAnalytics: () => void;
  onEdit: (entry: CantileverEntry) => void;
}) {
  const urgentOpen = stats.open
    .filter((entry) => ["Critical", "High"].includes(entry.priority))
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.dateReported.localeCompare(b.dateReported));

  return (
    <section className="stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Aisle walk summary</p>
          <h2>{stats.open.length} damaged arm(s) still open</h2>
          <p>Monitor stays open for watch items. Replaced moves to completed history.</p>
        </div>
        <div className="hero-actions">
          <button className="primary" onClick={onNew}>New Entry</button>
          <button onClick={onOpen}>Open List</button>
        </div>
      </div>

      <div className="stat-grid dashboard-stats">
        <Stat label="Open damaged arms" value={stats.open.length} tone="danger" />
        <Stat label="Monitor only" value={stats.monitored.length} />
        <Stat label="Replacements this month" value={stats.replacementsThisMonth} />
        <Stat label="Replacements this year" value={stats.replacementsThisYear} />
        <Stat label="Completed replacements" value={stats.totalCompleted} />
        <Stat label="Most common reason" value={stats.mostCommonReason} />
      </div>

      <div className="panel attention">
        <div className="section-title">
          <h2>Needs Work Now</h2>
          <span>{urgentOpen.length} critical/high</span>
        </div>
        <div className="quick-list">
          {urgentOpen.slice(0, 4).map((entry) => (
            <button key={entry.id} onClick={() => onEdit(entry)}>
              <strong>{displayLocation(entry)}</strong>
              <span>{entry.priority} - {entry.reason}</span>
            </button>
          ))}
          {!urgentOpen.length && <p className="muted">No critical or high open damaged arms.</p>}
        </div>
      </div>

      <div className="panel attention">
        <div className="section-title">
          <h2>High-Repeat Locations</h2>
          <span>{stats.attentionLocations.length} attention item(s)</span>
        </div>
        <MiniList items={stats.attentionLocations.slice(0, 5)} empty="No location has 3 or more entries." />
      </div>

      <div className="split">
        <div className="panel">
          <div className="section-title">
            <h2>Top 3 Repeat Locations</h2>
            <button className="ghost small" onClick={onAnalytics}>Review</button>
          </div>
          <MiniList items={stats.repeatLocations.slice(0, 3)} empty="No repeat locations yet." />
        </div>
        <div className="panel">
          <h2>Month-by-Month Replacement Trend</h2>
          <BarList items={stats.replacementMonths} />
        </div>
      </div>

      <div className="panel">
        <div className="section-title">
          <h2>Recent Entries</h2>
          <span>{entries.length} total records</span>
        </div>
        <div className="cards">
          {recent.map((entry) => <EntryCard key={entry.id} entry={entry} onEdit={onEdit} />)}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "danger" }) {
  return (
    <div className={`stat ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MiniList({ items, empty }: { items: { label: string; count: number }[]; empty: string }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <div className="mini-list">
      {items.map((item) => (
        <div key={item.label}>
          <strong>{item.label}</strong>
          <span>{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function BarList({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  if (!items.length) return <p className="muted">No replacement dates recorded yet.</p>;
  return (
    <div className="bar-list">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <span>{item.label}</span>
          <div><i style={{ width: `${(item.count / max) * 100}%` }} /></div>
          <b>{item.count}</b>
        </div>
      ))}
    </div>
  );
}

function EntryForm({
  entry,
  settings,
  onSave,
  onCancel,
}: {
  entry: CantileverEntry;
  settings: SettingsData;
  onSave: (entry: CantileverEntry) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CantileverEntry>(entry);
  const set = (key: keyof CantileverEntry, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const isLocationValid = form.fullLocation.trim() || (form.aisle.trim() && form.sectionBay.trim());
  const setFullLocation = (value: string) => {
    const parsed = parseLocation(value);
    setForm((current) => ({
      ...current,
      fullLocation: value,
      aisle: parsed?.aisle || current.aisle,
      sectionBay: parsed?.sectionBay || current.sectionBay,
      level: parsed?.level || current.level,
    }));
  };

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("photoDataUrl", String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!isLocationValid) {
      alert("Enter a full location or at least aisle and section / bay.");
      return;
    }
    if (form.conditionStatus === "Replaced" && (!form.dateRepaired || !form.repairedBy || !form.repairAction)) {
      alert("For replaced arms, enter Date Repaired, Repaired By, and Repair Action Taken.");
      return;
    }
    onSave(form);
  };

  return (
    <section className="panel form-panel">
      <div className="section-title">
        <h2>{entry.createdAt === entry.updatedAt ? "New Cantilever Entry" : "Edit Cantilever Entry"}</h2>
        <button className="ghost" onClick={onCancel}>Cancel</button>
      </div>

      <div className="form-step">
        <strong>1. Record the location and status.</strong>
        <span>Full location is enough. Aisle, bay, and level help filtering when you have them.</span>
      </div>

      <div className="form-grid">
        <Field label="Full location" placeholder="Example: 2H-108-50" value={form.fullLocation} onChange={setFullLocation} list="locations" wide />
        <datalist id="locations">{settings.commonLocations.map((loc) => <option key={loc} value={loc} />)}</datalist>
        <div className="status-picker wide" aria-label="Arm condition status">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              className={form.conditionStatus === status ? `selected status-${statusClass(status)}` : ""}
              onClick={() => set("conditionStatus", status)}
              type="button"
            >
              {shortStatus(status)}
            </button>
          ))}
        </div>
        <Field label="Date reported" type="date" value={form.dateReported} onChange={(v) => set("dateReported", v)} />
        <Select label="Reported by" value={form.reportedBy} options={settings.associates} onChange={(v) => set("reportedBy", v)} />
        <Field label="Aisle" value={form.aisle} onChange={(v) => set("aisle", v)} />
        <Field label="Section / Bay" value={form.sectionBay} onChange={(v) => set("sectionBay", v)} />
        <Field label="Level" value={form.level} onChange={(v) => set("level", v)} />
        <Field label="Exact rack position" value={form.exactRackPosition} onChange={(v) => set("exactRackPosition", v)} />
        <Select label="Cantilever side" value={form.cantileverSide} options={SIDE_OPTIONS} onChange={(v) => set("cantileverSide", v)} />
        <Select label="Reason for replacement" value={form.reason} options={settings.reasons} onChange={(v) => set("reason", v)} />
        <Select label="Priority" value={form.priority} options={settings.priorities} onChange={(v) => set("priority", v)} />
        <label className="field">
          <span>Photo upload</span>
          <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
        </label>
        {form.photoDataUrl && (
          <div className="photo-preview">
            <img src={form.photoDataUrl} alt="Cantilever damage" />
            <button className="ghost" onClick={() => set("photoDataUrl", "")}>Remove Photo</button>
          </div>
        )}
        <label className="field wide">
          <span>Notes</span>
          <textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} />
        </label>
        {form.conditionStatus === "Replaced" && (
          <div className="repair-block wide">
            <div className="form-step">
              <strong>2. Complete the replacement record.</strong>
              <span>These fields move the item to Completed Replacements.</span>
            </div>
            <div className="form-grid nested-grid">
              <Field label="Date repaired" type="date" value={form.dateRepaired} onChange={(v) => set("dateRepaired", v)} />
              <Select label="Repaired by" value={form.repairedBy} options={["", ...settings.associates]} onChange={(v) => set("repairedBy", v)} />
              <Select label="Repair action taken" value={form.repairAction} options={["", ...settings.repairActions]} onChange={(v) => set("repairAction", v)} />
            </div>
          </div>
        )}
        <label className="check">
          <input type="checkbox" checked={form.followUpNeeded} onChange={(event) => set("followUpNeeded", event.target.checked)} />
          Follow-up needed
        </label>
        <label className="field wide">
          <span>Follow-up notes</span>
          <textarea value={form.followUpNotes} onChange={(event) => set("followUpNotes", event.target.value)} />
        </label>
      </div>
      <div className="sticky-save">
        <button className="primary full" onClick={submit}>Save Entry</button>
      </div>
    </section>
  );
}

function EntryList({
  title,
  entries,
  settings,
  onEdit,
  onDelete,
  onSave,
  openMode,
}: {
  title: string;
  entries: CantileverEntry[];
  settings: SettingsData;
  onEdit: (entry: CantileverEntry) => void;
  onDelete: (id: string) => void;
  onSave: (entry: CantileverEntry) => void;
  openMode?: boolean;
}) {
  const [filters, setFilters] = useState({ priority: "", reason: "", aisle: "", location: "", person: "", date: "" });
  const filtered = entries.filter((entry) =>
    (!filters.priority || entry.priority === filters.priority) &&
    (!filters.reason || entry.reason === filters.reason) &&
    (!filters.aisle || fieldIncludes(entry.aisle, filters.aisle)) &&
    (!filters.location || fieldIncludes(entry.fullLocation, filters.location)) &&
    (!filters.person || entry.reportedBy === filters.person || entry.repairedBy === filters.person) &&
    (!filters.date || entry.dateReported === filters.date || entry.dateRepaired === filters.date)
  ).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.dateReported.localeCompare(b.dateReported));
  const openDamaged = entries.filter((entry) => entry.conditionStatus === "Damaged - Needs Replacement").length;
  const monitorOnly = entries.filter((entry) => entry.conditionStatus === "Monitor").length;

  return (
    <section className="stack">
      <div className="panel">
        <div className="section-title">
          <h2>{title}</h2>
          <span>{filtered.length} shown</span>
        </div>
        {openMode && (
          <div className="summary-strip">
            <span><b>{openDamaged}</b> damaged</span>
            <span><b>{monitorOnly}</b> monitor</span>
            <span><b>{entries.filter((entry) => ["Critical", "High"].includes(entry.priority)).length}</b> critical/high</span>
          </div>
        )}
        <div className="filter-grid">
          <Select compact label="Priority" value={filters.priority} options={["", ...settings.priorities]} onChange={(v) => setFilters({ ...filters, priority: v })} />
          <Select compact label="Reason" value={filters.reason} options={["", ...settings.reasons]} onChange={(v) => setFilters({ ...filters, reason: v })} />
          <Field compact label="Aisle" value={filters.aisle} onChange={(v) => setFilters({ ...filters, aisle: v })} />
          <Field compact label="Full location" value={filters.location} onChange={(v) => setFilters({ ...filters, location: v })} />
          <Select compact label="Reported / repaired by" value={filters.person} options={["", ...settings.associates]} onChange={(v) => setFilters({ ...filters, person: v })} />
          <Field compact label="Date" type="date" value={filters.date} onChange={(v) => setFilters({ ...filters, date: v })} />
        </div>
        <button className="ghost small" onClick={() => setFilters({ priority: "", reason: "", aisle: "", location: "", person: "", date: "" })}>
          Clear Filters
        </button>
      </div>
      <div className="cards">
        {filtered.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onEdit={onEdit}
            onDelete={onDelete}
            onMarkReplaced={openMode ? () => {
              const repairedBy = prompt("Repaired by", entry.repairedBy || settings.associates[0] || "Maintenance");
              if (!repairedBy) return;
              const repairAction = prompt("Repair action taken", entry.repairAction || "Replaced arm");
              if (!repairAction) return;
              onSave({ ...entry, conditionStatus: "Replaced", dateRepaired: entry.dateRepaired || today(), repairedBy, repairAction });
            } : undefined}
            onFollowUp={openMode ? (notes) => onSave({ ...entry, followUpNeeded: true, followUpNotes: notes }) : undefined}
          />
        ))}
      </div>
      {!filtered.length && <Empty text="No matching entries." />}
    </section>
  );
}

function EntryCard({
  entry,
  onEdit,
  onDelete,
  onMarkReplaced,
  onFollowUp,
}: {
  entry: CantileverEntry;
  onEdit: (entry: CantileverEntry) => void;
  onDelete?: (id: string) => void;
  onMarkReplaced?: () => void;
  onFollowUp?: (notes: string) => void;
}) {
  const addFollowUp = () => {
    const notes = prompt("Add follow-up notes", entry.followUpNotes);
    if (notes !== null) onFollowUp?.(notes);
  };

  return (
    <article className={`entry-card priority-${entry.priority.toLowerCase()}`}>
      <div className="entry-head">
        <div>
          <h3>{displayLocation(entry)}</h3>
          <div className="card-status-line">
            <StatusPill status={entry.conditionStatus} />
            <span>{entry.reason}</span>
          </div>
        </div>
        <span className="badge">{entry.priority}</span>
      </div>
      {entry.photoDataUrl && <img className="thumb" src={entry.photoDataUrl} alt="Uploaded damage" />}
      <dl>
        <div><dt>Reported</dt><dd>{formatShortDate(entry.dateReported)} by {entry.reportedBy || "Unknown"}</dd></div>
        <div><dt>Aisle</dt><dd>{entry.aisle || "Not set"}</dd></div>
        <div><dt>Side</dt><dd>{entry.cantileverSide}</dd></div>
        <div><dt>Repaired</dt><dd>{entry.dateRepaired ? `${formatShortDate(entry.dateRepaired)} by ${entry.repairedBy || "Unknown"}` : "Not completed"}</dd></div>
      </dl>
      {entry.notes && <p className="notes">{entry.notes}</p>}
      {entry.followUpNeeded && <p className="follow">Follow-up: {entry.followUpNotes || "Needed"}</p>}
      <div className="actions">
        <button onClick={() => onEdit(entry)}>Edit</button>
        {onMarkReplaced && entry.conditionStatus !== "Replaced" && <button className="primary" onClick={onMarkReplaced}>Mark Replaced</button>}
        {onFollowUp && <button onClick={addFollowUp}>Add Follow-Up</button>}
        {onDelete && <button className="danger" onClick={() => onDelete(entry.id)}>Delete</button>}
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill status-${statusClass(status)}`}>{shortStatus(status)}</span>;
}

function AnalyticsPage({ stats }: { stats: ReturnType<typeof buildAnalytics>; entries: CantileverEntry[] }) {
  return (
    <section className="stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Repeat damage review</p>
          <h2>{stats.attentionLocations.length} location(s) need attention</h2>
          <p>Attention means 3 or more total entries at the same rack location.</p>
        </div>
      </div>
      <div className="stat-grid">
        <Stat label="Damaged" value={stats.open.length} tone="danger" />
        <Stat label="Monitor only" value={stats.monitored.length} />
        <Stat label="Replaced" value={stats.replaced.length} />
        <Stat label="Repeat locations" value={stats.repeatLocations.length} />
      </div>
      <div className="split">
        <Panel title="Attention Locations"><MiniList items={stats.attentionLocations} empty="No location has 3 or more entries." /></Panel>
        <Panel title="Top Repeat Locations"><MiniList items={stats.repeatLocations} empty="No repeat locations yet." /></Panel>
        <Panel title="Top Repeat Aisles"><MiniList items={stats.topAisles} empty="No aisle data yet." /></Panel>
        <Panel title="Top Reasons"><MiniList items={stats.topReasons} empty="No reasons yet." /></Panel>
        <Panel title="Damaged vs Monitored vs Replaced"><BarList items={stats.statusCounts} /></Panel>
        <Panel title="Replacements by Month"><BarList items={stats.replacementMonths} /></Panel>
        <Panel title="Replacements by Quarter"><BarList items={stats.replacementQuarters} /></Panel>
        <Panel title="Replacements by Year"><BarList items={stats.replacementYears} /></Panel>
        <Panel title="Locations Hit More Than Once"><MiniList items={stats.repeatLocations} empty="No repeats yet." /></Panel>
      </div>
    </section>
  );
}

function SearchPage({ entries, onEdit, onDelete }: { entries: CantileverEntry[]; onEdit: (entry: CantileverEntry) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const filtered = entries.filter((entry) => {
    const haystack = [
      entry.fullLocation,
      entry.aisle,
      entry.sectionBay,
      entry.level,
      entry.reason,
      entry.repairedBy,
      entry.reportedBy,
      entry.notes,
      entry.followUpNotes,
    ].join(" ");
    return (!query || fieldIncludes(haystack, query)) && (!date || entry.dateReported === date || entry.dateRepaired === date);
  });
  return (
    <section className="stack">
      <div className="panel">
        <h2>Search / History</h2>
        <div className="filter-grid">
          <Field label="Search" placeholder="Location, aisle, section, level, reason, person, notes" value={query} onChange={setQuery} />
          <Field label="Date" type="date" value={date} onChange={setDate} />
        </div>
      </div>
      <div className="cards">
        {filtered.map((entry) => <EntryCard key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />)}
      </div>
      {!filtered.length && <Empty text="No history matches your search." />}
    </section>
  );
}

function SettingsPage({
  settings,
  entries,
  onSettings,
  onRefresh,
}: {
  settings: SettingsData;
  entries: CantileverEntry[];
  onSettings: (settings: SettingsData) => void;
  onRefresh: () => void;
}) {
  const updateList = (key: keyof SettingsData, text: string) => {
    const next = { ...settings, [key]: text.split("\n").map((item) => item.trim()).filter(Boolean) };
    storageService.saveSettings(next);
    onSettings(next);
  };

  const exportCsv = () => {
    const blob = new Blob([entriesToCsv(entries)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cantilever-tracker-${today()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = csvToEntries(String(reader.result ?? ""));
      if (!imported.length) {
        alert("No entries found in that CSV.");
        return;
      }
      storageService.saveEntries([...imported, ...entries]);
      onRefresh();
      alert(`Imported ${imported.length} entries.`);
    };
    reader.readAsText(file);
  };

  const clearDemo = () => {
    if (!confirm("Clear demo data? Your non-demo entries will stay.")) return;
    storageService.clearDemoData();
    onRefresh();
  };

  return (
    <section className="stack">
      <div className="panel warning">
        <h2>Data Storage Warning</h2>
        <p>
          Version 1 saves data only on this device and browser. It does not automatically sync between associates,
          phones, or computers until a shared cloud backend is added.
        </p>
      </div>
      <div className="split">
        <SettingsList title="Associate Name List" value={settings.associates} onChange={(v) => updateList("associates", v)} />
        <SettingsList title="Reason Dropdown List" value={settings.reasons} onChange={(v) => updateList("reasons", v)} />
        <SettingsList title="Repair Action Dropdown List" value={settings.repairActions} onChange={(v) => updateList("repairActions", v)} />
        <SettingsList title="Priority List" value={settings.priorities} onChange={(v) => updateList("priorities", v)} />
        <SettingsList title="Common Aisle / Location List" value={settings.commonLocations} onChange={(v) => updateList("commonLocations", v)} />
      </div>
      <div className="panel">
        <h2>Backup / Maintenance</h2>
        <div className="actions wrap">
          <button className="primary" onClick={exportCsv}>Export CSV</button>
          <label className="file-button">Import CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} /></label>
          <button className="danger" onClick={clearDemo}>Clear Demo Data</button>
          <button onClick={() => { storageService.resetDemoData(); onRefresh(); }}>Reload Demo Data</button>
        </div>
        <p className="muted">App version {VERSION}</p>
      </div>
    </section>
  );
}

function SettingsList({ title, value, onChange }: { title: string; value: string[]; onChange: (value: string) => void }) {
  return (
    <label className="panel settings-list">
      <h2>{title}</h2>
      <textarea value={value.join("\n")} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="panel"><h2>{title}</h2>{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  list,
  compact,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  list?: string;
  compact?: boolean;
  wide?: boolean;
}) {
  return (
    <label className={`field ${compact ? "compact" : ""} ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} list={list} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  compact,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <label className={`field ${compact ? "compact" : ""}`}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option || "Any"}</option>)}
      </select>
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

export default App;
