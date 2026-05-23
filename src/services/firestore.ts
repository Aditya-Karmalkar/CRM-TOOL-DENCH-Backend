import type {
    Account,
    EmailFilters,
    ExtractedData,
    SyncedEmail,
    SyncStatus,
} from "@crm/shared";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirestore } from "./firebase.js";
import { decrypt, encrypt } from "./encryption.js";

const ACCOUNTS = "accounts";
const SYNCED_EMAILS = "syncedEmails";
const OAUTH_STATES = "oauthStates";

export interface StoredTokens {
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
}

export interface AccountDoc {
    userId: string;
    firebaseEmail: string;
    gmailEmail: string;
    gmailTokenEncrypted: string;
    watchExpiry: FirebaseFirestore.Timestamp | null;
    hubspotConnected: boolean;
    hubspotTokenEncrypted: string | null;
    emailFilters: EmailFilters;
    createdAt: FirebaseFirestore.Timestamp;
}

function toAccount(id: string, data: AccountDoc): Account {
    return {
        id,
        userId: data.userId,
        firebaseEmail: data.firebaseEmail,
        gmailEmail: data.gmailEmail,
        watchExpiry: data.watchExpiry?.toDate().toISOString() ?? null,
        hubspotConnected: data.hubspotConnected,
        emailFilters: data.emailFilters,
        createdAt: data.createdAt.toDate().toISOString(),
    };
}

function toSyncedEmail(
    id: string,
    data: FirebaseFirestore.DocumentData,
): SyncedEmail {
    return {
        id,
        accountId: data.accountId,
        messageId: data.messageId,
        threadId: data.threadId,
        subject: data.subject,
        fromEmail: data.fromEmail,
        receivedAt: data.receivedAt.toDate().toISOString(),
        extractedData: data.extractedData ?? null,
        syncStatus: data.syncStatus,
        crmRecordId: data.crmRecordId ?? null,
        errorMessage: data.errorMessage ?? null,
        syncedAt: data.syncedAt?.toDate().toISOString() ?? null,
        bodyText: data.bodyText ?? "",
    };
}

export async function getAccountByUserId(
    userId: string,
): Promise<(Account & { doc: AccountDoc }) | null> {
    const snap = await getFirestore()
        .collection(ACCOUNTS)
        .where("userId", "==", userId)
        .limit(1)
        .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return {
        ...toAccount(doc.id, doc.data() as AccountDoc),
        doc: doc.data() as AccountDoc,
    };
}

export async function getAccountById(
    accountId: string,
): Promise<(Account & { doc: AccountDoc }) | null> {
    const doc = await getFirestore().collection(ACCOUNTS).doc(accountId).get();
    if (!doc.exists) return null;
    return {
        ...toAccount(doc.id, doc.data() as AccountDoc),
        doc: doc.data() as AccountDoc,
    };
}

export async function upsertAccount(
    userId: string,
    firebaseEmail: string,
    gmailEmail: string,
    tokens: StoredTokens,
): Promise<Account> {
    const existing = await getAccountByUserId(userId);
    const tokenPayload = encrypt(JSON.stringify(tokens));
    const db = getFirestore();

    if (existing) {
        await db.collection(ACCOUNTS).doc(existing.id).update({
            gmailEmail,
            gmailTokenEncrypted: tokenPayload,
            firebaseEmail,
        });
        const updated = await getAccountById(existing.id);
        return updated!;
    }

    const ref = db.collection(ACCOUNTS).doc();
    const doc: AccountDoc = {
        userId,
        firebaseEmail,
        gmailEmail,
        gmailTokenEncrypted: tokenPayload,
        watchExpiry: null,
        hubspotConnected: false,
        hubspotTokenEncrypted: null,
        emailFilters: { includeDomains: [], excludeDomains: [] },
        createdAt: Timestamp.now(),
    };
    await ref.set(doc);
    return toAccount(ref.id, doc);
}

export function getGmailTokens(doc: AccountDoc): StoredTokens {
    return JSON.parse(decrypt(doc.gmailTokenEncrypted)) as StoredTokens;
}

export function getHubspotTokens(doc: AccountDoc): StoredTokens | null {
    if (!doc.hubspotTokenEncrypted) return null;
    return JSON.parse(decrypt(doc.hubspotTokenEncrypted)) as StoredTokens;
}

export async function updateWatchExpiry(
    accountId: string,
    expiry: Date,
): Promise<void> {
    await getFirestore()
        .collection(ACCOUNTS)
        .doc(accountId)
        .update({ watchExpiry: Timestamp.fromDate(expiry) });
}

export async function setHubspotTokens(
    accountId: string,
    tokens: StoredTokens,
): Promise<void> {
    await getFirestore()
        .collection(ACCOUNTS)
        .doc(accountId)
        .update({
            hubspotConnected: true,
            hubspotTokenEncrypted: encrypt(JSON.stringify(tokens)),
        });
}

