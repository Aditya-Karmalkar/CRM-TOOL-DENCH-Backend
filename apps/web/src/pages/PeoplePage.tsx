import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import "./People.css";

/* ── Types ── */
type ContactStatus = "new" | "contacted" | "qualified" | "converted";

interface PersonRecord {
    id: string;
    emailId: string;
    fullName: string | null;
    email: string | null;
    company: string | null;
    title: string | null;
    linkedin: string | null;
    notes: string | null;
    status: ContactStatus;
    receivedAt: string;
    sentiment: string | null;
    emailType: string | null;
    phone: string | null;
}

interface Pipeline {
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
}

/* ── Small SVG icons ── */
const IconSearch = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const IconLinkedIn = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
    </svg>
);
const IconPeople = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const IconRefresh = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
    </svg>
);

/* ── Helpers ── */
function initials(name: string | null): string {
    if (!name) return "?";
    return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function truncateUrl(url: string, max = 36): string {
    const clean = url.replace("https://", "").replace("http://", "");
    return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

const STATUS_LABELS: Record<ContactStatus, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    converted: "Converted",
};

/* ── Component ── */
export function PeoplePage() {
    const [people, setPeople] = useState<PersonRecord[]>([]);
    const [pipeline, setPipeline] = useState<Pipeline | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch<{ people: PersonRecord[]; pipeline: Pipeline; total: number }>("/people");
            setPeople(data.people);
            setPipeline(data.pipeline);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load people");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    /* Search + filter */
    const filtered = useMemo(() => {
        let list = people;
        if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (p) =>
                    p.fullName?.toLowerCase().includes(q) ||
                    p.email?.toLowerCase().includes(q) ||
                    p.company?.toLowerCase().includes(q) ||
                    p.title?.toLowerCase().includes(q),
            );
        }
        return list;
    }, [people, search, statusFilter]);

    /* Select-all for current filtered view */
    const allChecked = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
    const toggleAll = () => {
        if (allChecked) {
            setSelected((prev) => {
                const next = new Set(prev);
                filtered.forEach((p) => next.delete(p.id));
                return next;
            });
        } else {
            setSelected((prev) => {
                const next = new Set(prev);
                filtered.forEach((p) => next.add(p.id));
                return next;
            });
        }
    };

    const toggleOne = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const totalPipeline = pipeline
        ? pipeline.new + pipeline.contacted + pipeline.qualified + pipeline.converted
        : 0;

    const exportCSV = () => {
        const targets = selected.size > 0
            ? filtered.filter((p) => selected.has(p.id))
            : filtered;

        const headers = ["Full Name", "Email", "Company", "Title", "Phone", "LinkedIn", "Status", "Sentiment", "Email Type", "Notes", "Received At"];
        const escape = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, "'")}"`;

        const rows = targets.map((p) => [
            escape(p.fullName),
            escape(p.email),
            escape(p.company),
            escape(p.title),
            escape(p.phone),
            escape(p.linkedin),
            escape(p.status),
            escape(p.sentiment),
            escape(p.emailType),
            escape(p.notes),
            escape(new Date(p.receivedAt).toLocaleString()),
        ].join(","));

        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `people-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="people-page">
            {/* ── Header ── */}
            <div className="people-header">
                <div className="people-title-row">
                    <div>
                        <h1 className="people-title">People</h1>
                        <p className="people-subtitle">Contacts extracted from your synced emails</p>
                    </div>

                    {/* Pipeline pills */}
                    {pipeline && (
                        <div className="pipeline-bar">
                            {(["all", "new", "contacted", "qualified", "converted"] as const).map((s) => {
                                const count = s === "all" ? totalPipeline : pipeline[s];
                                return (
                                    <button
                                        key={s}
                                        type="button"
                                        className={`pipeline-pill ${s === "all" ? "new" : s}${statusFilter === s ? " active-filter" : ""}`}
                                        onClick={() => setStatusFilter(s)}
                                        style={statusFilter === s ? { outline: "2px solid var(--accent)", outlineOffset: "1px" } : undefined}
                                        title={`Filter by ${s}`}
                                    >
                                        <span>{s === "all" ? "All" : STATUS_LABELS[s]}</span>
                                        <span className="pill-count">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Meta strip */}
                <div className="people-meta">
                    <span className="people-meta-chip">{people.length} entries</span>
                    <span className="people-meta-chip">6 fields</span>
                    <span className="people-meta-chip accent">1 relation</span>
                </div>
            </div>

            {/* ── Toolbar ── */}
            <div className="people-toolbar">
                <div className="people-toolbar-left">
                    {/* Search */}
                    <div className="people-search-wrap">
                        <span className="people-search-icon"><IconSearch /></span>
                        <input
                            id="people-search"
                            type="text"
                            className="people-search-input"
                            placeholder="Search people..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {selected.size > 0 && (
                        <span className="people-meta-chip" style={{ color: "var(--accent)", borderColor: "rgba(255,78,24,.25)", background: "var(--accent-light)" }}>
                            {selected.size} selected
                        </span>
                    )}
                </div>
                <div className="people-toolbar-right">
                    <button type="button" className="btn-secondary" onClick={() => void load()} title="Refresh">
                        <IconRefresh />
                        <span>Refresh</span>
                    </button>
                    <button type="button" className="btn-primary" onClick={exportCSV} disabled={filtered.length === 0}>
                        + Export {selected.size > 0 ? `(${selected.size})` : `(${filtered.length})`}
                    </button>
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div style={{ background: "var(--danger-bg)", border: "1px solid #fca5a5", borderRadius: "var(--radius)", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "var(--danger)" }}>
                    {error}
                </div>
            )}

            {/* ── Table sheet ── */}
            <div className="people-sheet">
                <div className="people-table-wrap">
                    <table className="people-table" aria-label="People contacts table">
                        <thead>
                            <tr>
                                <th className="ppl-check-col">
                                    <input
                                        type="checkbox"
                                        className="ppl-checkbox"
                                        checked={allChecked}
                                        onChange={toggleAll}
                                        aria-label="Select all"
                                    />
                                </th>
                                <th>Full Name</th>
                                <th>Company</th>
                                <th>LinkedIn</th>
                                <th>Notes</th>
                                <th>Title</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading
                                ? Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="ppl-skeleton-row">
                                        <td className="ppl-check-col"><div className="ppl-skeleton sm" /></td>
                                        <td><div className="ppl-skeleton wide" /></td>
                                        <td><div className="ppl-skeleton med" /></td>
                                        <td><div className="ppl-skeleton med" /></td>
                                        <td><div className="ppl-skeleton wide" /></td>
                                        <td><div className="ppl-skeleton med" /></td>
                                        <td><div className="ppl-skeleton sm" /></td>
                                    </tr>
                                ))
                                : filtered.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={7}>
                                                <div className="people-empty">
                                                    <div className="people-empty-icon"><IconPeople /></div>
                                                    <div className="people-empty-title">No people found</div>
                                                    <div className="people-empty-desc">
                                                        {search || statusFilter !== "all"
                                                            ? "No contacts match your current filter. Try clearing the search or status filter."
                                                            : "Sync emails from the Dashboard to start building your contact database automatically."}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                    : filtered.map((person) => (
                                        <tr key={person.id}>
                                            <td className="ppl-check-col">
                                                <input
                                                    type="checkbox"
                                                    className="ppl-checkbox"
                                                    checked={selected.has(person.id)}
                                                    onChange={() => toggleOne(person.id)}
                                                    aria-label={`Select ${person.fullName ?? person.email ?? "person"}`}
                                                />
                                            </td>

                                            {/* Name + email sub */}
                                            <td>
                                                <div className="ppl-name-cell">
                                                    <div className="ppl-avatar">
                                                        {initials(person.fullName ?? person.email)}
                                                    </div>
                                                    <div>
                                                        <div className="ppl-name">{person.fullName ?? "—"}</div>
                                                        {person.email && (
                                                            <div className="ppl-email-sub">{person.email}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Company */}
                                            <td>
                                                {person.company
                                                    ? <span className="ppl-company-chip">{person.company}</span>
                                                    : <span style={{ color: "var(--muted-light)", fontSize: "0.8rem" }}>—</span>}
                                            </td>

                                            {/* LinkedIn */}
                                            <td>
                                                {person.linkedin
                                                    ? (
                                                        <a
                                                            href={person.linkedin}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="ppl-linkedin-link"
                                                            title={person.linkedin}
                                                        >
                                                            <IconLinkedIn />
                                                            {truncateUrl(person.linkedin)}
                                                        </a>
                                                    )
                                                    : <span className="ppl-no-linkedin">No LinkedIn</span>}
                                            </td>

                                            {/* Notes */}
                                            <td>
                                                <span className="ppl-notes" title={person.notes ?? ""}>
                                                    {person.notes ?? "—"}
                                                </span>
                                            </td>

                                            {/* Title */}
                                            <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                                                {person.title ?? "—"}
                                            </td>

                                            {/* Status */}
                                            <td>
                                                <span className={`ppl-status ${person.status}`}>
                                                    <span className="ppl-status-dot" />
                                                    {STATUS_LABELS[person.status]}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>

                {/* Table footer */}
                {!loading && filtered.length > 0 && (
                    <div className="people-table-footer">
                        <span>
                            Showing <strong>{filtered.length}</strong> of <strong>{people.length}</strong> contacts
                        </span>
                        <span>
                            {selected.size > 0
                                ? `${selected.size} selected`
                                : "Click a row checkbox to select"}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
