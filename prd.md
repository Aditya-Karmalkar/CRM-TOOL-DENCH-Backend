# Product Requirements Document

## AI Gmail → CRM Sync Engine

**Version:** 1.0  
**Date:** May 2026  
**Status:** Draft  
**Owner:** Product Team

---

## 1. Executive Summary

The AI Gmail → CRM Sync Engine is a SaaS/enterprise middleware platform that automatically extracts structured CRM data from Gmail emails using AI and pushes it into connected CRM systems within 1–2 minutes of email receipt. It eliminates manual data entry, reduces CRM staleness, and gives sales teams real-time contact and deal intelligence without changing their workflow.

---

## 2. Problem Statement

Sales reps spend 20–30% of their time manually logging emails into CRMs. This leads to:

- **Stale CRM data** — contacts, deals, and notes lag by hours or days
- **Missed signals** — unanswered emails, sentiment shifts, and deal progress go untracked
- **Low CRM adoption** — reps skip logging because it's tedious
- **Lost revenue** — deals fall through gaps in visibility

No existing solution combines real-time Gmail monitoring, AI-powered extraction, deduplication, and multi-CRM push in a single scalable product.

---

## 3. Goals & Success Metrics

### Goals

- Sync Gmail activity to CRM within **≤2 minutes** of email receipt
- Achieve **>90% extraction accuracy** for contacts, companies, and deal signals
- Support **Salesforce, HubSpot, Zoho, and Pipedrive** at launch
- Handle **10,000+ connected Gmail accounts** with low API overhead

### Success Metrics

| Metric                            | Target      |
| --------------------------------- | ----------- |
| Email-to-CRM sync latency         | < 2 minutes |
| AI extraction accuracy            | > 90%       |
| Deduplication false positive rate | < 1%        |
| CRM API error rate                | < 0.5%      |
| Monthly Active Accounts (Month 6) | 500+        |
| NPS                               | > 45        |

---

## 4. Target Users

### Primary: Sales Representatives

- Connect personal Gmail, get automatic CRM logging
- No behavior change required

### Secondary: Sales Ops / RevOps Teams

- Configure extraction rules, CRM field mappings, team assignments
- Monitor sync health via dashboard

### Tertiary: Enterprise IT Admins

- Manage OAuth tokens, role-based access, encryption policy
- Audit logs, compliance controls

---

## 5. User Stories

### Core Sync

- As a sales rep, I want my Gmail emails to automatically log to the CRM so I don't do it manually
- As a sales rep, I want AI to extract contact name, company, phone, and deal signals from email body
- As a sales rep, I want replies in an email thread to update the same CRM record, not create duplicates

### Configuration

- As a sales ops manager, I want to map extracted fields to custom CRM fields
- As an admin, I want to set filters so only work-domain emails are synced, not personal ones
- As a team lead, I want to auto-assign synced contacts to reps based on domain or territory

### Security & Compliance

- As an IT admin, I want OAuth2-only Gmail authentication with no password storage
- As an IT admin, I want all stored tokens to be AES-256 encrypted at rest
- As a compliance officer, I want a full audit log of every sync action

### Notifications

- As a sales rep, I want a Slack alert when a high-priority email is synced (e.g., contains budget or timeline signals)
- As a manager, I want a daily digest of sync activity for my team

---

## 6. Functional Requirements

### 6.1 Gmail Integration

- **App sign-in:** Firebase Auth with Google provider (no passwords stored)
- **Gmail access:** Separate OAuth2 consent for Gmail API scopes, linked to Firebase UID
- Gmail Watch API + Google Cloud Pub/Sub for real-time push notifications
- Watch renewal handled automatically (watches expire every 7 days)
- Support for multiple Gmail accounts per organization
- Filter rules: include/exclude domains, labels, senders, keywords

### 6.2 AI Extraction Pipeline

- Extract from email body + subject + sender metadata:
  - Contact: name, email, phone, title, company
  - Company: name, domain, size signals
  - Deal signals: budget mentions, timelines, objections, next steps
  - Sentiment: positive / neutral / negative
  - Email intent: intro, follow-up, proposal, closing, support
- Thread-aware: aggregate signals across entire email thread
- Confidence scoring per extracted field (threshold configurable)
- Fallback to rule-based extraction when AI confidence is low

### 6.3 Deduplication Engine

- Match contacts by email address (primary key)
- Secondary match: name + company fuzzy match (Jaro-Winkler similarity)
- Match CRM records by Message-ID and thread ID before creating new records
- Merge strategy: configurable (overwrite / append / skip)
- Dedup audit log per record

### 6.4 CRM Connectors

Supported at launch:

