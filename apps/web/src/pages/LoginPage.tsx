import { useAuth } from "../context/AuthContext";
import { DenchLogo } from "../assets/DenchLogo";
import "./Login.css";

export function LoginPage() {
    const { signIn } = useAuth();

    return (
        <main className="login-page" aria-label="Dench CRM Login">
            <div className="login-split-card">

                {/* ── LEFT PANEL ── */}
                <aside className="login-left-panel" aria-hidden="true">
                    {/* Watermark — large faded logo */}
                    <div className="login-watermark" aria-hidden="true">
                        <DenchLogo size={340} className="watermark-logo" />
                    </div>
                    <div className="login-left-content">
                        <div className="login-brand-row">
                            <DenchLogo size={36} />
                            <span className="login-brand-name">Dench CRM</span>
                        </div>
                        <p className="login-left-desc">
                            Your complete AI-powered sales intelligence platform. Ingest emails,
                            extract intent, and synchronize your pipeline — all in one place.
                        </p>
                        <nav className="login-left-footer-links" aria-label="Help navigation">
                            <a href="#about">About</a>
                            <a href="#faq">FAQ</a>
                            <a href="#support">Support</a>
                        </nav>
                    </div>
                </aside>

                {/* ── RIGHT PANEL ── */}
                <section className="login-right-panel">
                    <div className="login-form-wrap">
                        <div className="login-heading-block">
                            <h1 className="login-main-title">Welcome back</h1>
                            <p className="login-main-subtitle">
                                Sign in with your Google Workspace account to continue to your dashboard.
                            </p>
                        </div>

                        <button
                            id="google-signin-btn"
                            type="button"
                            className="login-google-btn"
                            onClick={() => void signIn()}
                            title="Sign in using your Google Workspace account"
                        >
                            <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.77-2.4 3.61v3h3.86c2.26-2.08 3.59-5.14 3.59-8.46z" />
                                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.18 0-5.86-2.15-6.82-5.06H1.18v3.1A12 12 0 0 0 12 24z" />
                                <path fill="#FBBC05" d="M5.18 14.19A7.17 7.17 0 0 1 4.75 12c0-.77.13-1.51.37-2.19V6.7H1.18A12 12 0 0 0 0 12c0 1.93.46 3.75 1.18 5.3l4-3.11z" />
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 6.46 0 1.6 4.75.18 9.81l4 3.11C5.14 9.9 7.82 7.75 12 4.75z" />
                            </svg>
                            <span>Sign in with Google</span>
                        </button>

                        <p className="login-privacy-note">
                            By signing in you agree to our{" "}
                            <a href="#terms">Terms of Service</a> and{" "}
                            <a href="#privacy">Privacy Policy</a>.
                        </p>
                    </div>

                    <footer className="login-right-footer">
                        <div className="login-footer-badges">
                            <div className="login-footer-badge">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <span>End-to-end encrypted</span>
                            </div>
                            <div className="login-footer-badge-dot" aria-hidden="true">·</div>
                            <div className="login-footer-badge">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Local-first sandbox</span>
                            </div>
                        </div>
                        <span className="login-copyright">Dench CRM · AI Sync Engine · All rights reserved.</span>
                    </footer>
                </section>

            </div>
        </main>
    );
}
