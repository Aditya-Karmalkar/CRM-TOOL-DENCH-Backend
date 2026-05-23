import { useState } from "react";
import "./ToolPages.css";

type AutomationStatus = "active" | "paused" | "draft";

interface Automation {
  id: number;
  name: string;
  trigger: string;
  action: string;
  status: AutomationStatus;
  runs: number;
  lastRun: string;
}

const initialAutomations: Automation[] = [
  { id: 1, name: "New contact follow-up", trigger: "Contact added", action: "Send follow-up email after 1 day", status: "active", runs: 42, lastRun: "2 hours ago" },
  { id: 2, name: "Deal stage notification", trigger: "Deal status → qualified", action: "Notify team via email", status: "active", runs: 18, lastRun: "1 day ago" },
  { id: 3, name: "Re-engagement sequence", trigger: "No activity for 30 days", action: "Send re-engagement email", status: "paused", runs: 7, lastRun: "1 week ago" },
  { id: 4, name: "Sync failure alert", trigger: "Sync fails 3x", action: "Send alert to admin", status: "draft", runs: 0, lastRun: "Never" },
];

const STATUS_COLOR: Record<AutomationStatus, string> = {
  active: "var(--success)",
  paused: "var(--warning)",
  draft: "var(--muted-light)",
};

export function AutomationPage() {
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations);

  const toggle = (id: number) => {
    setAutomations(prev => prev.map(a =>
      a.id === id ? { ...a, status: a.status === "active" ? "paused" : "active" } : a
    ));
  };

  const active = automations.filter(a => a.status === "active").length;

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <div>
          <h1 className="tool-page-title">Automation</h1>
          <p className="tool-page-subtitle">Automate repetitive CRM tasks and workflows</p>
        </div>
        <div className="tool-page-actions">
          <button className="btn-primary">+ New Automation</button>
        </div>
      </div>

      <div className="tool-stats-row">
        <div className="tool-stat-card">
          <div className="tool-stat-value">{automations.length}</div>
          <div className="tool-stat-label">Total</div>
        </div>
        <div className="tool-stat-card">
          <div className="tool-stat-value" style={{ color: "var(--success)" }}>{active}</div>
          <div className="tool-stat-label">Active</div>
        </div>
        <div className="tool-stat-card">
          <div className="tool-stat-value">{automations.reduce((s, a) => s + a.runs, 0)}</div>
          <div className="tool-stat-label">Total Runs</div>
        </div>
      </div>

      <div className="tool-list">
        {automations.map((a) => (
          <div key={a.id} className="tool-list-item">
            <div className="tool-list-item-left">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[a.status], flexShrink: 0 }} />
                <div className="tool-list-item-title">{a.name}</div>
              </div>
              <div className="tool-list-item-sub">
                <span className="tool-tag">Trigger: {a.trigger}</span>
                <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>→ {a.action}</span>
              </div>
            </div>
            <div className="tool-list-item-right">
              <span className="tool-list-item-meta">{a.runs} runs · {a.lastRun}</span>
              <button
                className={`btn-secondary`}
                style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem", color: a.status === "active" ? "var(--warning)" : "var(--success)" }}
                onClick={() => toggle(a.id)}
                disabled={a.status === "draft"}
              >
                {a.status === "active" ? "Pause" : a.status === "paused" ? "Resume" : "Draft"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
