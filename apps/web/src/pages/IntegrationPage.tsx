import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./ToolPages.css";

const LogoGmail = () => (
  <svg viewBox="0 0 48 48" width="32" height="32">
    <path fill="#EA4335" d="M6 40h6V22.5L4 17v21a2 2 0 0 0 2 2z"/>
    <path fill="#34A853" d="M36 40h6a2 2 0 0 0 2-2V17l-8 5.5z"/>
    <path fill="#FBBC05" d="M36 10v12.5l8-5.5V12a3 3 0 0 0-4.8-2.4z"/>
    <path fill="#EA4335" d="M12 22.5V10l12 9 12-9v12.5L24 31.5z"/>
    <path fill="#C5221F" d="M4 12v5l8 5.5V10L7.2 7.6A3 3 0 0 0 4 12z"/>
  </svg>
);

const LogoHubSpot = () => (
  <svg viewBox="0 0 48 48" width="32" height="32">
    <circle cx="24" cy="24" r="24" fill="#FF7A59"/>
    <path fill="white" d="M28.5 18.3V15a2.5 2.5 0 1 0-5 0v3.3A7 7 0 0 0 17 24a7 7 0 0 0 3.5 6.1V33a2.5 2.5 0 1 0 5 0v-2.9A7 7 0 0 0 31 24a7 7 0 0 0-2.5-5.7zM24 28a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
  </svg>
);

const LogoMistral = () => (
  <svg viewBox="0 0 48 48" width="32" height="32">
    <rect width="48" height="48" rx="10" fill="#0F0F0F"/>
    <rect x="8" y="8" width="10" height="10" fill="white"/>
    <rect x="20" y="8" width="10" height="10" fill="#FF7000"/>
    <rect x="32" y="8" width="8" height="10" fill="white"/>
    <rect x="8" y="20" width="10" height="10" fill="white"/>
    <rect x="20" y="20" width="10" height="10" fill="white"/>
    <rect x="8" y="32" width="10" height="8" fill="#FF7000"/>
    <rect x="20" y="32" width="10" height="8" fill="white"/>
    <rect x="32" y="20" width="8" height="20" fill="white"/>
  </svg>
);

const LogoLightpanda = () => (
  <svg viewBox="0 0 48 48" width="32" height="32">
    <rect width="48" height="48" rx="10" fill="#1a1a2e"/>
    <text x="24" y="32" textAnchor="middle" fontSize="26" fill="white">🐼</text>
  </svg>
);

const LogoSlack = () => (
  <svg viewBox="0 0 48 48" width="32" height="32">
    <path fill="#E01E5A" d="M13 28a3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3h3v3zm1.5 0a3 3 0 0 1 3-3 3 3 0 0 1 3 3v7.5a3 3 0 0 1-3 3 3 3 0 0 1-3-3V28z"/>
    <path fill="#36C5F0" d="M17.5 13a3 3 0 0 1-3-3 3 3 0 0 1 3-3 3 3 0 0 1 3 3v3h-3zm0 1.5a3 3 0 0 1 3 3 3 3 0 0 1-3 3H10a3 3 0 0 1-3-3 3 3 0 0 1 3-3h7.5z"/>
    <path fill="#2EB67D" d="M32.5 17.5a3 3 0 0 1 3-3 3 3 0 0 1 3 3 3 3 0 0 1-3 3h-3v-3zm-1.5 0a3 3 0 0 1-3 3 3 3 0 0 1-3-3V10a3 3 0 0 1 3-3 3 3 0 0 1 3 3v7.5z"/>
    <path fill="#ECB22E" d="M28 32.5a3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3v-3h3zm0-1.5a3 3 0 0 1-3-3 3 3 0 0 1 3-3h7.5a3 3 0 0 1 3 3 3 3 0 0 1-3 3H28z"/>
  </svg>
);

const LogoSalesforce = () => (
  <svg viewBox="0 0 48 48" width="32" height="32">
    <path fill="#00A1E0" d="M20 10c2.2-2.3 5.2-3.7 8.5-3.7 4.8 0 9 2.8 11.1 6.9a11 11 0 0 1 4.4-.9c5.5 0 10 4.5 10 10s-4.5 10-10 10c-.6 0-1.2-.1-1.8-.2A8.5 8.5 0 0 1 34 37a8.5 8.5 0 0 1-8.3-6.6A9 9 0 0 1 24 30.5a9 9 0 0 1-9-9c0-.5 0-1 .1-1.5A8 8 0 0 1 8 12a8 8 0 0 1 8-8c1.6 0 3.1.5 4.3 1.3z" transform="scale(0.85) translate(2,2)"/>
  </svg>
);

