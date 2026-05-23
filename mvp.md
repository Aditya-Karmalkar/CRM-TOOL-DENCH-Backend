# MVP Build Plan

## AI Gmail → CRM Sync Engine

**Sprint Duration:** 8 weeks  
**Goal:** Ship a working end-to-end sync from Gmail to HubSpot using AI extraction  
**Team:** 2 engineers + 1 designer (part-time)

---

## MVP Scope

The MVP proves the core loop: **Gmail email arrives → AI extracts data → HubSpot record created/updated — within 2 minutes.**

Everything else (multi-CRM, notifications, analytics, enterprise features) is post-MVP.

---

## What's In

| Feature                                             | Rationale                              |
| --------------------------------------------------- | -------------------------------------- |
| Firebase Auth (Google sign-in) + Gmail API connect  | App login + Gmail scopes               |
| Gmail Watch API + Pub/Sub listener                  | Real-time trigger, core differentiator |
| AI extraction (contact, company, deal signal)       | Core value proposition                 |
| HubSpot sync (Contact + Note)                       | Single CRM to validate end-to-end loop |
| Basic deduplication by email address                | Prevent duplicate records              |
| Thread tracking via Message-ID                      | Group replies correctly                |
| Simple web dashboard (connect Gmail, view sync log) | User onboarding + debugging            |
| Email filter (include/exclude domains)              | Minimum viable control                 |

## What's Out (Post-MVP)

- Salesforce, Zoho, Pipedrive connectors
- Slack / WhatsApp notifications
- Analytics dashboard
- Role-based access control
- Audit logs
- Fuzzy deduplication
- AI confidence scoring UI
- Custom field mapping UI
- Enterprise SSO

---

## Architecture

**Auth:** Users sign in with **Firebase Auth** (Google provider). Connecting Gmail is a second step: request Gmail API scopes on the same Google account and store refresh tokens (encrypted) in Firestore. The backend verifies Firebase ID tokens on every API call.

```
Gmail Inbox
    │
    ▼ (Gmail Watch API push notification)
Google Cloud Pub/Sub
    │
    ▼
Node.js Subscriber Service
    │
    ├── Fetch full email via Gmail API
    ├── Deduplicate (Message-ID check)
    │
    ▼
AI Extraction Service (Claude API)
    │ → Contact: name, email, phone, company
    │ → Deal signal: budget, timeline, intent
    │
    ▼
HubSpot Connector
    ├── Upsert Contact (match by email)
    └── Create Note (email summary + signals)
    │
    ▼
Sync Log (Firestore)
    │
    ▼
React Dashboard (Firebase Auth + view connected accounts + sync history)
```

---

## Sprint Plan

### Week 1–2: Foundation

**Backend**

- [ ] Set up Node.js + TypeScript monorepo
- [ ] Firebase project: Auth (Google provider), Firestore, Hosting
- [ ] Firebase Auth in React (Google sign-in); backend verifies ID tokens
- [ ] Gmail connect flow: request Gmail scopes (`gmail.readonly`, `gmail.modify` for Watch) via Google OAuth linked to Firebase user
- [ ] Store encrypted Gmail refresh tokens (AES-256 via Secret Manager or Node `crypto`)
- [ ] Gmail Watch API registration on account connect
- [ ] Watch renewal job (cron, every 6 days)

**Frontend**

- [ ] React app scaffold (Vite + TypeScript + Firebase SDK)
- [ ] Sign in with Google (Firebase Auth) + Connect Gmail page (Gmail scopes, account list)
- [ ] Basic layout / nav

**Deliverable:** A user can connect their Gmail account. Watch is active.

---

### Week 3–4: Email Ingestion + AI Extraction

**Backend**

- [ ] Google Cloud Pub/Sub subscriber (Cloud Run or Cloud Function)
- [ ] On notification: fetch email via Gmail API (full MIME)
- [ ] Parse email: sender, recipients, subject, body (text + HTML strip)
- [ ] Message-ID storage in Firestore (dedup check)
- [ ] Thread ID storage (group thread emails)
- [ ] Claude API integration for extraction:
  ```
  Prompt: Extract the following from this email in JSON:
  - contact: { name, email, phone, title, company }
  - deal_signals: { budget_mentioned, timeline, intent, sentiment }
  - email_type: intro | follow_up | proposal | closing | other
  ```
- [ ] Parse and validate Claude JSON response
- [ ] Store extraction result in Firestore

**Deliverable:** Email arrives → AI extracts structured data → stored in Firestore within 60 seconds.

---

### Week 5–6: HubSpot Connector + Sync Loop

**Backend**

- [ ] HubSpot OAuth2 connect flow
- [ ] HubSpot Contact upsert (search by email → create or update)
- [ ] HubSpot Note creation (email summary + extracted signals)
- [ ] Retry logic: exponential backoff on HubSpot API errors (3 attempts)
- [ ] Sync status written to Firestore: `pending → synced | failed`
- [ ] Error capture with reason code

**Deliverable:** Extracted data lands in HubSpot Contact + Note. End-to-end loop complete.

