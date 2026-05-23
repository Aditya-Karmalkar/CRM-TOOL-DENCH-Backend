import { createContext, useContext, useState, useCallback } from "react";

export interface WidgetConfig {
  metricEmailsProcessed: boolean;
  metricExtractionCoverage: boolean;
  metricSyncSuccess: boolean;
  metricSyncFailures: boolean;
  analyticsTopCompanies: boolean;
  analyticsTopContacts: boolean;
  analyticsEmailTypes: boolean;
  denchclawBanner: boolean;
}

const DEFAULTS: WidgetConfig = {
  metricEmailsProcessed: true,
  metricExtractionCoverage: true,
  metricSyncSuccess: true,
  metricSyncFailures: true,
  analyticsTopCompanies: true,
  analyticsTopContacts: true,
  analyticsEmailTypes: true,
  denchclawBanner: true,
};

const WIDGET_LABELS: Record<keyof WidgetConfig, string> = {
  metricEmailsProcessed: "Emails Processed card",
  metricExtractionCoverage: "Extraction Coverage card",
  metricSyncSuccess: "Sync Success card",
  metricSyncFailures: "Sync Failures card",
  analyticsTopCompanies: "Top Companies widget",
  analyticsTopContacts: "Top Contacts widget",
  analyticsEmailTypes: "Email Classifications widget",
  denchclawBanner: "DenchClaw banner",
};

const WIDGET_GROUPS = [
  {
    label: "Metric Cards",
    keys: ["metricEmailsProcessed", "metricExtractionCoverage", "metricSyncSuccess", "metricSyncFailures"] as (keyof WidgetConfig)[],
  },
  {
    label: "Analytics Widgets",
    keys: ["analyticsTopCompanies", "analyticsTopContacts", "analyticsEmailTypes"] as (keyof WidgetConfig)[],
  },
  {
    label: "Other",
    keys: ["denchclawBanner"] as (keyof WidgetConfig)[],
  },
];

interface WidgetContextValue {
  widgets: WidgetConfig;
  toggle: (key: keyof WidgetConfig) => void;
  reset: () => void;
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  groups: typeof WIDGET_GROUPS;
  labels: typeof WIDGET_LABELS;
}

const WidgetContext = createContext<WidgetContextValue | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  const [widgets, setWidgets] = useState<WidgetConfig>(DEFAULTS);
  const [panelOpen, setPanelOpen] = useState(false);

  const toggle = useCallback((key: keyof WidgetConfig) => {
    setWidgets(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const reset = useCallback(() => setWidgets(DEFAULTS), []);
  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return (
    <WidgetContext.Provider value={{ widgets, toggle, reset, panelOpen, openPanel, closePanel, groups: WIDGET_GROUPS, labels: WIDGET_LABELS }}>
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidgets() {
  const ctx = useContext(WidgetContext);
  if (!ctx) throw new Error("useWidgets must be used inside WidgetProvider");
  return ctx;
}
