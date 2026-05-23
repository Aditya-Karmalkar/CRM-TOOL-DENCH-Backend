import { useEffect, useMemo, useState } from "react";
import type { DealSignal, SignalType } from "@crm/shared";
import { apiFetch } from "../lib/api";
import "./DealSignals.css";

const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
    budget: "Budget",
    timeline: "Timeline",
    competitor: "Competitor",
    buying_intent: "Buying Intent",
    decision_maker: "Decision Maker",
    objection: "Objection",
};

const SIGNAL_TYPE_COLORS: Record<SignalType, { bg: string; color: string }> = {
    budget: { bg: "#ecfdf5", color: "#059669" },
    timeline: { bg: "#fffbeb", color: "#d97706" },
    competitor: { bg: "#fef2f2", color: "#b91c1c" },
    buying_intent: { bg: "#ede9fe", color: "#6d28d9" },
    decision_maker: { bg: "#eff6ff", color: "#1d4ed8" },
    objection: { bg: "#fff1f2", color: "#e11d48" },
};

const ALL_TYPES: SignalType[] = ["budget", "timeline", "competitor", "buying_intent", "decision_maker", "objection"];

function ScoreRing({ score }: { score: number }) {
    const isHot = score >= 75;
    const color = isHot ? "#ff4e18" : score >= 50 ? "#d97706" : "#6b7280";
    return (
        <div className={`signal-score-ring ${isHot ? "hot" : ""}`} style={{ borderColor: color }}>
            <span style={{ color, fontWeight: 800, fontSize: "0.85rem" }}>{score}</span>
        </div>
    );
}