---

### Week 7: Dashboard

**Frontend**

- [ ] Sync log table: email subject, timestamp, status (synced/failed), CRM record link
- [ ] Connected accounts list with disconnect option
- [ ] HubSpot connection status
- [ ] Basic filter: show only failed syncs
- [ ] Manual re-sync button (for failed records)

**Deliverable:** Users can see what was synced, what failed, and retry failures.

---

### Week 8: Polish, Testing & Launch Prep

- [ ] End-to-end integration tests (send test email → verify HubSpot record)
- [ ] Error alerting (email to admin on repeated failures)
- [ ] Rate limit handling (Gmail API: 1B units/day quota management)
- [ ] Basic email domain filter UI (include/exclude list)
- [ ] Deployment: Cloud Run (backend) + Firebase Hosting (frontend)
- [ ] Onboarding flow: connect Gmail → connect HubSpot → done
- [ ] Loom walkthrough / README for beta testers
- [ ] Recruit 5–10 beta users

---

## Data Models

### `accounts` (Firestore)

```typescript
{
  userId: string,                  // Firebase Auth UID
  firebaseEmail: string,           // From Firebase Google sign-in
  gmailEmail: string,
  gmailTokenEncrypted: string,   // AES-256
  watchExpiry: Timestamp,
  hubspotConnected: boolean,
  hubspotTokenEncrypted: string,
  createdAt: Timestamp
}
```

### `syncedEmails` (Firestore)

```typescript
{
  accountId: string,
  messageId: string,             // Gmail Message-ID header
  threadId: string,
  subject: string,
  fromEmail: string,
  receivedAt: Timestamp,
  extractedData: {
    contact: { name, email, phone, title, company },
    dealSignals: { budget, timeline, intent, sentiment },
    emailType: string
  },
  syncStatus: 'pending' | 'synced' | 'failed',
  crmRecordId: string | null,
  errorMessage: string | null,
  syncedAt: Timestamp | null
}
```

---

## API Endpoints (MVP)

All user-facing routes require `Authorization: Bearer <Firebase ID token>`.

| Method | Path                     | Description                                      |
| ------ | ------------------------ | ------------------------------------------------ |
| POST   | `/accounts/gmail/connect`| Exchange Gmail OAuth code / tokens; start Watch  |
| DELETE | `/accounts/gmail`        | Disconnect Gmail; stop Watch                     |
| GET    | `/auth/hubspot`          | Initiate HubSpot OAuth2                          |
| GET    | `/auth/hubspot/callback` | Handle HubSpot callback                          |
| POST   | `/pubsub/gmail`          | Pub/Sub push endpoint (internal, no user token)  |
| GET    | `/syncs`                 | List sync records for user                       |
| POST   | `/syncs/:id/retry`       | Retry a failed sync                              |

**Client-side (Firebase SDK):** Google sign-in for app access. Gmail connect uses Google OAuth with Gmail scopes (popup or redirect), then POST tokens to `/accounts/gmail/connect`.

---

## Environment Variables

```env
# Firebase (Auth + Firestore + Hosting)
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=   # Backend Admin SDK (verify ID tokens)

# Google Cloud (Gmail API + Pub/Sub; same GCP project as Firebase)
GOOGLE_CLIENT_ID=                # OAuth client for Gmail scopes
GOOGLE_CLIENT_SECRET=
GOOGLE_PUBSUB_TOPIC=

HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
ANTHROPIC_API_KEY=
ENCRYPTION_KEY=                  # AES-256 key (store in Secret Manager)
```

---

## Definition of Done (MVP)

The MVP is complete when:

1. A user connects Gmail and HubSpot in under 2 minutes
2. An inbound email from a new contact creates a HubSpot Contact + Note within 2 minutes
3. A reply in the same thread updates the existing record (no duplicate)
4. Failed syncs appear in dashboard with retry option
5. 5 beta users have completed the full flow without support intervention
6. P95 end-to-end latency < 2 minutes measured over 100 real emails

---

## Risk Log

| Risk                                       | Mitigation                                            |
| ------------------------------------------ | ----------------------------------------------------- |
| Gmail Watch push delay under load          | Monitor Pub/Sub lag; fallback to polling if P95 > 90s |
| Claude API latency spike                   | Set 10s timeout; queue retry; log slow extractions    |
| HubSpot rate limit (100 req/10s)           | Token bucket per account; queue overflow              |
| OAuth token refresh failure                | Alert user via email; surface in dashboard            |
| AI extracts wrong contact from CC'd emails | Use `From:` header as primary; flag CC as secondary   |

---

## Post-MVP Roadmap (V2+)

1. **Salesforce + Zoho + Pipedrive** connectors
2. **Slack notifications** on deal signals
3. **Analytics dashboard** (sync volume, accuracy, team activity)
4. **Custom field mapping** UI
5. **Fuzzy deduplication** (name + company match)
6. **AI confidence scores** + human review queue
7. **RBAC** (Admin / Manager / Rep)
8. **Audit logs** (SOC 2 prep)
9. **Outlook / Microsoft 365** support