export async function disconnectGmail(accountId: string): Promise<void> {
    await getFirestore().collection(ACCOUNTS).doc(accountId).delete();
}

export async function disconnectHubspot(accountId: string): Promise<void> {
    await getFirestore().collection(ACCOUNTS).doc(accountId).update({
        hubspotConnected: false,
        hubspotTokenEncrypted: null,
    });
}

export async function updateEmailFilters(
    accountId: string,
    filters: EmailFilters,
): Promise<void> {
    await getFirestore()
        .collection(ACCOUNTS)
        .doc(accountId)
        .update({ emailFilters: filters });
}

export async function messageExists(
    accountId: string,
    messageId: string,
): Promise<boolean> {
    const snap = await getFirestore()
        .collection(SYNCED_EMAILS)
        .where("accountId", "==", accountId)
        .where("messageId", "==", messageId)
        .limit(1)
        .get();
    return !snap.empty;
}

export async function createSyncedEmail(
    accountId: string,
    data: {
        messageId: string;
        threadId: string;
        subject: string;
        fromEmail: string;
        receivedAt: Date;
        bodyText?: string;
    },
): Promise<string> {
    const ref = getFirestore().collection(SYNCED_EMAILS).doc();
    await ref.set({
        accountId,
        ...data,
        receivedAt: Timestamp.fromDate(data.receivedAt),
        extractedData: null,
        syncStatus: "pending" as SyncStatus,
        crmRecordId: null,
        errorMessage: null,
        syncedAt: null,
        bodyText: data.bodyText ?? "",
    });
    return ref.id;
}

export async function getSyncByMessageId(
    accountId: string,
    messageId: string,
): Promise<SyncedEmail | null> {
    const snap = await getFirestore()
        .collection(SYNCED_EMAILS)
        .where("accountId", "==", accountId)
        .where("messageId", "==", messageId)
        .limit(1)
        .get();
    if (snap.empty) return null;
    return toSyncedEmail(snap.docs[0].id, snap.docs[0].data());
}

export async function updateSyncedEmail(
    syncId: string,
    update: Partial<{
        extractedData: ExtractedData;
        syncStatus: SyncStatus;
        crmRecordId: string;
        errorMessage: string;
        syncedAt: Date;
        bodyText: string;
    }>,
): Promise<void> {
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(update)) {
        payload[key] = value === undefined ? null : value;
    }
    if (update.syncedAt) {
        payload.syncedAt = Timestamp.fromDate(update.syncedAt);
    }
    await getFirestore().collection(SYNCED_EMAILS).doc(syncId).update(payload);
}

export async function listSyncsForUser(
    userId: string,
    failedOnly = false,
): Promise<SyncedEmail[]> {
    const account = await getAccountByUserId(userId);
    if (!account) return [];

    const snap = await getFirestore()
        .collection(SYNCED_EMAILS)
        .where("accountId", "==", account.id)
        .limit(500)
        .get();

    return snap.docs
        .map((d) => toSyncedEmail(d.id, d.data()))
        .filter((row) => !failedOnly || row.syncStatus === "failed")
        .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
        .slice(0, 100);
}

export async function getSyncById(
    syncId: string,
    userId: string,
): Promise<SyncedEmail | null> {
    const account = await getAccountByUserId(userId);
    if (!account) return null;

    const doc = await getFirestore()
        .collection(SYNCED_EMAILS)
        .doc(syncId)
        .get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    if (data.accountId !== account.id) return null;
    return toSyncedEmail(doc.id, data);
}

export async function listAccountsNeedingWatchRenewal(): Promise<
    Array<{ id: string; doc: AccountDoc }>
> {
    const sixDaysFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const snap = await getFirestore().collection(ACCOUNTS).get();

    return snap.docs
        .map((d) => ({ id: d.id, doc: d.data() as AccountDoc }))
        .filter(({ doc }) => {
            if (!doc.watchExpiry) return false;
            return doc.watchExpiry.toDate() < sixDaysFromNow;
        });
}

