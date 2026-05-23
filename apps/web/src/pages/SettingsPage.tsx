import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { Account } from "@crm/shared";

export function SettingsPage() {
    const [account, setAccount] = useState<Account | null | undefined>(
        undefined,
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void apiFetch<{ account: Account | null }>("/accounts/me")
            .then((d) => setAccount(d.account))
            .catch(() => setAccount(null));
    }, []);

    const connectHubspot = async () => {
        setLoading(true);
        setError(null);
        try {
            const { url } = await apiFetch<{ url: string }>(
                "/accounts/hubspot/auth-url",
            );
            window.location.href = url;
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to start Dench CRM connect",
            );
            setLoading(false);
        }
    };

    const disconnectHubspot = async () => {
        setLoading(true);
        try {
            await apiFetch("/accounts/hubspot", { method: "DELETE" });
            // reload account
            const { account } = await apiFetch<{ account: Account | null }>(
                "/accounts/me",
            );
            setAccount(account);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Disconnect failed");
        } finally {
            setLoading(false);
        }
    };

    const [searchQuery, setSearchQuery] = useState("");
    const [scraping, setScraping] = useState(false);
    const [scraperResults, setScraperResults] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
    const [scraperError, setScraperError] = useState<string | null>(null);

    const handleScrape = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setScraping(true);
        setScraperError(null);
        setScraperResults([]);
        try {
            const data = await apiFetch<{ results: typeof scraperResults }>("/scraper", {
                method: "POST",
                body: JSON.stringify({ query: searchQuery }),
            });
            setScraperResults(data.results || []);
        } catch (err) {
            setScraperError(err instanceof Error ? err.message : "Scraping failed");
        } finally {
            setScraping(false);
        }
    };

    if (account === undefined) return <p>Loading...</p>;

    return (
        <>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">
                Manage connected accounts and sync preferences
            </p>

            <div className="card">
                <h2>Hubspot</h2>
                <p style={{ marginBottom: "0.5rem" }}>
                    Status:{" "}
                    {account?.hubspotConnected ? (
                        <strong>Connected</strong>
                      ) : (
                        <strong>Not connected</strong>
                    )}
                </p>
                {account?.hubspotConnected ? (
                    <button
                        type="button"
                        className="btn-danger"
                        disabled={loading}
                        onClick={() => void disconnectHubspot()}
                    >
                        Disconnect Hubspot CRM
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn-primary"
                        disabled={loading}
                        onClick={() => void connectHubspot()}
                    >
                        {loading ? "Redirecting..." : "Connect Dench CRM"}
                    </button>
                )}
                {error && (
                    <p style={{ color: "var(--danger)", marginTop: "1rem" }}>
                        {error}
                    </p>
                )}
            </div>

            {/* Premium Lightpanda Scraper Widget Card */}
            <div className="card" style={{ marginTop: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.5rem" }}>
                    <div style={{ background: "var(--accent-light)", color: "var(--accent)", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                    </div>
                    <div>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Lightpanda LinkedIn Scraper</h2>
                        <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>Retrieve LinkedIn URL targets in seconds using the Lightpanda headless browser API.</p>
                    </div>
                </div>

                <form onSubmit={(e) => void handleScrape(e)} style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", marginBottom: "1rem" }}>
                    <input
                        type="text"
                        placeholder="Enter user name or company (e.g. Kumar Abhirup, Stanford, Stripe)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            flex: 1,
                            padding: "0.6rem 1rem",
                            borderRadius: "10px",
                            border: "1px solid var(--border)",
                            outline: "none",
                            fontSize: "0.9rem",
                            background: "var(--surface-2)"
                        }}
                    />
                    <button type="submit" className="btn-accent" disabled={scraping} style={{ fontWeight: 700 }}>
                        {scraping ? "Scraping DOM..." : "Profile Targets"}
                    </button>
                </form>

                {scraperError && (
                    <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "0.5rem" }}>{scraperError}</p>
                )}

                {scraperResults.length > 0 && (
                    <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-dark)", marginBottom: "0.75rem" }}>Found Profiles:</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {scraperResults.map((r, i) => (
                                <div key={i} style={{ padding: "0.75rem", background: "var(--surface-2)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                    <a href={r.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: "0.88rem", display: "inline-block", marginBottom: "2px" }}>
                                        {r.title}
                                    </a>
                                    <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{r.snippet}</div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--accent)", marginTop: "4px", fontWeight: 600 }}>{r.url}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
