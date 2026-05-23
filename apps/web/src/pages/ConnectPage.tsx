import { useEffect, useState } from 'react';
import type { Account } from '@crm/shared';
import { apiFetch } from '../lib/api';

export function ConnectPage() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ account: Account | null }>('/accounts/me')
      .then((d) => setAccount(d.account))
      .catch(() => setAccount(null));
  }, []);

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>('/accounts/gmail/auth-url');
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Gmail connect');
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      await apiFetch('/accounts/gmail', { method: 'DELETE' });
      setAccount(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setLoading(false);
    }
  };

  if (account === undefined) return <p>Loading...</p>;

  return (
    <>
      <h1 className="page-title">Connect Gmail</h1>
      <p className="page-subtitle">
        Authorize Gmail access to enable real-time email sync via Watch API.
      </p>

      <div className="card">
        {account ? (
          <>
            <p>
              Connected: <strong>{account.gmailEmail}</strong>
            </p>
            {account.watchExpiry && (
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Watch expires: {new Date(account.watchExpiry).toLocaleString()}
              </p>
            )}
            <button
              type="button"
              className="btn-danger"
              style={{ marginTop: '1rem' }}
              disabled={loading}
              onClick={() => void disconnect()}
            >
              Disconnect Gmail
            </button>
          </>
        ) : (
          <>
            <p style={{ marginBottom: '1rem', color: 'var(--muted)' }}>
              You will be redirected to Google to grant Gmail read/modify permissions.
            </p>
            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              onClick={() => void connect()}
            >
              {loading ? 'Redirecting...' : 'Connect Gmail'}
            </button>
          </>
        )}
        {error && <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>}
      </div>
    </>
  );
}
