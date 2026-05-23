import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ConnectPage } from './pages/ConnectPage';
import { GmailCallbackPage } from './pages/GmailCallbackPage';
import { SettingsPage } from './pages/SettingsPage';
import { PeoplePage } from './pages/PeoplePage';
import { EmailPage } from './pages/EmailPage';
import { AutomationPage } from './pages/AutomationPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { IntegrationPage } from './pages/IntegrationPage';
import { HelpPage } from './pages/HelpPage';
import { MessagesPage } from './pages/MessagesPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { ActiveFiltersPage } from './pages/ActiveFiltersPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { DealSignalsPage } from './pages/DealSignalsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/connect/gmail/callback" element={<GmailCallbackPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/connect" element={<ConnectPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/email" element={<EmailPage />} />
        <Route path="/automation" element={<AutomationPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/integrations" element={<IntegrationPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/active-filters" element={<ActiveFiltersPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/signals" element={<DealSignalsPage />} />
      </Route>
    </Routes>
  );
}