export async function getMetricsForUser(
    userId: string,
    days = 30,
): Promise<{
    totalProcessed: number;
    syncedCount: number;
    failedCount: number;
    uniqueContacts: number;
    topCompanies: Array<{ name: string; count: number }>;
    // extended
    topContacts: Array<{ email: string; count: number }>;
    extractionCoverage: number; // percent 0-100
    emailTypeCounts: Record<string, number>;
    sentimentCounts: Record<string, number>;
}> {
    const account = await getAccountByUserId(userId);
    if (!account) {
        return {
            totalProcessed: 0,
            syncedCount: 0,
            failedCount: 0,
            uniqueContacts: 0,
            topCompanies: [],
            topContacts: [],
            extractionCoverage: 0,
            emailTypeCounts: {},
            sentimentCounts: {},
        };
    }

    const snap = await getFirestore()
        .collection(SYNCED_EMAILS)
        .where("accountId", "==", account.id)
        .limit(1000)
        .get();

    const allowedDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
    const start = new Date(Date.now() - allowedDays * 24 * 60 * 60 * 1000);
    const rows = snap.docs
        .map((d) => ({ id: d.id, data: d.data() }))
        .filter(({ data }) =>
            data.receivedAt?.toDate?.() instanceof Date
                ? data.receivedAt.toDate() >= start
                : true,
        )
        .sort((a, b) => {
            const ad = a.data.receivedAt?.toDate?.() as Date | undefined;
            const bd = b.data.receivedAt?.toDate?.() as Date | undefined;
            return (bd?.getTime() ?? 0) - (ad?.getTime() ?? 0);
        });

    const companies = new Map<string, number>();
    const contactEmails = new Set<string>();
    const contacts = new Map<string, number>();
    const emailTypeCounts: Record<string, number> = {};
    const sentimentCounts: Record<string, number> = {};
    let synced = 0;
    let failed = 0;
    let extractedCount = 0; // records with at least one extracted field

    for (const row of rows) {
        const data = row.data;
        const status = data.syncStatus as string | undefined;
        if (status === "synced") synced += 1;
        if (status === "failed") failed += 1;

        const extracted = data.extractedData;
        const email = extracted?.contact?.email ?? data.fromEmail;
        if (email) {
            contactEmails.add(String(email));
            contacts.set(String(email), (contacts.get(String(email)) ?? 0) + 1);
        }

        const company = extracted?.contact?.company;
        if (company) {
            const key = String(company).trim();
            if (key) companies.set(key, (companies.get(key) ?? 0) + 1);
        }

        if (extracted) {
            // count as extracted if any main fields present
            if (
                extracted.contact?.email ||
                extracted.contact?.name ||
                extracted.contact?.company ||
                extracted.dealSignals?.intent
            ) {
                extractedCount += 1;
            }

            const et = extracted.emailType ?? "other";
            emailTypeCounts[et] = (emailTypeCounts[et] ?? 0) + 1;

            const s = extracted.dealSignals?.sentiment ?? "unknown";
            sentimentCounts[s] = (sentimentCounts[s] ?? 0) + 1;
        }
    }

    const topCompanies = Array.from(companies.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    const topContacts = Array.from(contacts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([email, count]) => ({ email, count }));

    const extractionCoverage =
        rows.length === 0
            ? 0
            : Math.round((extractedCount / rows.length) * 100);

    return {
        totalProcessed: rows.length,
        syncedCount: synced,
        failedCount: failed,
        uniqueContacts: contactEmails.size,
        topCompanies,
        // extended fields for dashboard
        topContacts,
        extractionCoverage,
        emailTypeCounts,
        sentimentCounts,
    };
}
export async function saveOAuthState(
    state: string,
    userId: string,
    provider: "hubspot",
): Promise<void> {
    await getFirestore().collection(OAUTH_STATES).doc(state).set({
        userId,
        provider,
        createdAt: FieldValue.serverTimestamp(),
    });
}

export async function consumeOAuthState(
    state: string,
): Promise<{ userId: string; provider: string } | null> {
    const ref = getFirestore().collection(OAUTH_STATES).doc(state);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.delete();
    return doc.data() as { userId: string; provider: string };
}

// Extraction review workflow
export async function createExtractionReview(
    syncId: string,
    reviewerId: string,
    correctedData: unknown | null,
    label: "approved" | "corrected" | "rejected",
): Promise<void> {
    await getFirestore()
        .collection("extractionReviews")
        .doc(syncId)
        .set({
            syncId,
            reviewerId,
            correctedData: correctedData ?? null,
            label,
            createdAt: FieldValue.serverTimestamp(),
        });
}

export async function listPendingExtractionReviews(userId: string, limit = 20) {
    const account = await getAccountByUserId(userId);
    if (!account) return [];

    const snap = await getFirestore()
        .collection(SYNCED_EMAILS)
        .where("accountId", "==", account.id)
        .where("extractedData", "!=", null)
        .orderBy("receivedAt", "desc")
        .limit(limit)
        .get();

    const results: Array<{ sync: SyncedEmail; needsReview: boolean }> = [];
    for (const d of snap.docs) {
        const exists = await getFirestore()
            .collection("extractionReviews")
            .doc(d.id)
            .get();
        results.push({
            sync: toSyncedEmail(d.id, d.data()),
            needsReview: !exists.exists,
        });
    }

    return results;
}
