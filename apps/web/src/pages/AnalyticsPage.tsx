import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./ToolPages.css";

interface Metrics {
  totalProcessed: number;
  syncedCount: number;
  failedCount: number;
  uniqueContacts: number;
  topCompanies: Array<{ name: string; count: number }>;
  topContacts: Array<{ email: string; count: number }>;
  extractionCoverage: number;
  emailTypeCounts: Record<string, number>;
  sentimentCounts: Record<string, number>;
}

const BAR_COLORS = ["var(--accent)", "#6366f1", "#059669", "#d97706", "#ec4899"];

function BarChart({ data, color = "var(--accent)" }: { data: Array<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="analytics-bar-chart">
      {data.map((d, i) => (
        <div key={i} className="analytics-bar-row">
          <span className="analytics-bar-label">{d.label}</span>
          <div className="analytics-bar-track">
            <div className="analytics-bar-fill" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
          <span className="analytics-bar-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void apiFetch<{ metrics: Metrics }>(`/syncs/metrics?days=${days}`)
      .then(d => setMetrics(d.metrics))
      .finally(() => setLoading(false));
  }, [days]);

  const successRate = metrics
    ? metrics.totalProcessed > 0 ? Math.round((metrics.syncedCount / metrics.totalProcessed) * 100) : 0
    : 0;

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <div>
          <h1 className="tool-page-title">Analytics</h1>
          <p className="tool-page-subtitle">Sync performance and contact intelligence</p>
        </div>
        <div className="tool-page-actions">
          <div style={{ display: "flex", gap: "0.25rem" }}>
            {[7, 30, 90].map(d => (
              <button key={d} className={`btn-secondary ${days === d ? "active" : ""}`}
                style={{ padding: "0.4rem 0.7rem", fontSize: "0.8rem" }}
                onClick={() => setDays(d)}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="tool-loading">Loading analytics...</div>
      ) : metrics ? (
        <>
          {/* KPI row */}
          <div className="tool-stats-row">
            <div className="tool-stat-card">
              <div className="tool-stat-value">{metrics.totalProcessed}</div>
              <div className="tool-stat-label">Emails Processed</div>
            </div>
            <div className="tool-stat-card">
              <div className="tool-stat-value" style={{ color: "var(--success)" }}>{metrics.syncedCount}</div>
              <div className="tool-stat-label">Synced</div>
            </div>
            <div className="tool-stat-card">
              <div className="tool-stat-value" style={{ color: successRate >= 80 ? "var(--success)" : "var(--warning)" }}>{successRate}%</div>
              <div className="tool-stat-label">Success Rate</div>
            </div>
            <div className="tool-stat-card">
              <div className="tool-stat-value">{metrics.uniqueContacts}</div>
              <div className="tool-stat-label">Unique Contacts</div>
            </div>
            <div className="tool-stat-card">
              <div className="tool-stat-value">{metrics.extractionCoverage ?? 0}%</div>
              <div className="tool-stat-label">Extraction Coverage</div>
            </div>
          </div>

          <div className="analytics-grid-2">
            {/* Top Companies */}
            <div className="tool-card">
              <div className="tool-card-title">Top Companies</div>
              {metrics.topCompanies?.length ? (
                <BarChart data={metrics.topCompanies.map(c => ({ label: c.name, value: c.count }))} color="var(--accent)" />
              ) : <div className="tool-empty-state">No data yet</div>}
            </div>

            {/* Top Contacts */}
            <div className="tool-card">
              <div className="tool-card-title">Top Contacts</div>
              {metrics.topContacts?.length ? (
                <BarChart data={metrics.topContacts.map(c => ({ label: c.email, value: c.count }))} color="#6366f1" />
              ) : <div className="tool-empty-state">No data yet</div>}
            </div>

            {/* Email Types */}
            <div className="tool-card">
              <div className="tool-card-title">Email Classifications</div>
              {metrics.emailTypeCounts && Object.keys(metrics.emailTypeCounts).length ? (
                <BarChart
                  data={Object.entries(metrics.emailTypeCounts).map(([k, v]) => ({ label: k.replace("_", " "), value: v }))}
                  color="#059669"
                />
              ) : <div className="tool-empty-state">No classifications yet</div>}
            </div>

            {/* Sentiment */}
            <div className="tool-card">
              <div className="tool-card-title">Sentiment Breakdown</div>
              {metrics.sentimentCounts && Object.keys(metrics.sentimentCounts).length ? (
                <div className="sentiment-pills">
                  {Object.entries(metrics.sentimentCounts).map(([sentiment, count], i) => (
                    <div key={sentiment} className="sentiment-pill" style={{ borderColor: BAR_COLORS[i % BAR_COLORS.length], color: BAR_COLORS[i % BAR_COLORS.length] }}>
                      <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{sentiment}</span>
                      <span className="sentiment-count">{count}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="tool-empty-state">No sentiment data yet</div>}
            </div>
          </div>
        </>
      ) : (
        <div className="tool-empty-state">Failed to load analytics.</div>
      )}
    </div>
  );
}
