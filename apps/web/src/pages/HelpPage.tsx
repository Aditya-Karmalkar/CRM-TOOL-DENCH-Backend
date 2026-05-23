import { useState } from "react";
import "./ToolPages.css";

const faqs = [
  { q: "How does Gmail sync work?", a: "Dench CRM connects to your Gmail via OAuth and watches for new emails. When a new email arrives, it's processed by the AI extraction engine to pull out contact details, deal signals, and sentiment — then pushed to HubSpot automatically." },
  { q: "How do I connect HubSpot?", a: "Go to Settings and click 'Connect HubSpot'. You'll be redirected to HubSpot's OAuth flow. Once authorized, Dench CRM will start syncing contacts and activities to your HubSpot portal." },
  { q: "What data does the AI extract?", a: "The AI extracts: contact name, email, company, job title, phone number, deal intent, budget signals, email classification (sales, support, newsletter, etc.), and sentiment (positive, neutral, negative)." },
  { q: "Why are some syncs failing?", a: "Sync failures usually happen due to expired OAuth tokens, HubSpot API rate limits, or missing required fields. Check the Dashboard for error messages on failed syncs and use the Retry button to re-process them." },
  { q: "How do I export my contacts?", a: "Go to the People page and click the Export button in the toolbar. You can export all contacts or just selected ones as a CSV file with all fields included." },
  { q: "What is Lightpanda used for?", a: "Lightpanda is a high-speed headless browser built in Zig. Dench CRM uses it to scrape LinkedIn company profiles and employee data when you open the detail panel on a sync record in the Dashboard." },
  { q: "Can I set up automations?", a: "Yes — go to the Automation page to create trigger-based workflows. For example, automatically send a follow-up email when a new contact is added, or alert your team when a deal reaches the qualified stage." },
];

const guides = [
  { title: "Getting started with Dench CRM", time: "5 min read", tag: "Beginner" },
  { title: "Setting up Gmail sync", time: "3 min read", tag: "Setup" },
  { title: "Connecting HubSpot", time: "4 min read", tag: "Setup" },
  { title: "Understanding AI extraction", time: "6 min read", tag: "Advanced" },
  { title: "Building automations", time: "8 min read", tag: "Advanced" },
  { title: "Exporting and managing contacts", time: "3 min read", tag: "People" },
];

export function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filteredFaqs = faqs.filter(f =>
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <div>
          <h1 className="tool-page-title">Help Center</h1>
          <p className="tool-page-subtitle">Guides, FAQs, and support resources</p>
        </div>
      </div>

      {/* Search */}
      <div className="help-search-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted-light)", flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="help-search-input"
          placeholder="Search help articles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="help-grid">
        {/* FAQs */}
        <div>
          <div className="tool-card-title" style={{ marginBottom: "1rem" }}>Frequently Asked Questions</div>
          <div className="faq-list">
            {filteredFaqs.length === 0 ? (
              <div className="tool-empty-state">No results for "{search}"</div>
            ) : filteredFaqs.map((faq, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? "open" : ""}`}>
                <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {openFaq === i && <div className="faq-answer">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Guides */}
        <div>
          <div className="tool-card-title" style={{ marginBottom: "1rem" }}>Guides</div>
          <div className="guides-list">
            {guides.map((g, i) => (
              <div key={i} className="guide-item">
                <div>
                  <div className="guide-title">{g.title}</div>
                  <div className="guide-meta">{g.time}</div>
                </div>
                <span className="tool-tag">{g.tag}</span>
              </div>
            ))}
          </div>

          <div className="help-contact-box">
            <div className="tool-card-title">Still need help?</div>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.4rem", marginBottom: "1rem" }}>
              Can't find what you're looking for? Reach out to the team.
            </p>
            <a href="mailto:support@dench.ai" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)" }}>
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
