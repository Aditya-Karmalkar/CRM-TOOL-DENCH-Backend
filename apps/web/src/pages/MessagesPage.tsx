import { useState } from "react";
import "./ToolPages.css";
import "./Messages.css";

interface Message {
  id: number;
  from: string;
  fromEmail: string;
  avatar: string;
  subject: string;
  preview: string;
  time: string;
  read: boolean;
  tag: "sales" | "support" | "internal" | "notification";
  body: string;
}

const MESSAGES: Message[] = [
  { id: 1, from: "Yamini Rangan", fromEmail: "yamini@hubspot.com", avatar: "YR", subject: "Re: CRM Integration Setup", preview: "Thanks for reaching out! I've reviewed the integration docs and everything looks good...", time: "10:32 AM", read: false, tag: "sales", body: "Thanks for reaching out! I've reviewed the integration docs and everything looks good on our end. Let's schedule a call this week to finalize the setup. I'm available Tuesday or Thursday afternoon.\n\nBest,\nYamini" },
  { id: 2, from: "Dench Sync Engine", fromEmail: "noreply@dench.ai", avatar: "DS", subject: "Sync completed: 12 new contacts", preview: "Your latest Gmail sync processed 12 new emails and extracted 8 unique contacts...", time: "9:15 AM", read: false, tag: "notification", body: "Your latest Gmail sync processed 12 new emails and extracted 8 unique contacts.\n\n• 10 synced successfully\n• 2 failed (HubSpot token expired)\n\nVisit the Dashboard to retry failed syncs." },
  { id: 3, from: "Stewart Butterfield", fromEmail: "stewart@slack.com", avatar: "SB", subject: "Partnership opportunity", preview: "Hi, I wanted to follow up on our conversation at the conference last month...", time: "Yesterday", read: true, tag: "sales", body: "Hi,\n\nI wanted to follow up on our conversation at the conference last month. We're exploring deeper integrations between Slack and CRM tools like yours.\n\nWould love to connect this week.\n\nStewart" },
  { id: 4, from: "Kumar Abhirup", fromEmail: "kumar@dench.ai", avatar: "KA", subject: "New feature: Lightpanda scraper v2", preview: "We've shipped an update to the headless scraper — it now supports parallel crawling...", time: "Yesterday", read: true, tag: "internal", body: "We've shipped an update to the headless scraper — it now supports parallel crawling of up to 5 LinkedIn profiles simultaneously.\n\nThis should reduce scraper latency by ~60%. Deploy when ready.\n\n— Kumar" },
  { id: 5, from: "Edo Liberty", fromEmail: "edo@pinecone.io", avatar: "EL", subject: "Vector search for CRM contacts", preview: "Hey! Wanted to share how Pinecone could power semantic search across your contact database...", time: "Mon", read: true, tag: "sales", body: "Hey!\n\nWanted to share how Pinecone could power semantic search across your contact database. Instead of exact-match search, you'd be able to find contacts by meaning — e.g. 'enterprise buyers in SaaS'.\n\nHappy to do a quick demo.\n\nEdo" },
  { id: 6, from: "Support Bot", fromEmail: "support@dench.ai", avatar: "SB", subject: "Your HubSpot token was refreshed", preview: "We automatically refreshed your HubSpot OAuth token to keep your syncs running...", time: "Sun", read: true, tag: "notification", body: "We automatically refreshed your HubSpot OAuth token to keep your syncs running smoothly.\n\nNo action needed. If you experience any issues, visit Settings to reconnect." },
];

const TAG_COLORS: Record<Message["tag"], string> = {
  sales: "#6366f1",
  support: "#059669",
  internal: "#d97706",
  notification: "var(--muted-light)",
};

export function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>(MESSAGES);
  const [activeId, setActiveId] = useState<number | null>(MESSAGES[0].id);
  const [filter, setFilter] = useState<"all" | Message["tag"]>("all");
  const [search, setSearch] = useState("");

  const filtered = messages.filter(m => {
    if (filter !== "all" && m.tag !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return m.from.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q) || m.preview.toLowerCase().includes(q);
    }
    return true;
  });

  const active = messages.find(m => m.id === activeId) ?? null;
  const unread = messages.filter(m => !m.read).length;

  const openMessage = (id: number) => {
    setActiveId(id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <div>
          <h1 className="tool-page-title">Messages</h1>
          <p className="tool-page-subtitle">{unread} unread · {messages.length} total</p>
        </div>
        <div className="tool-page-actions">
          <button className="btn-primary">+ Compose</button>
        </div>
      </div>

      <div className="messages-layout">
        {/* Sidebar */}
        <div className="messages-sidebar">
          <div className="messages-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="messages-search" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="messages-filter-row">
            {(["all", "sales", "support", "internal", "notification"] as const).map(f => (
              <button key={f} className={`messages-filter-pill ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="messages-list">
            {filtered.length === 0 ? (
              <div className="tool-empty-state">No messages found</div>
            ) : filtered.map(m => (
              <div key={m.id} className={`message-row ${activeId === m.id ? "active" : ""} ${!m.read ? "unread" : ""}`} onClick={() => openMessage(m.id)}>
                <div className="message-avatar" style={{ background: !m.read ? "var(--accent)" : "var(--surface-2)", color: !m.read ? "white" : "var(--muted)" }}>
                  {m.avatar}
                </div>
                <div className="message-row-body">
                  <div className="message-row-top">
                    <span className="message-from">{m.from}</span>
                    <span className="message-time">{m.time}</span>
                  </div>
                  <div className="message-subject">{m.subject}</div>
                  <div className="message-preview">{m.preview}</div>
                </div>
                <span className="message-tag-dot" style={{ background: TAG_COLORS[m.tag] }} title={m.tag} />
              </div>
            ))}
          </div>
        </div>

        {/* Detail pane */}
        <div className="messages-detail">
          {active ? (
            <>
              <div className="message-detail-header">
                <div>
                  <div className="message-detail-subject">{active.subject}</div>
                  <div className="message-detail-meta">
                    <span className="message-detail-from">{active.from}</span>
                    <span style={{ color: "var(--muted-light)" }}>·</span>
                    <span style={{ color: "var(--muted-light)", fontSize: "0.78rem" }}>{active.fromEmail}</span>
                    <span style={{ color: "var(--muted-light)" }}>·</span>
                    <span style={{ color: "var(--muted-light)", fontSize: "0.78rem" }}>{active.time}</span>
                  </div>
                </div>
                <span className="tool-tag" style={{ color: TAG_COLORS[active.tag], borderColor: TAG_COLORS[active.tag] + "44" }}>
                  {active.tag}
                </span>
              </div>
              <div className="message-detail-body">{active.body}</div>
              <div className="message-detail-reply">
                <textarea className="compose-textarea" rows={3} placeholder={`Reply to ${active.from}...`} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
                  <button className="btn-primary" style={{ fontSize: "0.85rem" }}>Send Reply</button>
                </div>
              </div>
            </>
          ) : (
            <div className="tool-empty-state" style={{ marginTop: "4rem" }}>Select a message to read</div>
          )}
        </div>
      </div>
    </div>
  );
}