export function DealSignalsPage() {
    const [signals, setSignals] = useState<DealSignal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [typeFilters, setTypeFilters] = useState<SignalType[]>([]);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [search, setSearch] = useState("");

    // Slack settings
    const [showSlack, setShowSlack] = useState(false);
    const [slackEnabled, setSlackEnabled] = useState(false);
    const [slackUrl, setSlackUrl] = useState("");
    const [slackSaving, setSlackSaving] = useState(false);
    const [slackSaved, setSlackSaved] = useState(false);
    const [slackError, setSlackError] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        void apiFetch<{ signals: DealSignal[] }>("/signals")
            .then(d => setSignals(d.signals))
            .catch(err => setError(err instanceof Error ? err.message : "Failed to load signals"))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
        // Poll every 10 seconds for real-time feel
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        void apiFetch<{ config: { enabled: boolean; webhookUrl: string } }>("/signals/slack")
            .then(d => { setSlackEnabled(d.config.enabled); setSlackUrl(d.config.webhookUrl); })
            .catch(() => {});
    }, []);

    const saveSlack = async () => {
        if (slackUrl && !slackUrl.startsWith("https://hooks.slack.com/")) {
            setSlackError("URL must start with https://hooks.slack.com/");
            return;
        }
        setSlackSaving(true);
        setSlackError(null);
        try {
            await apiFetch("/signals/slack", {
                method: "POST",
                body: JSON.stringify({ enabled: slackEnabled, webhookUrl: slackUrl }),
            });
            setSlackSaved(true);
            setTimeout(() => setSlackSaved(false), 3000);
        } catch {
            setSlackError("Failed to save");
        } finally {
            setSlackSaving(false);
        }
    };

    const toggleType = (t: SignalType) =>
        setTypeFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

    const filtered = useMemo(() => {
        let list = signals;
        if (typeFilters.length > 0) list = list.filter(s => typeFilters.includes(s.signalType));
        if (dateFrom) list = list.filter(s => new Date(s.createdAt) >= new Date(dateFrom));
        if (dateTo) list = list.filter(s => new Date(s.createdAt) <= new Date(dateTo + "T23:59:59"));
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                (s.contactName ?? "").toLowerCase().includes(q) ||
                (s.companyName ?? "").toLowerCase().includes(q) ||
                s.subject.toLowerCase().includes(q)
            );
        }
        return list;
    }, [signals, typeFilters, dateFrom, dateTo, search]);

    const hotCount = signals.filter(s => s.signalScore >= 75).length;
    const hasFilters = typeFilters.length > 0 || !!dateFrom || !!dateTo || !!search;

    const clearFilters = () => {
        setTypeFilters([]);
        setDateFrom("");
        setDateTo("");
        setSearch("");
    };

    return (
        <div className="signals-page">
            {/* Header */}
            <div className="signals-header">
                <div>
                    <h1 className="signals-title">Deal Signals</h1>
                    <p className="signals-subtitle">
                        AI-detected buying signals from your synced emails
                        {hotCount > 0 && <span className="hot-badge">{hotCount} hot</span>}
                    </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn-secondary" onClick={() => setShowSlack(v => !v)} style={{ fontSize: "0.82rem" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                        </svg>
                        Slack Alerts
                    </button>
                    <button className="btn-primary" onClick={load} style={{ fontSize: "0.82rem" }}>Refresh</button>
                </div>
            </div>

            {/* Slack settings panel */}
            {showSlack && (
                <div className="signals-slack-panel">
                    <div className="signals-slack-title">Slack Notifications for Hot Signals</div>
                    <p className="signals-slack-desc">Get notified in Slack when a signal scores 75 or above.</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
                            <input type="checkbox" checked={slackEnabled} onChange={e => setSlackEnabled(e.target.checked)} />
                            Enable Slack notifications
                        </label>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                            className="signals-input"
                            placeholder="https://hooks.slack.com/services/..."
                            value={slackUrl}
                            onChange={e => setSlackUrl(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button className="btn-primary" style={{ fontSize: "0.82rem" }} onClick={() => void saveSlack()} disabled={slackSaving}>
                            {slackSaving ? "Saving..." : "Save"}
                        </button>
                    </div>
                    {slackError && <div style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: "0.4rem" }}>{slackError}</div>}
                    {slackSaved && <div style={{ color: "var(--success)", fontSize: "0.78rem", marginTop: "0.4rem" }}>✓ Saved</div>}
                </div>
            )}

            {/* Filter bar */}
            <div className="signals-filter-bar">
                <div className="signals-type-pills">
                    {ALL_TYPES.map(t => {
                        const c = SIGNAL_TYPE_COLORS[t];
                        const active = typeFilters.includes(t);
                        return (
                            <button
                                key={t}
                                className={`signal-type-pill ${active ? "active" : ""}`}
                                style={active ? { background: c.bg, color: c.color, borderColor: c.color + "66" } : {}}
                                onClick={() => toggleType(t)}
                            >
                                {SIGNAL_TYPE_LABELS[t]}
                            </button>
                        );
                    })}
                </div>
                <div className="signals-filter-right">
                    <input
                        className="signals-input"
                        placeholder="Search contact or company..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: 220 }}
                    />
                    <input type="date" className="signals-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    <span style={{ color: "var(--muted-light)", fontSize: "0.8rem" }}>→</span>
                    <input type="date" className="signals-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    {hasFilters && (
                        <button className="btn-secondary" style={{ fontSize: "0.78rem", padding: "0.35rem 0.7rem" }} onClick={clearFilters}>
                            Clear ×
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: "var(--danger-bg)", border: "1px solid #fca5a5", borderRadius: "var(--radius)", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "var(--danger)" }}>
                    {error}
                </div>
            )}

            {/* Feed */}
            {loading && signals.length === 0 ? (
                <div className="signals-loading">
                    <div className="signals-spinner" />
                    <span>Loading signals...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="signals-empty">
                    <div className="signals-empty-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                        </svg>
                    </div>
                    <div className="signals-empty-title">
                        {hasFilters ? "No signals match your filters" : "No deal signals detected yet"}
                    </div>
                    <div className="signals-empty-desc">
                        {hasFilters
                            ? "Try clearing your filters to see all signals."
                            : "Signals are automatically detected when emails are synced. Sync some emails from the Dashboard to get started."}
                    </div>
                    {hasFilters && (
                        <button className="btn-secondary" style={{ marginTop: "1rem", fontSize: "0.82rem" }} onClick={clearFilters}>
                            Clear Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="signals-feed">
                    {filtered.map(signal => {
                        const isHot = signal.signalScore >= 75;
                        const typeStyle = SIGNAL_TYPE_COLORS[signal.signalType];
                        return (
                            <div key={signal.signalId} className={`signal-card ${isHot ? "hot" : ""}`}>
                                <div className="signal-card-top">
                                    <div className="signal-card-left">
                                        <ScoreRing score={signal.signalScore} />
                                        <div>
                                            <div className="signal-card-contact">
                                                {signal.contactName ?? "Unknown Contact"}
                                                {signal.companyName && (
                                                    <span className="signal-card-company">@ {signal.companyName}</span>
                                                )}
                                            </div>
                                            <div className="signal-card-subject">{signal.subject}</div>
                                        </div>
                                    </div>
                                    <div className="signal-card-right">
                                        {isHot && <span className="signal-hot-badge">🔥 Hot</span>}
                                        <span
                                            className="signal-type-badge"
                                            style={{ background: typeStyle.bg, color: typeStyle.color }}
                                        >
                                            {SIGNAL_TYPE_LABELS[signal.signalType]}
                                        </span>
                                        <span className="signal-time">
                                            {new Date(signal.createdAt).toLocaleString(undefined, {
                                                month: "short", day: "numeric",
                                                hour: "numeric", minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                </div>

                                <div className="signal-excerpt">"{signal.rawExcerpt}"</div>

                                <div className="signal-next-steps">
                                    <span className="signal-next-steps-label">Next steps</span>
                                    <ul>
                                        {signal.nextSteps.map((step: string, i: number) => (
                                            <li key={i}>{step}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
