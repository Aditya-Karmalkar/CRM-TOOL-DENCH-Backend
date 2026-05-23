import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { SyncedEmail } from "@crm/shared";
import "./ToolPages.css";
import "./Workspace.css";

export function WorkspacePage() {
  const [syncs, setSyncs] = useState<SyncedEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiFetch<{ syncs: SyncedEmail[] }>("/syncs")
      .then(d => setSyncs(d.syncs))
      .finally(() => setLoading(false));
  }, []);

  const recent = syncs.slice(0, 5);
  const synced = syncs.filter(s => s.syncStatus === "synced").length;
  const failed = syncs.filter(s => s.syncStatus === "failed").length;
  const pending = syncs.filter(s => s.syncStatus === "pending").length;

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <div>
          <h1 className="tool-page-title">Dench CRM Syncs</h1>
          <p className="tool-page-subtitle">Workspace overview of your active sync pipeline</p>
        </div>
        <div className="tool-page-actions">
          <a href="/" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.85rem" }}>Open Dashboard →</a>
        </div>
      </div>

      <div className="tool-stats-row">
        <div className="tool-stat-card">
          <div className="tool-stat-value">{syncs.length}</div>
          <div className="tool-stat-label">Total Syncs</div>
        </div>
        <div className="tool-stat-card">
          <div className="tool-stat-value" style={{ color: "var(--success)" }}>{synced}</div>
          <div className="tool-stat-label">Synced</div>
        </div>
        <div className="tool-stat-card">
          <div className="tool-stat-value" style={{ color: "var(--warning)" }}>{pending}</div>
          <div className="tool-stat-label">Pending</div>
        </div>
        <div className="tool-stat-card">
          <div className="tool-stat-value" style={{ color: failed > 0 ? "var(--danger)" : "var(--muted-light)" }}>{failed}</div>
          <div className="tool-stat-label">Failed</div>
        </div>
      </div>

      <div className="workspace-grid">
        {/* Recent syncs */}
        <div className="tool-card">
          <div className="tool-card-title" style={{ marginBottom: "1rem" }}>Recent Syncs</div>
          {loading ? (
            <div className="tool-loading">Loading...</div>
          ) : recent.length === 0 ? (
            <div className="tool-empty-state">No syncs yet. Run a sync from the Dashboard.</div>
          ) : (
            <div className="workspace-sync-list">
              {recent.map(s => (
                <div key={s.id} className="workspace-sync-row">
                  <div className="workspace-sync-left">
                    <span className={`ws-status-dot ws-dot-${s.syncStatus}`} />
                    <div>
                      <div className="workspace-sync-subject">{s.subject}</div>
                      <div className="workspace-sync-from">{s.fromEmail}</div>
                    </div>
                  </div>
                  <div className="workspace-sync-right">
                    <span className={`ws-badge ws-badge-${s.syncStatus}`}>{s.syncStatus}</span>
                    <span className="tool-list-item-meta">
                      {new Date(s.receivedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline health */}
        <div className="tool-card">
          <div className="tool-card-title" style={{ marginBottom: "1rem" }}>Pipeline Health</div>
          {syncs.length === 0 ? (
            <div className="tool-empty-state">No data yet</div>
          ) : (
            <>
              <div className="ws-health-bar-wrap">
                <div className="ws-health-bar">
                  <div className="ws-health-segment ws-seg-synced" style={{ width: `${(synced / syncs.length) * 100}%` }} title={`Synced: ${synced}`} />
                  <div className="ws-health-segment ws-seg-pending" style={{ width: `${(pending / syncs.length) * 100}%` }} title={`Pending: ${pending}`} />
                  <div className="ws-health-segment ws-seg-failed" style={{ width: `${(failed / syncs.length) * 100}%` }} title={`Failed: ${failed}`} />
                </div>
              </div>
              <div className="ws-health-legend">
                <span className="ws-legend-item"><span className="ws-legend-dot" style={{ background: "var(--success)" }} />Synced ({synced})</span>
                <span className="ws-legend-item"><span className="ws-legend-dot" style={{ background: "var(--warning)" }} />Pending ({pending})</span>
                <span className="ws-legend-item"><span className="ws-legend-dot" style={{ background: "var(--danger)" }} />Failed ({failed})</span>
              </div>

              <div style={{ marginTop: "1.5rem" }}>
                <div className="tool-card-title" style={{ marginBottom: "0.75rem" }}>Success Rate</div>
                <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--text-dark)", letterSpacing: "-0.03em" }}>
                  {syncs.length > 0 ? Math.round((synced / syncs.length) * 100) : 0}%
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  of all processed emails synced to HubSpot
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
