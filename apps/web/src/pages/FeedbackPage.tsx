import { useState } from "react";
import "./ToolPages.css";

type FeedbackType = "bug" | "feature" | "improvement" | "other";

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "🐛 Bug Report",
  feature: "✨ Feature Request",
  improvement: "⚡ Improvement",
  other: "💬 Other",
};

const recentFeedback = [
  { id: 1, type: "feature" as FeedbackType, title: "Bulk export to CSV from Dashboard", votes: 12, status: "planned" },
  { id: 2, type: "bug" as FeedbackType, title: "Sync drawer closes on outside click accidentally", votes: 8, status: "in-progress" },
  { id: 3, type: "improvement" as FeedbackType, title: "Add keyboard shortcut to trigger manual sync", votes: 6, status: "reviewing" },
  { id: 4, type: "feature" as FeedbackType, title: "Dark mode support", votes: 21, status: "planned" },
  { id: 5, type: "improvement" as FeedbackType, title: "Show HubSpot contact link in sync detail drawer", votes: 4, status: "reviewing" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  planned: { bg: "var(--accent-light)", color: "var(--accent)" },
  "in-progress": { bg: "var(--warning-bg)", color: "var(--warning)" },
  reviewing: { bg: "#ede9fe", color: "#6d28d9" },
  shipped: { bg: "var(--success-bg)", color: "var(--success)" },
};

export function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>("feature");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [votes, setVotes] = useState<Record<number, boolean>>({});

  const submit = () => {
    if (!title.trim() || !description.trim()) return;
    setSubmitted(true);
    setTitle(""); setDescription("");
    setTimeout(() => setSubmitted(false), 4000);
  };

  const toggleVote = (id: number) => setVotes(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <div>
          <h1 className="tool-page-title">Feedback</h1>
          <p className="tool-page-subtitle">Help shape the future of Dench CRM</p>
        </div>
      </div>

      <div className="feedback-grid">
        {/* Submit form */}
        <div>
          <div className="tool-card">
            <div className="tool-card-title" style={{ marginBottom: "1.25rem" }}>Submit Feedback</div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              {(Object.keys(TYPE_LABELS) as FeedbackType[]).map(t => (
                <button key={t} className={`btn-secondary ${type === t ? "active" : ""}`}
                  style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
                  onClick={() => setType(t)}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <div className="compose-field">
              <label className="compose-label">Title</label>
              <input className="compose-input" placeholder="Short summary of your feedback..." value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="compose-field">
              <label className="compose-label">Description</label>
              <textarea className="compose-textarea" rows={5}
                placeholder="Describe the issue or idea in detail. Include steps to reproduce for bugs."
                value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            {submitted && (
              <div style={{ background: "var(--success-bg)", color: "var(--success)", border: "1px solid rgba(5,150,105,.2)", borderRadius: "var(--radius-sm)", padding: "0.65rem 1rem", fontSize: "0.83rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                ✓ Thanks! Your feedback has been submitted.
              </div>
            )}

            <div className="compose-footer">
              <button className="btn-primary" disabled={!title.trim() || !description.trim()} onClick={submit}>
                Submit Feedback
              </button>
            </div>
          </div>
        </div>

        {/* Community board */}
        <div>
          <div className="tool-card-title" style={{ marginBottom: "1rem" }}>Community Board</div>
          <div className="tool-list">
            {recentFeedback.map(f => {
              const voted = !!votes[f.id];
              const s = STATUS_STYLE[f.status] ?? STATUS_STYLE.reviewing;
              return (
                <div key={f.id} className="tool-list-item">
                  <div className="tool-list-item-left">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600 }}>{TYPE_LABELS[f.type]}</span>
                    </div>
                    <div className="tool-list-item-title">{f.title}</div>
                  </div>
                  <div className="tool-list-item-right">
                    <span style={{ background: s.bg, color: s.color, fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "9999px", textTransform: "capitalize" }}>
                      {f.status}
                    </span>
                    <button
                      className={`feedback-vote-btn ${voted ? "voted" : ""}`}
                      onClick={() => toggleVote(f.id)}
                      title={voted ? "Remove vote" : "Upvote"}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill={voted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                      {f.votes + (voted ? 1 : 0)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