| CRM        | Auth            | Objects Synced                       |
| ---------- | --------------- | ------------------------------------ |
| Salesforce | OAuth2          | Contact, Lead, Activity, Opportunity |
| HubSpot    | OAuth2          | Contact, Company, Deal, Note         |
| Zoho CRM   | OAuth2          | Lead, Contact, Activity              |
| Pipedrive  | API Key + OAuth | Person, Organization, Activity, Deal |

Each connector supports:

- Field mapping (extracted field → CRM field)
- Custom object creation (enterprise tier)
- Retry with exponential backoff on API errors
- Webhook delivery for real-time CRM updates

### 6.5 Security & Access

- Firebase Auth (Google) for application login; API routes verified via Firebase ID tokens
- Gmail and CRM connectors use OAuth2 only — no password-based email auth
- Tokens encrypted at rest with AES-256 (KMS-managed keys)
- Role-based access control: Admin, Manager, Rep
- Per-user data isolation in multi-tenant architecture
- GDPR-compliant: data deletion on account removal
- Full audit log: who connected, what was synced, when

### 6.6 Notifications

- Slack integration: configurable triggers (new contact, deal signal, error)
- WhatsApp alerts (via Twilio) for urgent email signals
- In-app notification center
- Daily/weekly email digest for managers

### 6.7 Analytics Dashboard

- Sync volume over time (emails processed, records created/updated)
- Extraction accuracy stats
- CRM push success/failure rates
- Top contacts and companies synced
- Team activity leaderboard
- Error log with resolution hints

---

## 7. Non-Functional Requirements

| Requirement     | Specification                                         |
| --------------- | ----------------------------------------------------- |
| Sync latency    | ≤ 2 minutes end-to-end (P95)                          |
| Uptime          | 99.9% SLA                                             |
| Throughput      | 10,000 simultaneous Gmail accounts                    |
| Data encryption | AES-256 at rest, TLS 1.3 in transit                   |
| Compliance      | GDPR, SOC 2 Type II (roadmap)                         |
| Scalability     | Horizontal scaling via Docker + Kubernetes            |
| Observability   | Distributed tracing (OpenTelemetry), centralized logs |

---

## 8. Tech Stack

| Layer          | Technology                                                         |
| -------------- | ------------------------------------------------------------------ |
| Frontend       | React + TypeScript                                                 |
| Backend        | Node.js + TypeScript                                               |
| Auth           | Firebase Auth + OAuth2                                             |
| Database       | Firestore (metadata) + PostgreSQL (audit logs)                     |
| Queue          | Google Cloud Pub/Sub                                               |
| AI             | Claude API (extraction)                                            |
| Infrastructure | GCP / AWS, Docker, Kubernetes                                      |
| Notifications  | Slack API, Twilio (WhatsApp)                                       |
| CRM SDKs       | jsforce (Salesforce), HubSpot Node Client, Zoho SDK, Pipedrive SDK |

---

## 9. Out of Scope (V1)

- Outlook / Microsoft 365 email integration
- Bi-directional CRM → Gmail sync
- Native mobile app
- Custom AI model fine-tuning
- SOC 2 certification (roadmap for V2)
- Calendar event extraction

---

## 10. Risks & Mitigations

| Risk                     | Likelihood | Impact   | Mitigation                                        |
| ------------------------ | ---------- | -------- | ------------------------------------------------- |
| Gmail API quota limits   | Medium     | High     | Per-account quota management, exponential backoff |
| AI extraction inaccuracy | Medium     | Medium   | Confidence thresholds, human review queue         |
| OAuth token expiry       | Low        | High     | Automated token refresh, alert on failure         |
| CRM API downtime         | Low        | Medium   | Queue with retry, fallback to batch sync          |
| Data privacy breach      | Low        | Critical | Encryption, access controls, pen testing          |

---

## 11. Timeline

| Phase         | Duration | Deliverable                                        |
| ------------- | -------- | -------------------------------------------------- |
| MVP (Phase 1) | 8 weeks  | Gmail Watch + AI extraction + HubSpot sync         |
| Phase 2       | 6 weeks  | Salesforce + Zoho + Pipedrive connectors           |
| Phase 3       | 4 weeks  | Slack/WhatsApp notifications + Analytics dashboard |
| Phase 4       | 6 weeks  | Enterprise features (RBAC, audit logs, SSO)        |

---

## 12. Open Questions

1. Should AI extraction run synchronously (in-path) or asynchronously (post-delivery)?
2. What is the pricing model — per seat, per email volume, or per CRM connector?
3. Will we self-host the AI model or use Claude API per-call?
4. How do we handle emails with PII that should not leave the organization's cloud?
