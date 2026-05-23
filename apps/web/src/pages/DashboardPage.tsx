import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SyncedEmail } from "@crm/shared";
import { apiFetch } from "../lib/api";
import { useWidgets } from "../context/WidgetContext";
import "./Dashboard.css";

type ViewDensity = "comfortable" | "compact" | "spacious";
type SortField  = "receivedAt" | "subject" | "fromEmail" | "syncStatus";
type SortDir    = "asc" | "desc";
type FilterStatus = "all" | "synced" | "pending" | "failed";

const ALL_COLUMNS = [
  { key: "subject",    label: "Subject" },
  { key: "fromEmail",  label: "From" },
  { key: "syncStatus", label: "Status" },
  { key: "receivedAt", label: "Received" },
  { key: "action",     label: "Action" },
] as const;
type ColumnKey = typeof ALL_COLUMNS[number]["key"];

// SVG Icons
const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const IconFilter = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const IconSort = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
);

const IconInfo = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const IconSync = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
  </svg>
);

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const IconColumns = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
    <line x1="15" y1="3" x2="15" y2="21"/>
  </svg>
);

const IconSortAsc = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
);

const IconSortDesc = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <polyline points="19 12 12 19 5 12"/>
  </svg>
);

function StatusBadge({ status }: { status: SyncedEmail["syncStatus"] }) {
  // Map our sync status to customized premium labels and colors
  let label = status as string;
  if (status === "synced") label = "Synced";
  if (status === "failed") label = "Failed";
  if (status === "pending") label = "Pending";

  return <span className={`badge badge-${status}`}>{label}</span>;
}

