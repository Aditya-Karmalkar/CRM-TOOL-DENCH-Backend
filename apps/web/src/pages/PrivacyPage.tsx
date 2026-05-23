

export function PrivacyPage() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 2rem', fontFamily: 'system-ui, sans-serif', color: 'var(--text-dark)', lineHeight: '1.6' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Privacy Policy</h1>
            <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Last updated: May 2026</p>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>1. Introduction</h2>
                <p>Welcome to Dench CRM. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our service.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>2. Google Workspace APIs and User Data Policy</h2>
                <p>Our application integrates with your Google Workspace account to provide automated CRM syncing.</p>
                <div style={{ background: 'var(--surface-light)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)', margin: '1rem 0' }}>
                    <strong>Google API Services User Data Policy Compliance:</strong><br/>
                    Dench CRM's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Google API Services User Data Policy</a>, including the Limited Use requirements.
                </div>
                <p>Specifically, when you connect your Gmail account, we:</p>
                <ul style={{ paddingLeft: '1.5rem', margin: '1rem 0' }}>
                    <li><strong>Read access:</strong> We only read email content (subject, body, sender) to extract contact information and deal signals using AI.</li>
                    <li><strong>No human reading:</strong> Your emails are processed by automated AI models. No human will read your emails unless you explicitly grant us permission for support purposes, or it is required for security/legal compliance.</li>
                    <li><strong>No selling data:</strong> We do not sell your Google user data to third parties. It is strictly used to provide and improve the CRM syncing functionality.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>3. Information We Collect</h2>
                <p>We collect information you provide directly to us (such as account creation details) and information we automatically extract on your behalf (such as CRM contact metadata parsed from your connected inbox).</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>4. Data Security</h2>
                <p>We use industry-standard encryption (AES-256) to protect your OAuth tokens and sensitive data at rest and in transit. We maintain strict access controls to ensure your data is secure.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>5. Data Retention and Deletion</h2>
                <p>We retain your extracted CRM data only for as long as your account is active. You may disconnect your Google account or delete your Dench CRM account at any time, at which point all associated authentication tokens and cached emails are permanently deleted from our servers.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>6. Contact Us</h2>
                <p>If you have any questions about this Privacy Policy or our use of Google API Services, please contact us at support@denchcrm.com.</p>
            </section>
        </div>
    );
}
