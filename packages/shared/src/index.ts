export type SyncStatus = 'pending' | 'synced' | 'failed';

export type EmailType =
  | 'intro'
  | 'follow_up'
  | 'proposal'
  | 'closing'
  | 'other';

export type SignalType =
  | 'budget'
  | 'timeline'
  | 'competitor'
  | 'buying_intent'
  | 'decision_maker'
  | 'objection';

export interface DealSignal {
  signalId: string;
  emailId: string;
  userId: string;
  contactName: string | null;
  contactEmail: string | null;
  companyName: string | null;
  signalType: SignalType;
  signalScore: number;
  rawExcerpt: string;
  nextSteps: string[];
  createdAt: string;
  subject: string;
}

export interface ContactData {
  name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  company: string | null;
}

export interface DealSignals {
  budget: string | null;
  timeline: string | null;
  intent: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
}

export interface ExtractedData {
  contact: ContactData;
  dealSignals: DealSignals;
  emailType: EmailType;
}

export interface Account {
  id: string;
  userId: string;
  firebaseEmail: string;
  gmailEmail: string;
  watchExpiry: string | null;
  hubspotConnected: boolean;
  emailFilters: EmailFilters;
  createdAt: string;
}

export interface EmailFilters {
  includeDomains: string[];
  excludeDomains: string[];
}

export interface SyncedEmail {
  id: string;
  accountId: string;
  messageId: string;
  threadId: string;
  subject: string;
  fromEmail: string;
  receivedAt: string;
  extractedData: ExtractedData | null;
  syncStatus: SyncStatus;
  crmRecordId: string | null;
  errorMessage: string | null;
  syncedAt: string | null;
  bodyText?: string;
}

export interface ParsedEmail {
  messageId: string;
  threadId: string;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  bodyText: string;
  receivedAt: Date;
}

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
] as const;

export const HUBSPOT_SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.companies.read',
  'crm.objects.companies.write',
  'crm.schemas.contacts.read',
  'crm.schemas.companies.read',
  'oauth',
] as const;
