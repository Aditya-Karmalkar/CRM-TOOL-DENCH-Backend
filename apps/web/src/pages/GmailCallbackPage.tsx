import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

export function GmailCallbackPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    // Guard against React StrictMode double-invoking useEffect in development.
    // Google's OAuth codes are single-use — a second exchange causes invalid_grant.
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const code = params.get("code");
        const oauthError = params.get("error");

        if (oauthError) {
            setError(oauthError);
            return;
        }

        if (!code) {
            setError("Missing authorization code");
            return;
        }

        void apiFetch("/accounts/gmail/connect", {
            method: "POST",
            body: JSON.stringify({ code }),
        })
            .then(() => navigate("/connect", { replace: true }))
            .catch((err: Error) => setError(err.message));
    }, [params, navigate]);

    return (
        <div className="login-page">
            <div className="card login-card">
                {error ? (
                    <>
                        <h1>Gmail connect failed</h1>
                        <p style={{ color: "var(--danger)" }}>{error}</p>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => navigate("/connect")}
                        >
                            Back
                        </button>
                    </>
                ) : (
                    <>
                        <h1>Connecting Gmail...</h1>
                        <p>Please wait while we finish setup.</p>
                    </>
                )}
            </div>
        </div>
    );
}