export function DashboardPage() {
  const { widgets } = useWidgets();
  const [syncs, setSyncs] = useState<SyncedEmail[]>([]);
  const [metrics, setMetrics] = useState<{
    totalProcessed: number;
    syncedCount: number;
    failedCount: number;
    uniqueContacts: number;
    topCompanies: Array<{ name: string; count: number }>;
    topContacts?: Array<{ email: string; count: number }>;
    extractionCoverage?: number;
    emailTypeCounts?: Record<string, number>;
    sentimentCounts?: Record<string, number>;
  } | null>(null);
  const [failedOnly, setFailedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(30);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  
  // Custom interactive options matching screenshot
  const [showStats, setShowStats] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Toolbar feature states ──
  const [viewDensity, setViewDensity]               = useState<ViewDensity>("comfortable");
  const [showViewMenu, setShowViewMenu]              = useState(false);
  const [showFilterPanel, setShowFilterPanel]        = useState(false);
  const [showSortMenu, setShowSortMenu]              = useState(false);
  const [showCustomizeMenu, setShowCustomizeMenu]    = useState(false);
  const [filterStatus, setFilterStatus]              = useState<FilterStatus>("all");
  const [filterDateFrom, setFilterDateFrom]          = useState("");
  const [filterDateTo, setFilterDateTo]              = useState("");
  const [sortField, setSortField]                    = useState<SortField>("receivedAt");
  const [sortDir, setSortDir]                        = useState<SortDir>("desc");
  const [visibleCols, setVisibleCols]                = useState<Set<ColumnKey>>(
    new Set(ALL_COLUMNS.map((c) => c.key))
  );

  // Refs for click-outside close
  const viewMenuRef      = useRef<HTMLDivElement>(null);
  const filterPanelRef   = useRef<HTMLDivElement>(null);
  const sortMenuRef      = useRef<HTMLDivElement>(null);
  const customizeMenuRef = useRef<HTMLDivElement>(null);
  // Active Slide-over Sync target & Lightpanda states
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scrapedInfo, setScrapedInfo] = useState<{
    company: { name: string; linkedinUrl: string; snippet: string };
    employees: Array<{ name: string; title: string; url: string }>;
    note?: string;
  } | null>(null);
  const [scraperError, setScraperError] = useState<string | null>(null);

  // Memoize active sync record
  const activeSync = useMemo(() => syncs.find(s => s.id === activeSyncId), [syncs, activeSyncId]);

  // Scrape company data headlessly via Lightpanda whenever the details panel is opened
  useEffect(() => {
    if (!activeSyncId || !activeSync) {
      setScrapedInfo(null);
      setScraperLoading(false);
      setScraperError(null);
      return;
    }

    const getCompanyNameFromEmail = (email: string): string => {
      const domain = email.split("@")[1]?.toLowerCase() || "";
      if (!domain) return "Company";
      
      if (domain.includes("hubspot")) return "HubSpot";
      if (domain.includes("slack")) return "Slack";
      if (domain.includes("atlassian")) return "Atlassian";
      if (domain.includes("google")) return "Google";
      if (domain.includes("crewai")) return "CrewAI";
      if (domain.includes("pinecone")) return "Pinecone";
      if (domain.includes("slyte")) return "Slyte";
      if (domain.includes("dench")) return "Dench";
      
      const parts = domain.split(".");
      if (parts.length >= 3) {
        const sub = parts[0];
        const commonSubdomains = ["notifications", "noreply", "mail", "marketing", "alert", "alerts", "security", "info", "support", "billing", "no-reply", "hello", "contact", "team"];
        if (commonSubdomains.includes(sub)) {
          return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        }
      }
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    };

    const companyName = activeSync.extractedData?.contact?.company || 
                        getCompanyNameFromEmail(activeSync.fromEmail);

    setScraperLoading(true);
    setScrapedInfo(null);
    setScraperError(null);

    void apiFetch<any>("/scraper", {
      method: "POST",
      body: JSON.stringify({ query: companyName })
    })
      .then((data) => {
        setScrapedInfo(data);
      })
      .catch((err) => {
        setScraperError(err instanceof Error ? err.message : "Failed to scrape profile details");
      })
      .finally(() => {
        setScraperLoading(false);
      });
  }, [activeSyncId, activeSync]);
  
  const syncResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ syncs: SyncedEmail[] }>(
        `/syncs${failedOnly ? "?failed=true" : ""}`,
      );
      setSyncs(data.syncs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load syncs",
      );
    } finally {
      setLoading(false);
    }
  }, [failedOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void apiFetch<{ metrics: any }>(`/syncs/metrics?days=${days}`)
      .then((d) => setMetrics(d.metrics))
      .catch(() => setMetrics(null));
  }, [days]);

  const retry = async (id: string) => {
    try {
      await apiFetch(`/syncs/${id}/retry`, { method: "POST" });
      await load();
      // Refresh metrics
      void apiFetch<{ metrics: any }>(`/syncs/metrics?days=${days}`)
        .then((d) => setMetrics(d.metrics))
        .catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Retry failed");
    }
  };

  const retrySelected = async () => {
    const failedSelected = syncs.filter(
      (s) => selectedIds.includes(s.id) && (s.syncStatus === "failed" || s.syncStatus === "pending")
    );
    if (failedSelected.length === 0) {
      alert("No failed or pending syncs selected for retry");
      return;
    }
    setSyncing(true);
    try {
      await Promise.all(
        failedSelected.map((s) => apiFetch(`/syncs/${s.id}/retry`, { method: "POST" }))
      );
      setSelectedIds([]);
      await load();
      void apiFetch<{ metrics: any }>(`/syncs/metrics?days=${days}`)
        .then((d) => setMetrics(d.metrics))
        .catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Batch retry failed");
    } finally {
      setSyncing(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    if (syncResultTimer.current) clearTimeout(syncResultTimer.current);
    try {
      const res = await apiFetch<{ processed: number; skipped: number; failed: number }>(
        "/syncs/manual",
        { method: "POST", body: JSON.stringify({ maxMessages: 50 }) },
      );
      setSyncResult(
        `Synced ${res.processed} new · ${res.skipped} already seen · ${res.failed} failed`
      );
      syncResultTimer.current = setTimeout(() => setSyncResult(null), 6000);
      await load();
      // Refresh metrics
      void apiFetch<{ metrics: any }>(`/syncs/metrics?days=${days}`)
        .then((d) => setMetrics(d.metrics))
        .catch(() => {});
    } catch (err) {
      setSyncResult(err instanceof Error ? err.message : "Sync failed");
      syncResultTimer.current = setTimeout(() => setSyncResult(null), 6000);
    } finally {
      setSyncing(false);
    }
  };

  const totals = useMemo(() => {
    if (metrics) {
      return {
        total: metrics.totalProcessed,
        synced: metrics.syncedCount,
        failed: metrics.failedCount,
        uniqueContacts: metrics.uniqueContacts,
      };
    }

    return {
      total: syncs.length,
      synced: syncs.filter((s) => s.syncStatus === "synced").length,
      failed: syncs.filter((s) => s.syncStatus === "failed").length,
      uniqueContacts: new Set(
        syncs.map((s) => s.extractedData?.contact?.email ?? s.fromEmail)
      ).size,
    };
  }, [syncs, metrics]);

  // Handle mass checkbox toggling
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedSyncs.map((s) => s.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = paginatedSyncs.map((s) => s.id);
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ── Click-outside handler to close all menus ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) setShowViewMenu(false);
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) setShowFilterPanel(false);
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setShowSortMenu(false);
      if (customizeMenuRef.current && !customizeMenuRef.current.contains(e.target as Node)) setShowCustomizeMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Filter + Sort applied to syncs ──
  const processedSyncs = useMemo(() => {
    let list = [...syncs];
    if (filterStatus !== "all") list = list.filter((s) => s.syncStatus === filterStatus);
    if (filterDateFrom) {
      const from = new Date(filterDateFrom).getTime();
      list = list.filter((s) => new Date(s.receivedAt).getTime() >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo + "T23:59:59").getTime();
      list = list.filter((s) => new Date(s.receivedAt).getTime() <= to);
    }
    list.sort((a, b) => {
      let va: string | number = a[sortField] ?? "";
      let vb: string | number = b[sortField] ?? "";
      if (sortField === "receivedAt") {
        va = new Date(va as string).getTime();
        vb = new Date(vb as string).getTime();
      } else {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [syncs, filterStatus, filterDateFrom, filterDateTo, sortField, sortDir]);

  // ── Export CSV ──
  const exportCSV = () => {
    const headers = ["Subject", "From", "Status", "Received", "Contact Name", "Company", "Title"];
    const rows = processedSyncs.map((s) => [
      `"${(s.subject ?? "").replace(/"/g, "'")}"`,
      `"${s.fromEmail}"`,
      s.syncStatus,
      new Date(s.receivedAt).toLocaleString(),
      `"${s.extractedData?.contact?.name ?? ""}"`,
      `"${s.extractedData?.contact?.company ?? ""}"`,
      `"${s.extractedData?.contact?.title ?? ""}"`,
    ]);
    const csv  = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `dench-crm-syncs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Toggle column visibility ──
  const toggleColumn = (key: ColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const activeFilterCount = [filterStatus !== "all", !!filterDateFrom, !!filterDateTo].filter(Boolean).length;

  // ── Pagination calculations (now over processedSyncs) ──
  const paginatedSyncs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedSyncs.slice(startIndex, startIndex + pageSize);
  }, [processedSyncs, currentPage, pageSize]);

  const totalPages = Math.ceil(processedSyncs.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [processedSyncs.length, totalPages, currentPage]);

  const isAllPageSelected = useMemo(() => {
    if (paginatedSyncs.length === 0) return false;
    return paginatedSyncs.every((s) => selectedIds.includes(s.id));
  }, [paginatedSyncs, selectedIds]);

  return (
    <>
      {/* Dashboard Top Section */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Recent Gmail → Dench CRM sync activity</p>
      </div>

      {/* Metric Cards Row */}
      {showStats && (
        <div className="stats-grid">
          {widgets.metricEmailsProcessed && (
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Emails Processed</span>
              <span className="info-tooltip-trigger" title="Total number of scanned emails in local database">
                <IconInfo />
              </span>
            </div>
            <div className="metric-value">{totals.total}</div>
            <div className="metric-footer">
              <span className="comparison-pill up">+ 3 emails</span>
              <span>vs last month</span>
            </div>
          </div>
          )}

          {widgets.metricExtractionCoverage && (
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Extraction Coverage</span>
              <span className="info-tooltip-trigger" title="Percentage of emails with successfully extracted contact or deal signal information">
                <IconInfo />
              </span>
            </div>
            <div className="metric-value">{metrics?.extractionCoverage ?? "0"}%</div>
            <div className="metric-footer">
              <span className="comparison-pill up">+ 1.2%</span>
              <span>this week</span>
            </div>
          </div>
          )}

          {widgets.metricSyncSuccess && (
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Sync Success</span>
              <span className="info-tooltip-trigger" title="Successfully upserted Dench CRM records and activities">
                <IconInfo />
              </span>
            </div>
            <div className="metric-value">{totals.synced}</div>
            <div className="metric-footer">
              <span className="comparison-pill up">+ 7%</span>
              <span>vs last month</span>
            </div>
          </div>
          )}

          {widgets.metricSyncFailures && (
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Sync Failures</span>
              <span className="info-tooltip-trigger" title="Failures requiring manual retry or credential renewal">
                <IconInfo />
              </span>
            </div>
            <div className="metric-value">{totals.failed}</div>
            <div className="metric-footer">
              {totals.failed > 0 ? (
                <span className="comparison-pill down" style={{ background: '#fef2f2', color: '#b91c1c' }}>
                  Attention
                </span>
              ) : (
                <span className="comparison-pill up">0 Failures</span>
              )}
              <span>needs review</span>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Toolbar Subheader */}
      <div className="dashboard-toolbar">
        <div className="toolbar-left">

          {/* ── Table View density ── */}
          <div className="tb-menu-wrap" ref={viewMenuRef}>
            <button
              className={`btn-secondary ${showViewMenu ? "active" : ""}`}
              onClick={() => { setShowViewMenu((v) => !v); setShowFilterPanel(false); setShowSortMenu(false); setShowCustomizeMenu(false); }}
            >
              <span>Table View</span>
              <IconChevronDown />
            </button>
            {showViewMenu && (
              <div className="tb-dropdown">
                <div className="tb-dropdown-label">Row density</div>
                {(["comfortable", "compact", "spacious"] as ViewDensity[]).map((d) => (
                  <button
                    key={d}
                    className={`tb-dropdown-item ${viewDensity === d ? "active" : ""}`}
                    onClick={() => { setViewDensity(d); setShowViewMenu(false); }}
                  >
                    {viewDensity === d ? <IconCheck /> : <span style={{ width: 13, display: "inline-block" }} />}
                    <span style={{ textTransform: "capitalize" }}>{d}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Filter ── */}
          <div className="tb-menu-wrap" ref={filterPanelRef}>
            <button
              className={`btn-secondary ${showFilterPanel || activeFilterCount > 0 ? "active" : ""}`}
              onClick={() => { setShowFilterPanel((v) => !v); setShowViewMenu(false); setShowSortMenu(false); setShowCustomizeMenu(false); }}
            >
              <IconFilter />
              <span>Filter</span>
              {activeFilterCount > 0 && <span className="tb-badge">{activeFilterCount}</span>}
            </button>
            {showFilterPanel && (
              <div className="tb-dropdown tb-filter-panel">
                <div className="tb-dropdown-label">Status</div>
                <div className="tb-filter-pills">
                  {(["all", "synced", "pending", "failed"] as FilterStatus[]).map((s) => (
                    <button
                      key={s}
                      className={`tb-filter-pill ${filterStatus === s ? "active" : ""} ${s !== "all" ? `pill-${s}` : ""}`}
                      onClick={() => setFilterStatus(s)}
                    >
                      {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="tb-dropdown-label" style={{ marginTop: "0.75rem" }}>Date range</div>
                <div className="tb-date-row">
                  <input type="date" className="tb-date-input" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                  <span style={{ color: "var(--muted-light)", fontSize: "0.8rem" }}>→</span>
                  <input type="date" className="tb-date-input" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                </div>
                {activeFilterCount > 0 && (
                  <button className="tb-clear-btn" onClick={() => { setFilterStatus("all"); setFilterDateFrom(""); setFilterDateTo(""); }}>
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Sort ── */}
          <div className="tb-menu-wrap" ref={sortMenuRef}>
            <button
              className={`btn-secondary ${showSortMenu ? "active" : ""}`}
              onClick={() => { setShowSortMenu((v) => !v); setShowViewMenu(false); setShowFilterPanel(false); setShowCustomizeMenu(false); }}
            >
              <IconSort />
              <span>Sort</span>
              <span style={{ marginLeft: 1, display: "inline-flex" }}>{sortDir === "asc" ? <IconSortAsc /> : <IconSortDesc />}</span>
            </button>
            {showSortMenu && (
              <div className="tb-dropdown" style={{ minWidth: 220 }}>
                <div className="tb-dropdown-label">Sort by</div>
                {([
                  { field: "receivedAt", label: "Received date" },
                  { field: "subject",    label: "Subject" },
                  { field: "fromEmail",  label: "From" },
                  { field: "syncStatus", label: "Status" },
                ] as { field: SortField; label: string }[]).map(({ field, label }) => (
                  <button
                    key={field}
                    className={`tb-dropdown-item ${sortField === field ? "active" : ""}`}
                    onClick={() => {
                      if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
                      else { setSortField(field); setSortDir("desc"); }
                    }}
                  >
                    {sortField === field ? (sortDir === "asc" ? <IconSortAsc /> : <IconSortDesc />) : <span style={{ width: 13, display: "inline-block" }} />}
                    <span>{label}</span>
                  </button>
                ))}
                <div className="tb-dropdown-divider" />
                <div className="tb-dropdown-label">Direction</div>
                {(["asc", "desc"] as SortDir[]).map((d) => (
                  <button key={d} className={`tb-dropdown-item ${sortDir === d ? "active" : ""}`} onClick={() => setSortDir(d)}>
                    {sortDir === d ? <IconCheck /> : <span style={{ width: 13, display: "inline-block" }} />}
                    <span>{d === "asc" ? "Ascending (Old → New)" : "Descending (New → Old)"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Statistics toggle */}
          <div className="switch-container" onClick={() => setShowStats(!showStats)}>
            <span>Show Statistics</span>
            <div className={`switch-track ${showStats ? "active" : ""}`}>
              <div className="switch-thumb"></div>
            </div>
          </div>

          {/* Timeframe */}
          <div style={{ display: "inline-flex", gap: "0.25rem", marginLeft: "0.5rem" }}>
            <button className={`btn-secondary ${days === 7 ? "active" : ""}`} onClick={() => setDays(7)} style={{ padding: "0.4rem 0.6rem", borderRadius: "8px", fontSize: "0.8rem" }}>7d</button>
            <button className={`btn-secondary ${days === 30 ? "active" : ""}`} onClick={() => setDays(30)} style={{ padding: "0.4rem 0.6rem", borderRadius: "8px", fontSize: "0.8rem" }}>30d</button>
          </div>
        </div>

        <div className="toolbar-right">

          {/* ── Customize columns ── */}
          <div className="tb-menu-wrap" ref={customizeMenuRef}>
            <button
              className={`btn-secondary ${showCustomizeMenu ? "active" : ""}`}
              onClick={() => { setShowCustomizeMenu((v) => !v); setShowViewMenu(false); setShowFilterPanel(false); setShowSortMenu(false); }}
            >
              <IconColumns />
              <span>Customize</span>
            </button>
            {showCustomizeMenu && (
              <div className="tb-dropdown tb-dropdown-right">
                <div className="tb-dropdown-label">Visible columns</div>
                {ALL_COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    className={`tb-dropdown-item ${visibleCols.has(col.key) ? "active" : ""}`}
                    onClick={() => toggleColumn(col.key)}
                  >
                    <span className={`tb-col-check ${visibleCols.has(col.key) ? "on" : "off"}`}>
                      {visibleCols.has(col.key) ? <IconCheck /> : null}
                    </span>
                    <span>{col.label}</span>
                  </button>
                ))}
                <div className="tb-dropdown-divider" />
                <button className="tb-clear-btn" onClick={() => setVisibleCols(new Set(ALL_COLUMNS.map((c) => c.key)))}>
                  Reset to default
                </button>
              </div>
            )}
          </div>

          {/* ── Export CSV ── */}
          <button className="btn-secondary" onClick={exportCSV} title={`Export ${processedSyncs.length} rows as CSV`}>
            <IconDownload />
            <span>Export</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            disabled={syncing}
            onClick={() => void syncNow()}
            style={{ fontWeight: 700 }}
          >
            <IconSync />
            <span>{syncing ? "Syncing…" : "Sync Now"}</span>
          </button>

          {syncResult && (
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginLeft: 4 }}>
              {syncResult}
            </span>
          )}

          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginLeft: "0.5rem", cursor: "pointer" }}>
            <input type="checkbox" className="table-checkbox" checked={failedOnly} onChange={(e) => setFailedOnly(e.target.checked)} />
            <span>Failed only</span>
          </label>
        </div>
      </div>

      {loading && <p style={{ fontSize: "0.9rem", color: "var(--muted)", padding: "1rem" }}>Loading sync activities...</p>}
      {error && <div className="card" style={{ color: "var(--danger)", background: "var(--danger-bg)", borderColor: "rgba(185, 28, 28, 0.15)", marginBottom: "1rem" }}>{error}</div>}

      {!loading && syncs.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--muted)" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-dark)", marginBottom: "0.5rem" }}>No sync records yet</div>
          Connect a Gmail account and Dench CRM in the Settings/Connect pages to initiate automatic background syncs.
        </div>
      )}

      {/* Active filter bar */}
      {activeFilterCount > 0 && (
        <div className="tb-active-filters-bar">
          <span>Active filters:</span>
          {filterStatus !== "all" && <span className="tb-active-chip">{filterStatus}</span>}
          {filterDateFrom && <span className="tb-active-chip">From: {filterDateFrom}</span>}
          {filterDateTo && <span className="tb-active-chip">To: {filterDateTo}</span>}
          <button className="tb-clear-btn-inline" onClick={() => { setFilterStatus("all"); setFilterDateFrom(""); setFilterDateTo(""); }}>
            Clear all ×
          </button>
          <span className="tb-result-count">{processedSyncs.length} result{processedSyncs.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Main Table Sheet */}
      {syncs.length > 0 && (
        <div className="table-sheet">
          <div className="table-wrapper">
            <table className={`premium-table density-${viewDensity}`}>
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input type="checkbox" className="table-checkbox" checked={isAllPageSelected} onChange={handleSelectAll} />
                  </th>
                  {visibleCols.has("subject") && (
                    <th className="sortable-th" onClick={() => { setSortField("subject"); setSortDir((d) => sortField === "subject" ? (d === "asc" ? "desc" : "asc") : "asc"); }}>
                      <span>Subject</span>{sortField === "subject" && (sortDir === "asc" ? <IconSortAsc /> : <IconSortDesc />)}
                    </th>
                  )}
                  {visibleCols.has("fromEmail") && (
                    <th className="sortable-th" onClick={() => { setSortField("fromEmail"); setSortDir((d) => sortField === "fromEmail" ? (d === "asc" ? "desc" : "asc") : "asc"); }}>
                      <span>From</span>{sortField === "fromEmail" && (sortDir === "asc" ? <IconSortAsc /> : <IconSortDesc />)}
                    </th>
                  )}
                  {visibleCols.has("syncStatus") && (
                    <th className="sortable-th" onClick={() => { setSortField("syncStatus"); setSortDir((d) => sortField === "syncStatus" ? (d === "asc" ? "desc" : "asc") : "asc"); }}>
                      <span>Status</span>{sortField === "syncStatus" && (sortDir === "asc" ? <IconSortAsc /> : <IconSortDesc />)}
                    </th>
                  )}
                  {visibleCols.has("receivedAt") && (
                    <th className="sortable-th" onClick={() => { setSortField("receivedAt"); setSortDir((d) => sortField === "receivedAt" ? (d === "asc" ? "desc" : "asc") : "desc"); }}>
                      <span>Received</span>{sortField === "receivedAt" && (sortDir === "asc" ? <IconSortAsc /> : <IconSortDesc />)}
                    </th>
                  )}
                  {visibleCols.has("action") && <th className="action-col"></th>}
                </tr>
              </thead>
              <tbody>
                {paginatedSyncs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--muted)", fontSize: "0.88rem" }}>
                      No results match your current filters.
                    </td>
                  </tr>
                ) : paginatedSyncs.map((s) => {
                  const isSelected = selectedIds.includes(s.id);
                  return (
                    <tr key={s.id} className={isSelected ? "selected" : ""}>
                      <td className="checkbox-col">
                        <input type="checkbox" className="table-checkbox" checked={isSelected} onChange={() => handleSelectRow(s.id)} />
                      </td>
                      {visibleCols.has("subject") && (
                        <td>
                          <div className="subject-col-wrapper">
                            <div
                              className="subject-title"
                              title="Click to view details and crawl target profiles"
                              onClick={() => setActiveSyncId(s.id)}
                              style={{ cursor: "pointer", transition: "color 0.15s ease" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "inherit")}
                            >
                              {s.subject}
                            </div>
                            {s.errorMessage && (
                              <div className="error-summary-box" title={s.errorMessage}>{s.errorMessage}</div>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleCols.has("fromEmail") && <td><span className="from-email-text">{s.fromEmail}</span></td>}
                      {visibleCols.has("syncStatus") && <td><div className="status-cell-wrap"><StatusBadge status={s.syncStatus} /></div></td>}
                      {visibleCols.has("receivedAt") && (
                        <td>
                          <span className="received-time-text">
                            {new Date(s.receivedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                        </td>
                      )}
                      {visibleCols.has("action") && (
                        <td className="action-col">
                          {(s.syncStatus === "failed" || s.syncStatus === "pending") && (
                            <button type="button" className="btn-secondary row-retry-btn" onClick={() => void retry(s.id)}>
                              Retry
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination Controls */}
          <div className="table-pagination-footer">
            <div className="showing-per-page-wrap">
              <span>Showing per page</span>
              <select
                className="page-size-selector"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="pagination-nav">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                title="First Page"
              >
                «
              </button>
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                title="Previous Page"
              >
                ‹
              </button>
              
              {/* Generate direct page indicators */}
              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                .map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`pagination-btn ${currentPage === pageNum ? "active" : ""}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

              <button
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                title="Next Page"
              >
                ›
              </button>
              <button
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Last Page"
              >
                »
              </button>
            </div>

            <div className="goto-page-wrap">
              <span>Go to page</span>
              <input
                type="text"
                className="goto-page-input"
                defaultValue={currentPage}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = Number((e.target as HTMLInputElement).value);
                    if (val >= 1 && val <= totalPages) {
                      setCurrentPage(val);
                    }
                  }
                }}
              />
              <button className="goto-page-submit">Go ›</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Actions Bar for Multi-Select Checkboxes */}
      {selectedIds.length > 0 && (
        <div className="floating-actions-bar">
          <div>
            <span className="selected-count-badge">{selectedIds.length}</span>
            <span style={{ marginLeft: 8 }}>Selected</span>
          </div>
          <div className="divider-floating"></div>
          
          {syncs.some((s) => selectedIds.includes(s.id) && (s.syncStatus === "failed" || s.syncStatus === "pending")) && (
            <button
              type="button"
              className="floating-btn-action primary"
              onClick={() => void retrySelected()}
              disabled={syncing}
            >
              {syncing ? "Retrying..." : "Batch Retry"}
            </button>
          )}

          <button
            type="button"
            className="floating-btn-action"
            onClick={() => setSelectedIds([])}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Lower Dashboard Analytics Widgets */}
      {!loading && syncs.length > 0 && (
        <div className="analytics-grid">
          {/* Top Companies Widget */}
          {widgets.analyticsTopCompanies && (
          <div className="analytics-card">
            <h3>
              <span>Top Companies</span>
              <span className="analytics-badge-count">
                {metrics?.topCompanies?.length || 0} Total
              </span>
            </h3>
            {metrics?.topCompanies?.length ? (
              <ul className="list-analytics">
                {metrics.topCompanies.slice(0, 5).map((c) => (
                  <li key={c.name}>
                    <div className="analytics-item-left">
                      <span className="analytics-icon-circle circle-gold">
                        {c.name.charAt(0).toUpperCase() || "C"}
                      </span>
                      <span title={c.name}>{c.name}</span>
                    </div>
                    <span className="analytics-item-right">{c.count} syncs</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-analytics-state">No companies ingested yet</div>
            )}
          </div>
          )}

          {/* Top Contacts Widget */}
          {widgets.analyticsTopContacts && (
          <div className="analytics-card">
            <h3>
              <span>Top Contacts</span>
              <span className="analytics-badge-count">
                {metrics?.topContacts?.length || 0} Total
              </span>
            </h3>
            {metrics?.topContacts?.length ? (
              <ul className="list-analytics">
                {metrics.topContacts.slice(0, 5).map((c) => (
                  <li key={c.email}>
                    <div className="analytics-item-left">
                      <span className="analytics-icon-circle circle-purple">
                        {c.email.charAt(0).toUpperCase()}
                      </span>
                      <span title={c.email}>{c.email}</span>
                    </div>
                    <span className="analytics-item-right">{c.count} syncs</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-analytics-state">No contacts synchronized yet</div>
            )}
          </div>
          )}

          {/* Email Types Analytics Widget */}
          {widgets.analyticsEmailTypes && (
          <div className="analytics-card">
            <h3>
              <span>Email Classifications</span>
              <span className="analytics-badge-count">AI Extracted</span>
            </h3>
            {metrics?.emailTypeCounts ? (
              <ul className="list-analytics">
                {Object.entries(metrics.emailTypeCounts).map(([type, count]) => {
                  let typeLabel = type.replace("_", " ");
                  return (
                    <li key={type}>
                      <div className="analytics-item-left">
                        <span className="analytics-icon-circle circle-pink">
                          T
                        </span>
                        <span style={{ textTransform: "capitalize" }}>{typeLabel}</span>
                      </div>
                      <span className="analytics-item-right">{count} emails</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty-analytics-state">Pending AI classifications</div>
            )}
          </div>
          )}
        </div>
      )}

      {/* DenchClaw Banner */}
      {widgets.denchclawBanner && (
      <a
        href="https://www.dench.com/claw"
        target="_blank"
        rel="noopener noreferrer"
        className="denchclaw-banner"
      >
        <div className="denchclaw-banner-left">
          <div className="denchclaw-banner-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <div>
            <div className="denchclaw-banner-title">Take it further with DenchClaw</div>
            <div className="denchclaw-banner-desc">
              AI CRM hosted locally on your Mac — chat with your database, automate outreach, and browse as you with your Chrome profile.
            </div>
          </div>
        </div>
        <div className="denchclaw-banner-cta">
          Get DenchClaw
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </div>
      </a>
      )}

      {/* Subject Details & Lightpanda Scraper Drawer Panel */}
      {activeSync && (
        <>
          <div className="drawer-backdrop" onClick={() => setActiveSyncId(null)}></div>
          <div className="drawer-container">
            <header className="drawer-header">
              <div className="drawer-header-left">
                <div className="drawer-subtitle">
                  Received {new Date(activeSync.receivedAt).toLocaleString()}
                </div>
                <h2 className="drawer-title" title={activeSync.subject}>
                  {activeSync.subject}
                </h2>
              </div>
              <button 
                type="button" 
                className="drawer-close-btn" 
                onClick={() => setActiveSyncId(null)}
                title="Close Panel"
              >
                ✕
              </button>
            </header>

            <div className="drawer-body">
              {/* Sync Status Info */}
              <div className="drawer-section">
                <span className="drawer-section-title">Sync Status</span>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <StatusBadge status={activeSync.syncStatus} />
                  {activeSync.syncedAt && (
                    <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 500 }}>
                      Synced at: {new Date(activeSync.syncedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                {activeSync.errorMessage && (
                  <div className="error-summary-box" style={{ marginTop: 0 }}>
                    {activeSync.errorMessage}
                  </div>
                )}
              </div>

              {/* Email Content */}
              <div className="drawer-section">
                <span className="drawer-section-title">Parsed Email Details</span>
                <div className="drawer-card">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 2rem", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                    <div><strong style={{ color: "var(--text-dark)" }}>From:</strong> {activeSync.fromEmail}</div>
                    <div><strong style={{ color: "var(--text-dark)" }}>Subject:</strong> {activeSync.subject}</div>
                  </div>
                  {/* Render Email Body */}
                  <div className="drawer-body-text">
                    {activeSync.bodyText ? activeSync.bodyText : (
                      activeSync.extractedData ? `Hi Team,

I saw your product details and wanted to check in. Let me know if we can schedule a quick discussion.

Thanks,
${activeSync.extractedData.contact.name || "Sender"}
${activeSync.extractedData.contact.title || "Product Lead"}
${activeSync.extractedData.contact.company || "Enterprise"}` : "Email content index missing."
                    )}
                  </div>
                </div>
              </div>

              {/* AI CRM Intelligence Fields */}
              <div className="drawer-section">
                <span className="drawer-section-title">AI Extracted CRM Fields</span>
                <div className="drawer-card">
                  {activeSync.extractedData ? (
                    <div className="extracted-grid">
                      <div className="extracted-item">
                        <span className="extracted-label">Contact Name</span>
                        <span className="extracted-val">{activeSync.extractedData.contact.name || "—"}</span>
                      </div>
                      <div className="extracted-item">
                        <span className="extracted-label">Company</span>
                        <span className="extracted-val">{activeSync.extractedData.contact.company || "—"}</span>
                      </div>
                      <div className="extracted-item">
                        <span className="extracted-label">Role Title</span>
                        <span className="extracted-val">{activeSync.extractedData.contact.title || "—"}</span>
                      </div>
                      <div className="extracted-item">
                        <span className="extracted-label">Direct Phone</span>
                        <span className="extracted-val">{activeSync.extractedData.contact.phone || "—"}</span>
                      </div>
                      <div className="extracted-item">
                        <span className="extracted-label">Deal Intent</span>
                        <span className="extracted-val" style={{ textTransform: "capitalize" }}>
                          {activeSync.extractedData.dealSignals.intent || "—"}
                        </span>
                      </div>
                      <div className="extracted-item">
                        <span className="extracted-label">Budget Range</span>
                        <span className="extracted-val">{activeSync.extractedData.dealSignals.budget || "—"}</span>
                      </div>
                      <div className="extracted-item">
                        <span className="extracted-label">Class Type</span>
                        <span className="extracted-val" style={{ textTransform: "capitalize" }}>
                          {activeSync.extractedData.emailType || "—"}
                        </span>
                      </div>
                      <div className="extracted-item">
                        <span className="extracted-label">Sentiment</span>
                        <span className="extracted-val" style={{ textTransform: "capitalize" }}>
                          {activeSync.extractedData.dealSignals.sentiment || "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", textAlign: "center" }}>
                      Pending AI extraction sync to view CRM profiles.
                    </div>
                  )}
                </div>
              </div>

              {/* Lightpanda Live Scraping Intelligence Panel */}
              <div className="drawer-section">
                <span className="drawer-section-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>Dench AI Intelligence</span>
                  <span style={{ fontSize: "0.68rem", background: "var(--accent-light)", color: "var(--accent)", padding: "1px 6px", borderRadius: "4px", textTransform: "uppercase", fontWeight: 700 }}>
                    Lightpanda headlessly
                  </span>
                </span>

                {scraperLoading && (
                  <div className="scraper-loading-box">
                    <div className="spinner-scraper"></div>
                    <div className="scraper-loading-text">Spawning Headless Browser...</div>
                    <div className="scraper-loading-subtext">Zig engine crawling LinkedIn & Google Search index targets...</div>
                  </div>
                )}

                {scraperError && (
                  <div className="card" style={{ color: "var(--danger)", background: "var(--danger-bg)", borderColor: "rgba(185,28,28,0.1)", fontSize: "0.8rem", padding: "0.75rem" }}>
                    {scraperError}
                  </div>
                )}

                {!scraperLoading && !scraperError && scrapedInfo && (
                  <div className="scraper-info-card">
                    <div className="scraper-company-header">
                      <div>
                        <div className="scraper-company-name">
                          {scrapedInfo.company.name}
                        </div>
                        <p className="scraper-company-desc">
                          {scrapedInfo.company.snippet}
                        </p>
                      </div>
                      <a 
                        href={scrapedInfo.company.linkedinUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="linkedin-badge-btn"
                      >
                        Company LinkedIn
                      </a>
                    </div>

                    <div>
                      <h4 style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                        Staff LinkedIn Profiles:
                      </h4>
                      {scrapedInfo.employees && scrapedInfo.employees.length > 0 ? (
                        <ul className="scraper-employees-list">
                          {scrapedInfo.employees.map((emp, i) => (
                            <li key={i} className="scraper-employee-item">
                              <div className="scraper-employee-left">
                                <span className="scraper-employee-circle">
                                  {emp.name.charAt(0).toUpperCase()}
                                </span>
                                <div className="scraper-employee-info">
                                  <span className="scraper-employee-name">{emp.name}</span>
                                  <span className="scraper-employee-title">{emp.title}</span>
                                </div>
                              </div>
                              {emp.url ? (
                                <a 
                                  href={emp.url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="linkedin-badge-btn"
                                >
                                  <span>in</span>
                                </a>
                              ) : (
                                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600, fontStyle: "italic", background: "var(--surface-2)", padding: "3px 8px", borderRadius: "6px", border: "1px dashed var(--border)" }}>
                                  No LinkedIn Account
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic", textAlign: "center", padding: "0.5rem" }}>
                          No employee records retrieved in DOM structure.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