interface AccountDoc {
  gmailEmail: string;
  hubspotConnected: boolean;
}

export function IntegrationPage() {
  const [account, setAccount] = useState<AccountDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiFetch<{ account: { doc: AccountDoc } | null }>("/accounts/me")
      .then(d => setAccount(d.account?.doc ?? null))
      .finally(() => setLoading(false));
  }, []);

  const gmailConnected = !!account?.gmailEmail;
  const hubspotConnected = !!account?.hubspotConnected;

  const integrations = [
    {
      id: "gmail",
      name: "Gmail",
      description: "Sync emails and extract CRM contacts automatically",
      icon: <LogoGmail />,
      connected: gmailConnected,
      detail: account?.gmailEmail ?? null,
      connectHref: "/connect",
      docs: "https://developers.google.com/gmail/api",
    },
    {
      id: "hubspot",
      name: "HubSpot",
      description: "Push contacts and deals to your HubSpot CRM",
      icon: <LogoHubSpot />,
      connected: hubspotConnected,
      detail: null,
      connectHref: "/settings",
      docs: "https://developers.hubspot.com",
    },
    {
      id: "mistral",
      name: "Mistral AI",
      description: "AI extraction engine for contact and deal intelligence",
      icon: <LogoMistral />,
      connected: true,
      detail: null,
      connectHref: "/settings",
      docs: "https://docs.mistral.ai",
    },
    {
      id: "lightpanda",
      name: "Lightpanda",
      description: "Headless browser for real-time company profile scraping",
      icon: <LogoLightpanda />,
      connected: true,
      detail: null,
      connectHref: "/settings",
      docs: "https://lightpanda.io",
    },
    {
      id: "slack",
      name: "Slack",
      description: "Get notified about sync events and deal updates",
      icon: <LogoSlack />,
      connected: false,
      detail: null,
      connectHref: "#",
      docs: "https://api.slack.com",
      comingSoon: true,
    },
    {
      id: "salesforce",
      name: "Salesforce",
      description: "Bi-directional sync with Salesforce CRM",
      icon: <LogoSalesforce />,
      connected: false,
      detail: null,
      connectHref: "#",
      docs: "https://developer.salesforce.com",
      comingSoon: true,
    },
    {
      id: "denchclaw",
      name: "DenchClaw",
      description: "Local-first AI CRM on your Mac — chat with your DB, automate outreach, browse as you",
      icon: (
        <div style={{ background: "#0f0f0f", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
      ),
      connected: false,
      detail: null,
      connectHref: "https://www.dench.com/claw",
      docs: "https://www.dench.com/claw",
      external: true,
    },
  ];

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <div>
          <h1 className="tool-page-title">Integrations</h1>
          <p className="tool-page-subtitle">Connect your tools and data sources</p>
        </div>
        <div className="tool-page-actions">
          <span className="tool-tag" style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}>
            {loading ? "—" : integrations.filter(i => i.connected).length} connected
          </span>
        </div>
      </div>

      <div className="integrations-grid">
        {integrations.map((integration) => {
          const { connected, detail } = integration;
          return (
            <div key={integration.id} className={`integration-card ${connected ? "connected" : ""}`}>
              <div className="integration-card-top">
                <span className="integration-icon">{integration.icon}</span>
                <span className={`integration-status-dot ${connected ? "on" : "off"}`} title={connected ? "Connected" : "Not connected"} />
              </div>
              <div className="integration-name">{integration.name}</div>
              <div className="integration-desc">{integration.description}</div>
              {detail && <div className="integration-detail">{detail}</div>}
              <div className="integration-footer">
                {(integration as any).comingSoon ? (
                  <span className="tool-tag">Coming soon</span>
                ) : (integration as any).external ? (
                  <a href={integration.connectHref} target="_blank" rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center", borderRadius: "var(--radius-sm)" }}>
                    Download
                  </a>
                ) : connected ? (
                  <span className="integration-connected-label">✓ Connected</span>
                ) : (
                  <a href={integration.connectHref} className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center", borderRadius: "var(--radius-sm)" }}>
                    Connect
                  </a>
                )}
                <a href={integration.docs} target="_blank" rel="noopener noreferrer" className="integration-docs-link">Docs ↗</a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
