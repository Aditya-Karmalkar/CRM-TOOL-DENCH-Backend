import { useState } from "react";
import "./ToolPages.css";

const templates = [
  { id: 1, name: "Follow-up after meeting", subject: "Great connecting with you", tags: ["sales"], lastUsed: "2 days ago" },
  { id: 2, name: "Cold outreach", subject: "Quick question about {{company}}", tags: ["outreach"], lastUsed: "5 days ago" },
  { id: 3, name: "Deal closing", subject: "Ready to move forward?", tags: ["sales", "closing"], lastUsed: "1 week ago" },
  { id: 4, name: "Re-engagement", subject: "Checking in — {{firstName}}", tags: ["nurture"], lastUsed: "2 weeks ago" },
];

const drafts = [
  { id: 1, to: "sarah@acme.com", subject: "Partnership proposal", preview: "Hi Sarah, following up on our conversation last week...", time: "10 min ago" },
  { id: 2, to: "team@hubspot.com", subject: "Integration feedback", preview: "We've been using the API and wanted to share some thoughts...", time: "1 hour ago" },
];

export function EmailPage() {
  const [activeTab, setActiveTab] = useState<"compose" | "templates" | "drafts">("compose");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <div>
          <h1 className="tool-page-title">Email</h1>
          <p className="tool-page-subtitle">Compose and manage outreach emails</p>
        </div>
        <div className="tool-page-actions">
          <button className="btn-primary" onClick={() => setActiveTab("compose")}>+ Compose</button>
        </div>
      </div>

      <div className="tool-tabs">
        {(["compose", "templates", "drafts"] as const).map((t) => (
          <button key={t} className={`tool-tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "drafts" && <span className="tool-tab-badge">{drafts.length}</span>}
          </button>
        ))}
      </div>

      {activeTab === "compose" && (
        <div className="tool-card">
          <div className="compose-field">
            <label className="compose-label">To</label>
            <input className="compose-input" placeholder="recipient@company.com" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="compose-field">
            <label className="compose-label">Subject</label>
            <input className="compose-input" placeholder="Email subject..." value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="compose-field">
            <label className="compose-label">Body</label>
            <textarea className="compose-textarea" rows={10} placeholder="Write your email..." value={body} onChange={e => setBody(e.target.value)} />
          </div>
          <div className="compose-footer">
            <button className="btn-secondary">Save Draft</button>
            <button className="btn-primary" disabled={!to || !subject || !body}>Send Email</button>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="tool-list">
          {templates.map((t) => (
            <div key={t.id} className="tool-list-item">
              <div className="tool-list-item-left">
                <div className="tool-list-item-title">{t.name}</div>
                <div className="tool-list-item-sub">{t.subject}</div>
              </div>
              <div className="tool-list-item-right">
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {t.tags.map(tag => <span key={tag} className="tool-tag">{tag}</span>)}
                </div>
                <span className="tool-list-item-meta">{t.lastUsed}</span>
                <button className="btn-secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem" }}
                  onClick={() => { setSubject(t.subject); setActiveTab("compose"); }}>
                  Use
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "drafts" && (
        <div className="tool-list">
          {drafts.map((d) => (
            <div key={d.id} className="tool-list-item">
              <div className="tool-list-item-left">
                <div className="tool-list-item-title">{d.subject}</div>
                <div className="tool-list-item-sub">To: {d.to} · {d.preview}</div>
              </div>
              <div className="tool-list-item-right">
                <span className="tool-list-item-meta">{d.time}</span>
                <button className="btn-secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem" }}
                  onClick={() => { setTo(d.to); setSubject(d.subject); setActiveTab("compose"); }}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
