import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWidgets } from '../context/WidgetContext';
import { DenchLogo } from '../assets/DenchLogo';
import './Layout.css';

// SVG Icons
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9"></rect>
    <rect x="14" y="3" width="7" height="5"></rect>
    <rect x="14" y="12" width="7" height="9"></rect>
    <rect x="3" y="16" width="7" height="5"></rect>
  </svg>
);

const IconPeople = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const IconConnect = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const IconMessage = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const IconEmail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const IconAutomation = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const IconAnalytics = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

const IconIntegration = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

const IconHelp = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const IconFeedback = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const IconSignal = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);
const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const IconShare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
    <polyline points="16 6 12 2 8 6"></polyline>
    <line x1="12" y1="2" x2="12" y2="15"></line>
  </svg>
);

const IconPlusUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="8.5" cy="7" r="4"></circle>
    <line x1="20" y1="8" x2="20" y2="14"></line>
    <line x1="23" y1="11" x2="17" y2="11"></line>
  </svg>
);

export function Layout() {
  const { user, signOut } = useAuth();
  const { widgets, toggle, reset, panelOpen, openPanel, closePanel, groups, labels } = useWidgets();

  const [shareOpen, setShareOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [shareLink] = useState(`${window.location.origin}/dashboard`);
  const [shareCopied, setShareCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [notifRead, setNotifRead] = useState<number[]>([]);

  const notifications = [
    { id: 1, title: "Sync completed", body: "12 new contacts extracted from Gmail.", time: "2 min ago", type: "success" },
    { id: 2, title: "HubSpot token refreshed", body: "OAuth token auto-renewed successfully.", time: "1 hour ago", type: "info" },
    { id: 3, title: "Sync failure", body: "3 emails failed to sync — retry required.", time: "3 hours ago", type: "error" },
    { id: 4, title: "New contact added", body: "Yamini Rangan from HubSpot was synced.", time: "Yesterday", type: "success" },
    { id: 5, title: "Lightpanda scrape done", body: "Company profile for Pinecone loaded.", time: "Yesterday", type: "info" },
  ];

  const unreadCount = notifications.filter(n => !notifRead.includes(n.id)).length;

  const copyShareLink = () => {
    void navigator.clipboard.writeText(shareLink);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const sendInvite = () => {
    if (!inviteEmail.trim()) return;
    setInviteSent(true);
    setInviteEmail("");
    setTimeout(() => setInviteSent(false), 3000);
  };

  const closeAll = () => {
    setShareOpen(false);
    setNotifOpen(false);
    setAddUserOpen(false);
  };

  const NOTIF_COLORS: Record<string, string> = {
    success: "var(--success)",
    error: "var(--danger)",
    info: "#6366f1",
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        {/* Logo Section */}
        <div className="sidebar-header">
          <DenchLogo size={34} />
          <div className="logo-text-wrapper">
            <div className="logo-title">Dench CRM</div>
            <div className="logo-subtitle">AI Sync Engine</div>
          </div>
          <button className="collapse-btn" aria-label="Collapse Menu">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>
          </button>
        </div>

        {/* Search Box */}
        <div className="search-box">
          <IconSearch />
          <input type="text" placeholder="Search..." disabled />
          <span className="search-shortcut">⌘K</span>
        </div>

        {/* Navigation Wrapper */}
        <div className="navigation-scrollable">
          {/* Main Menu */}
          <div className="menu-group">
            <div className="menu-label">Main Menu</div>
            <nav className="menu-nav">
              <NavLink to="/" end className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <IconDashboard />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/people" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <IconPeople />
                <span>People</span>
              </NavLink>
              <NavLink to="/signals" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <IconSignal />
                <span>Deal Signals</span>
              </NavLink>
              <NavLink to="/connect" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <IconConnect />
                <span>Connect Gmail</span>
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <IconSettings />
                <span>Settings</span>
              </NavLink>
              <NavLink to="/messages" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <IconMessage />
                <span>Messages</span>
                <span className="menu-badge badge-neutral">33</span>
              </NavLink>
            </nav>
          </div>

          <div className="menu-group">
            <div className="menu-label">Tools</div>
            <nav className="menu-nav">
              <NavLink to="/email" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <IconEmail />
                <span>Email</span>
              </NavLink>
              <NavLink to="/automation" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <IconAutomation />
                <span>Automation</span>
              </NavLink>
              <NavLink to="/analytics" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <IconAnalytics />
                <span>Analytics</span>
              </NavLink>
              <NavLink to="/integrations" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <IconIntegration />
                <span>Integration</span>
              </NavLink>
            </nav>
          </div>

          {/* Workspaces */}
          <div className="menu-group">
            <div className="menu-label">Workspace</div>
            <nav className="menu-nav">
              <NavLink to="/workspace" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <span className="workspace-dot dot-blue"></span>
                <span>Dench CRM Syncs</span>
                <span className="menu-badge badge-neutral">5</span>
              </NavLink>
              <NavLink to="/active-filters" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <span className="workspace-dot dot-pink"></span>
                <span>Active Filters</span>
                <span className="menu-badge badge-neutral">4</span>
              </NavLink>
            </nav>
          </div>

          {/* Help Center */}
          <div className="menu-group group-footer">
            <nav className="menu-nav">
              <NavLink to="/help" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <IconHelp />
                <span>Help center</span>
              </NavLink>
              <NavLink to="/feedback" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                <IconFeedback />
                <span>Feedback</span>
              </NavLink>
            </nav>
          </div>
        </div>

        {/* DenchClaw CTA */}
        <a
          href="https://www.dench.com/claw"
          target="_blank"
          rel="noopener noreferrer"
          className="upgrade-box denchclaw-box"
          style={{ textDecoration: "none", display: "block" }}
        >
          <div className="upgrade-content">
            <div className="upgrade-icon" style={{ background: "#0f0f0f", borderRadius: "8px", padding: "6px", display: "flex" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <div className="upgrade-text">
              <div className="upgrade-title">Try DenchClaw</div>
              <div className="upgrade-desc">AI CRM on your Mac</div>
            </div>
            <div className="upgrade-arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        </a>

        {/* User bar */}
        <div className="user-bar">
          <div className="user-info">
            <div className="user-avatar-placeholder">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <div className="user-email" title={user?.email || ''}>
                {user?.email || 'user@example.com'}
              </div>
              <div className="user-role">Administrator</div>
            </div>
          </div>
          <button type="button" className="signout-btn" title="Sign out" onClick={() => void signOut()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>

      <main className="main">
        {/* Premium Top Bar */}
        <header className="top-header">
          <div className="top-header-left">
            <div className="breadcrumb">Pages / CRM Dashboard</div>
          </div>
          <div className="top-header-right">
            <button className="icon-header-btn" title="Share" onClick={() => { closeAll(); setShareOpen(v => !v); }}>
              <IconShare />
            </button>
            <button className="icon-header-btn" title="Notifications" onClick={() => { closeAll(); setNotifOpen(v => !v); }}>
              <IconBell />
              {unreadCount > 0 && <span className="bell-badge"></span>}
            </button>
            <div className="avatar-group-header">
              <div className="header-avatar avatar-1">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=40&h=40&q=80" alt="User 1" />
              </div>
              <div className="header-avatar avatar-2">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=40&h=40&q=80" alt="User 2" />
              </div>
              <div className="header-avatar avatar-3">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=40&h=40&q=80" alt="User 3" />
              </div>
              <div className="header-avatar-more">+3</div>
            </div>
            <button className="icon-header-btn" title="Add User" onClick={() => { closeAll(); setAddUserOpen(v => !v); }}>
              <IconPlusUser />
            </button>
            <button className="btn-secondary header-customize-btn" onClick={() => { closeAll(); openPanel(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: 4 }}>
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Customize Widget</span>
            </button>
          </div>
        </header>

        <div className="main-content-scrollable">
          <Outlet />
        </div>
      </main>

      {/* ── Share Panel ── */}
      {shareOpen && <div className="cw-backdrop" onClick={() => setShareOpen(false)} />}
      <div className={`cw-panel ${shareOpen ? "open" : ""}`}>
        <div className="cw-panel-header">
          <div>
            <div className="cw-panel-title">Share Dashboard</div>
            <div className="cw-panel-sub">Share a link or invite teammates</div>
          </div>
          <button className="cw-close-btn" onClick={() => setShareOpen(false)}>✕</button>
        </div>
        <div className="cw-panel-body">
          <div className="tb-dropdown-label">Share link</div>
          <div className="topbar-share-row">
            <input className="compose-input" readOnly value={shareLink} style={{ flex: 1, fontSize: "0.78rem" }} />
            <button className="btn-primary" style={{ fontSize: "0.78rem", padding: "0.45rem 0.9rem", flexShrink: 0 }} onClick={copyShareLink}>
              {shareCopied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="tb-dropdown-divider" style={{ margin: "1.25rem 0" }} />

          <div className="tb-dropdown-label">Invite by email</div>
          <div className="topbar-share-row" style={{ marginTop: "0.5rem" }}>
            <input
              className="compose-input"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendInvite()}
              style={{ flex: 1, fontSize: "0.78rem" }}
            />
            <button className="btn-primary" style={{ fontSize: "0.78rem", padding: "0.45rem 0.9rem", flexShrink: 0 }} onClick={sendInvite} disabled={!inviteEmail.trim()}>
              Invite
            </button>
          </div>
          {inviteSent && (
            <div style={{ fontSize: "0.78rem", color: "var(--success)", fontWeight: 600, marginTop: "0.5rem" }}>
              ✓ Invite sent!
            </div>
          )}

          <div className="tb-dropdown-divider" style={{ margin: "1.25rem 0" }} />

          <div className="tb-dropdown-label">Current collaborators</div>
          {[
            { name: "Sarah Chen", email: "sarah@acme.com", avatar: "SC", role: "Editor" },
            { name: "James Park", email: "james@acme.com", avatar: "JP", role: "Viewer" },
            { name: "Priya Nair", email: "priya@acme.com", avatar: "PN", role: "Viewer" },
          ].map(c => (
            <div key={c.email} className="topbar-collab-row">
              <div className="topbar-collab-avatar">{c.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-dark)" }}>{c.name}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted-light)" }}>{c.email}</div>
              </div>
              <span className="tool-tag">{c.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Notifications Panel ── */}
      {notifOpen && <div className="cw-backdrop" onClick={() => setNotifOpen(false)} />}
      <div className={`cw-panel ${notifOpen ? "open" : ""}`}>
        <div className="cw-panel-header">
          <div>
            <div className="cw-panel-title">Notifications</div>
            <div className="cw-panel-sub">{unreadCount} unread</div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {unreadCount > 0 && (
              <button className="cw-close-btn" style={{ fontSize: "0.72rem", fontWeight: 700 }}
                onClick={() => setNotifRead(notifications.map(n => n.id))}>
                Mark all read
              </button>
            )}
            <button className="cw-close-btn" onClick={() => setNotifOpen(false)}>✕</button>
          </div>
        </div>
        <div className="cw-panel-body" style={{ padding: 0, gap: 0 }}>
          {notifications.map(n => {
            const isRead = notifRead.includes(n.id);
            return (
              <div
                key={n.id}
                className={`topbar-notif-row ${isRead ? "read" : ""}`}
                onClick={() => setNotifRead(prev => prev.includes(n.id) ? prev : [...prev, n.id])}
              >
                <span className="topbar-notif-dot" style={{ background: NOTIF_COLORS[n.type] }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="topbar-notif-title">{n.title}</div>
                  <div className="topbar-notif-body">{n.body}</div>
                  <div className="topbar-notif-time">{n.time}</div>
                </div>
                {!isRead && <span className="topbar-notif-unread-dot" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Add User Panel ── */}
      {addUserOpen && <div className="cw-backdrop" onClick={() => setAddUserOpen(false)} />}
      <div className={`cw-panel ${addUserOpen ? "open" : ""}`}>
        <div className="cw-panel-header">
          <div>
            <div className="cw-panel-title">Team Members</div>
            <div className="cw-panel-sub">Manage access to this workspace</div>
          </div>
          <button className="cw-close-btn" onClick={() => setAddUserOpen(false)}>✕</button>
        </div>
        <div className="cw-panel-body">
          <div className="tb-dropdown-label">Invite new member</div>
          <div className="topbar-share-row" style={{ marginTop: "0.5rem" }}>
            <input
              className="compose-input"
              placeholder="email@company.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendInvite()}
              style={{ flex: 1, fontSize: "0.78rem" }}
            />
            <button className="btn-primary" style={{ fontSize: "0.78rem", padding: "0.45rem 0.9rem", flexShrink: 0 }} onClick={sendInvite} disabled={!inviteEmail.trim()}>
              Send
            </button>
          </div>
          {inviteSent && (
            <div style={{ fontSize: "0.78rem", color: "var(--success)", fontWeight: 600, marginTop: "0.5rem" }}>✓ Invite sent!</div>
          )}

          <div className="tb-dropdown-divider" style={{ margin: "1.25rem 0" }} />
          <div className="tb-dropdown-label">Active members</div>

          {[
            { name: user?.email?.split("@")[0] ?? "You", email: user?.email ?? "", avatar: user?.email?.charAt(0).toUpperCase() ?? "U", role: "Admin", you: true },
            { name: "Sarah Chen", email: "sarah@acme.com", avatar: "SC", role: "Editor", you: false },
            { name: "James Park", email: "james@acme.com", avatar: "JP", role: "Viewer", you: false },
            { name: "Priya Nair", email: "priya@acme.com", avatar: "PN", role: "Viewer", you: false },
          ].map(m => (
            <div key={m.email} className="topbar-collab-row">
              <div className="topbar-collab-avatar" style={{ background: m.you ? "var(--accent)" : undefined, color: m.you ? "white" : undefined }}>
                {m.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-dark)" }}>
                  {m.name} {m.you && <span style={{ fontSize: "0.68rem", color: "var(--muted-light)", fontWeight: 500 }}>(you)</span>}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted-light)" }}>{m.email}</div>
              </div>
              <select
                className="compose-input"
                defaultValue={m.role}
                disabled={m.you}
                style={{ width: "auto", fontSize: "0.72rem", padding: "2px 6px", cursor: m.you ? "default" : "pointer" }}
              >
                <option>Admin</option>
                <option>Editor</option>
                <option>Viewer</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* ── Customize Widget Panel ── */}
      {panelOpen && (
        <div className="cw-backdrop" onClick={closePanel} />
      )}
      <div className={`cw-panel ${panelOpen ? "open" : ""}`}>
        <div className="cw-panel-header">
          <div>
            <div className="cw-panel-title">Customize Widgets</div>
            <div className="cw-panel-sub">Show or hide dashboard sections</div>
          </div>
          <button className="cw-close-btn" onClick={closePanel} aria-label="Close">✕</button>
        </div>
        <div className="cw-panel-body">
          {groups.map(group => (
            <div key={group.label} className="cw-group">
              <div className="cw-group-label">{group.label}</div>
              {group.keys.map(key => (
                <label key={key} className="cw-row">
                  <span className="cw-row-label">{labels[key]}</span>
                  <div
                    className={`cw-switch ${widgets[key] ? "on" : ""}`}
                    onClick={() => toggle(key)}
                    role="switch"
                    aria-checked={widgets[key]}
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" || e.key === " " ? toggle(key) : undefined}
                  >
                    <div className="cw-thumb" />
                  </div>
                </label>
              ))}
            </div>
          ))}
        </div>
        <div className="cw-panel-footer">
          <button className="btn-secondary" style={{ fontSize: "0.82rem" }} onClick={reset}>Reset to default</button>
          <button className="btn-primary" style={{ fontSize: "0.82rem" }} onClick={closePanel}>Done</button>
        </div>
      </div>
    </div>
  );
}
