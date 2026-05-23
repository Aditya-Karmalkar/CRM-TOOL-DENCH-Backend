# Dench CRM: AI Gmail → CRM Sync Engine

## 📖 Overview
The **AI Gmail → CRM Sync Engine** is a powerful middleware platform designed to eliminate manual data entry for sales teams. It automatically extracts structured CRM data (contacts, companies, deal signals) from Gmail using AI and pushes it directly into connected CRM systems (like HubSpot, Salesforce, Zoho, and Pipedrive) within 1-2 minutes of receiving an email.

This solution ensures CRM data is never stale, captures every crucial deal signal without requiring sales reps to change their workflow, and boosts overall CRM adoption.

---

## 🔄 Application Flow

The system operates in real-time through the following automated pipeline:

1. **Email Ingestion (Gmail API + Pub/Sub)**
   - The user securely authenticates their Gmail account via OAuth2.
   - The system sets up a Gmail Watch API subscription.
   - When a new email arrives, Google Cloud Pub/Sub sends a real-time push notification to the engine.

2. **AI Extraction Pipeline (Claude AI)**
   - The engine retrieves the email content and passes it to an AI extraction model (Claude API).
   - The AI parses the email body, subject, and metadata to extract structured data:
     - **Contact info:** Name, email, phone, title, company.
     - **Company info:** Name, domain, size signals.
     - **Deal signals:** Budget mentions, timelines, objections, sentiment, intent (e.g., intro, proposal).

3. **Deduplication & Matching**
   - The system checks if the contact or company already exists in the connected CRM.
   - It matches records using primary keys (email addresses) and fuzzy matching (name + company similarity).
   - Thread awareness ensures that replies update the existing CRM record rather than creating duplicates.

4. **CRM Push (Connectors)**
   - The structured, deduplicated data is pushed to the user's CRM (HubSpot, Salesforce, etc.) via dedicated API connectors.
   - Fallback mechanisms and exponential backoff strategies handle any API rate limits or downtime.

5. **Notifications & Analytics**
   - If a high-priority deal signal is detected (e.g., budget approval), the system can trigger an instant Slack or WhatsApp alert.
   - All actions are logged and displayed on a centralized analytics dashboard for management to monitor sync health and team activity.

---

## 🛠 Tech Stack

- **Frontend:** React + TypeScript
- **Backend:** Node.js + TypeScript
- **Authentication:** Firebase Auth + OAuth2
- **Database:** Firestore (metadata) + PostgreSQL (audit logs)
- **Queueing:** Google Cloud Pub/Sub
- **AI Engine:** Claude API
- **Infrastructure:** Docker, Kubernetes (GCP / AWS)
- **CRM Integrations:** jsforce (Salesforce), HubSpot Node Client, Zoho SDK, Pipedrive SDK

---

## 🚀 Getting Started

*(Instructions for local setup, environment variables, and running the dev server can be added here once the repository is fully initialized.)*
