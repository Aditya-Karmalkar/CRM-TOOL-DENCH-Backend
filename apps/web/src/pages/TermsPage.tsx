import React from 'react';

export function TermsPage() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 2rem', fontFamily: 'system-ui, sans-serif', color: 'var(--text-dark)', lineHeight: '1.6' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Terms of Service</h1>
            <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Last updated: May 2026</p>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>1. Acceptance of Terms</h2>
                <p>By accessing and using Dench CRM ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>2. Description of Service</h2>
                <p>Dench CRM provides an AI-powered synchronization tool that connects your email accounts (such as Gmail) to your Customer Relationship Management (CRM) software. We extract relevant business data from your emails to automate data entry.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>3. User Obligations</h2>
                <p>You agree to:</p>
                <ul style={{ paddingLeft: '1.5rem', margin: '1rem 0' }}>
                    <li>Provide accurate information when creating an account.</li>
                    <li>Maintain the security of your account and credentials.</li>
                    <li>Only connect email accounts that you own or have explicit authorization to access and process.</li>
                    <li>Not use the Service for any unlawful or unauthorized purpose.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>4. Third-Party Integrations</h2>
                <p>Our Service relies on third-party APIs (such as Google Workspace and various CRM providers). Your use of these integrations is also subject to the respective terms and conditions of those third parties. We are not responsible for the availability or performance of these third-party services.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>5. Limitation of Liability</h2>
                <p>To the maximum extent permitted by law, Dench CRM shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service, including but not limited to loss of profits, data, or business opportunities.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>6. Changes to Terms</h2>
                <p>We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
            </section>
        </div>
    );
}
