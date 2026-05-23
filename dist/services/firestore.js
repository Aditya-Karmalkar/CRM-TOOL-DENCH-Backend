import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirestore } from "./firebase.js";
import { decrypt, encrypt } from "./encryption.js";
const ACCOUNTS = "accounts";
const SYNCED_EMAILS = "syncedEmails";
const OAUTH_STATES = "oauthStates";
function toAccount(id, data) {
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
function toSyncedEmail(id, data) {
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
    };
}
export async function getAccountByUserId(userId) {
    const snap = await getFirestore()
        .collection(ACCOUNTS)
        .where("userId", "==", userId)
        .limit(1)
        .get();
    if (snap.empty)
        return null;
    const doc = snap.docs[0];
    return {
        ...toAccount(doc.id, doc.data()),
        doc: doc.data(),
    };
}
export async function getAccountById(accountId) {
    const doc = await getFirestore().collection(ACCOUNTS).doc(accountId).get();
    if (!doc.exists)
        return null;
    return {
        ...toAccount(doc.id, doc.data()),
        doc: doc.data(),
    };
}
export async function upsertAccount(userId, firebaseEmail, gmailEmail, tokens) {
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
        return updated;
    }
    const ref = db.collection(ACCOUNTS).doc();
    const doc = {
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
export function getGmailTokens(doc) {
    return JSON.parse(decrypt(doc.gmailTokenEncrypted));
}
export function getHubspotTokens(doc) {
    if (!doc.hubspotTokenEncrypted)
        return null;
    return JSON.parse(decrypt(doc.hubspotTokenEncrypted));
}
export async function updateWatchExpiry(accountId, expiry) {
    await getFirestore()
        .collection(ACCOUNTS)
        .doc(accountId)
        .update({ watchExpiry: Timestamp.fromDate(expiry) });
}
export async function setHubspotTokens(accountId, tokens) {
    await getFirestore()
        .collection(ACCOUNTS)
        .doc(accountId)
        .update({
        hubspotConnected: true,
        hubspotTokenEncrypted: encrypt(JSON.stringify(tokens)),
    });
}
export async function disconnectGmail(accountId) {
    await getFirestore().collection(ACCOUNTS).doc(accountId).delete();
}
export async function disconnectHubspot(accountId) {
    await getFirestore().collection(ACCOUNTS).doc(accountId).update({
        hubspotConnected: false,
        hubspotTokenEncrypted: null,
    });
}
export async function updateEmailFilters(accountId, filters) {
    await getFirestore()
        .collection(ACCOUNTS)
        .doc(accountId)
        .update({ emailFilters: filters });
}
export async function messageExists(accountId, messageId) {
    const snap = await getFirestore()
        .collection(SYNCED_EMAILS)
        .where("accountId", "==", accountId)
        .where("messageId", "==", messageId)
        .limit(1)
        .get();
    return !snap.empty;
}
export async function createSyncedEmail(accountId, data) {
    const ref = getFirestore().collection(SYNCED_EMAILS).doc();
    await ref.set({
        accountId,
        ...data,
        receivedAt: Timestamp.fromDate(data.receivedAt),
        extractedData: null,
        syncStatus: "pending",
        crmRecordId: null,
        errorMessage: null,
        syncedAt: null,
    });
    return ref.id;
}
export async function updateSyncedEmail(syncId, update) {
    const payload = {};
    for (const [key, value] of Object.entries(update)) {
        payload[key] = value === undefined ? null : value;
    }
    if (update.syncedAt) {
        payload.syncedAt = Timestamp.fromDate(update.syncedAt);
    }
    await getFirestore().collection(SYNCED_EMAILS).doc(syncId).update(payload);
}
export async function listSyncsForUser(userId, failedOnly = false) {
    const account = await getAccountByUserId(userId);
    if (!account)
        return [];
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
export async function getSyncById(syncId, userId) {
    const account = await getAccountByUserId(userId);
    if (!account)
        return null;
    const doc = await getFirestore()
        .collection(SYNCED_EMAILS)
        .doc(syncId)
        .get();
    if (!doc.exists)
        return null;
    const data = doc.data();
    if (data.accountId !== account.id)
        return null;
    return toSyncedEmail(doc.id, data);
}
export async function listAccountsNeedingWatchRenewal() {
    const sixDaysFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const snap = await getFirestore().collection(ACCOUNTS).get();
    return snap.docs
        .map((d) => ({ id: d.id, doc: d.data() }))
        .filter(({ doc }) => {
        if (!doc.watchExpiry)
            return false;
        return doc.watchExpiry.toDate() < sixDaysFromNow;
    });
}
export async function getMetricsForUser(userId, days = 30) {
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
        .filter(({ data }) => data.receivedAt?.toDate?.() instanceof Date
        ? data.receivedAt.toDate() >= start
        : true)
        .sort((a, b) => {
        const ad = a.data.receivedAt?.toDate?.();
        const bd = b.data.receivedAt?.toDate?.();
        return (bd?.getTime() ?? 0) - (ad?.getTime() ?? 0);
    });
    const companies = new Map();
    const contactEmails = new Set();
    const contacts = new Map();
    const emailTypeCounts = {};
    const sentimentCounts = {};
    let synced = 0;
    let failed = 0;
    let extractedCount = 0; // records with at least one extracted field
    for (const row of rows) {
        const data = row.data;
        const status = data.syncStatus;
        if (status === "synced")
            synced += 1;
        if (status === "failed")
            failed += 1;
        const extracted = data.extractedData;
        const email = extracted?.contact?.email ?? data.fromEmail;
        if (email) {
            contactEmails.add(String(email));
            contacts.set(String(email), (contacts.get(String(email)) ?? 0) + 1);
        }
        const company = extracted?.contact?.company;
        if (company) {
            const key = String(company).trim();
            if (key)
                companies.set(key, (companies.get(key) ?? 0) + 1);
        }
        if (extracted) {
            // count as extracted if any main fields present
            if (extracted.contact?.email ||
                extracted.contact?.name ||
                extracted.contact?.company ||
                extracted.dealSignals?.intent) {
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
    const extractionCoverage = rows.length === 0
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
export async function saveOAuthState(state, userId, provider) {
    await getFirestore().collection(OAUTH_STATES).doc(state).set({
        userId,
        provider,
        createdAt: FieldValue.serverTimestamp(),
    });
}
export async function consumeOAuthState(state) {
    const ref = getFirestore().collection(OAUTH_STATES).doc(state);
    const doc = await ref.get();
    if (!doc.exists)
        return null;
    await ref.delete();
    return doc.data();
}
// Extraction review workflow
export async function createExtractionReview(syncId, reviewerId, correctedData, label) {
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
export async function listPendingExtractionReviews(userId, limit = 20) {
    const account = await getAccountByUserId(userId);
    if (!account)
        return [];
    const snap = await getFirestore()
        .collection(SYNCED_EMAILS)
        .where("accountId", "==", account.id)
        .where("extractedData", "!=", null)
        .orderBy("receivedAt", "desc")
        .limit(limit)
        .get();
    const results = [];
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
