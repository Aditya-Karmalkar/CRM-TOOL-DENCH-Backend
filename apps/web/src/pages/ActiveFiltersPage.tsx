import { useState } from "react";
import "./ToolPages.css";

type FilterStatus = "synced" | "pending" | "failed" | "all";

interface SavedFilter {
  id: number;
  name: string;
  status: FilterStatus;
  dateFrom: string;
  dateTo: string;
  createdAt: string;
  resultCount: number;
}

const INITIAL_FILTERS: SavedFilter[] = [
  { id: 1, name: "Failed syncs this week", status: "failed", dateFrom: "", dateTo: "", createdAt: "2 days ago", resultCount: 3 },
  { id: 2, name: "Pending from HubSpot", status: "pending", dateFrom: "", dateTo: "", createdAt: "4 days ago", resultCount: 7 },
  { id: 3, name: "All synced in January", status: "synced", dateFrom: "2026-01-01", dateTo: "2026-01-31", createdAt: "1 week ago", resultCount: 24 },
  { id: 4, name: "Recent activity", status: "all", dateFrom: "2026-05-01", dateTo: "", createdAt: "2 weeks ago", resultCount: 41 },
];

const STATUS_COLORS: Record<FilterStatus, string> = {
  all: "var(--muted)",
  synced: "var(--success)",
  pending: "var(--warning)",
  failed: "var(--danger)",
};

const STATUS_BG: Record<FilterStatus, string> = {
  all: "var(--surface-2)",
  synced: "var(--success-bg)",
  pending: "var(--warning-bg)",
  failed: "var(--danger-bg)",
};

export function ActiveFiltersPage() {
  const [filters, setFilters] = useState<SavedFilter[]>(INITIAL_FILTERS);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStatus, setNewStatus] = useState<FilterStatus>("all");
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");

  const deleteFilter = (id: number) => setFilters(prev => prev.filter(f => f.id !== id));

  const saveFilter = () => {
    if (!newName.trim()) return;
    setFilters(prev => [...prev, {
      id: Date.now(),
      name: newName.trim(),
      status: newStatus,
      dateFrom: newFrom,
      dateTo: newTo,
      createdAt: "Just now",
      resultCount: 0,
    }]);
    setNewName(""); setNewStatus("all"); setNewFrom(""); setNewTo("");
    setShowNew(false);
  };

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <div>
          <h1 className="tool-page-title">Active Filters</h1>
          <p className="tool-page-subtitle">Saved filter presets for your sync dashboard</p>
        </div>
        <div className="tool-page-actions">
          <button className="btn-primary" onClick={() => setShowNew(v => !v)}>+ Save Filter</button>
        </div>
      </div>

      {showNew && (
        <div className="tool-card" style={{ marginBottom: "1rem" }}>
          <div className="tool-card-title" style={{ marginBottom: "1rem" }}>New Filter Preset</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="compose-field" style={{ gridColumn: "1 / -1" }}>
              <label className="compose-label">Filter Name</label>
              <input className="compose-input" placeholder="e.g. Failed syncs this week" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="compose-field">
              <label className="compose-label">Status</label>
              <select className="compose-input" value={newStatus} onChange={e => setNewStatus(e.target.value as FilterStatus)}>
                <option value="all">All</option>
                <option value="synced">Synced</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="compose-field">
              <label className="compose-label">Date From</label>
              <input type="date" className="compose-input" value={newFrom} onChange={e => setNewFrom(e.target.value)} />
            </div>
            <div className="compose-field">
              <label className="compose-label">Date To</label>
              <input type="date" className="compose-input" value={newTo} onChange={e => setNewTo(e.target.value)} />
            </div>
          </div>
          <div className="compose-footer">
            <button className="btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
            <button className="btn-primary" disabled={!newName.trim()} onClick={saveFilter}>Save Filter</button>
          </div>
        </div>
      )}

      <div className="tool-list">
        {filters.length === 0 ? (
          <div className="tool-empty-state">No saved filters yet. Create one to quickly access filtered views.</div>
        ) : filters.map(f => (
          <div key={f.id} className="tool-list-item">
            <div className="tool-list-item-left">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ background: STATUS_BG[f.status], color: STATUS_COLORS[f.status], fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "9999px", textTransform: "capitalize" }}>
                  {f.status}
                </span>
                <div className="tool-list-item-title">{f.name}</div>
              </div>
              <div className="tool-list-item-sub">
                {f.dateFrom && <span>From: {f.dateFrom}</span>}
                {f.dateTo && <span>To: {f.dateTo}</span>}
                {!f.dateFrom && !f.dateTo && <span>No date range</span>}
                <span>·</span>
                <span>{f.resultCount} results</span>
                <span>·</span>
                <span>Created {f.createdAt}</span>
              </div>
            </div>
            <div className="tool-list-item-right">
              <a href={`/?status=${f.status}${f.dateFrom ? `&from=${f.dateFrom}` : ""}${f.dateTo ? `&to=${f.dateTo}` : ""}`}
                className="btn-secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem", textDecoration: "none" }}>
                Apply
              </a>
              <button className="btn-secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem", color: "var(--danger)" }}
                onClick={() => deleteFilter(f.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
