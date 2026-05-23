import { createSyncedEmail, getAccountById, getGmailTokens, getHubspotTokens, messageExists, updateSyncedEmail, upsertAccount, } from "./firestore.js";
import { fetchMessage, gmailClientFromTokens, listHistoryMessages, refreshGmailTokensIfNeeded, registerGmailWatch, } from "./gmail.js";
import { parseRawEmail, passesEmailFilter } from "./email-parser.js";
import { extractFromEmail } from "./extraction.js";
import { upsertContactAndNote } from "./hubspot.js";
import { env } from "../config.js";
import { encrypt } from "./encryption.js";
import { getFirestore } from "./firebase.js";
export async function connectGmailAccount(userId, firebaseEmail, code) {
    const { exchangeGmailCode } = await import("./gmail.js");
    const result = await exchangeGmailCode(code);
    const tokens = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiryDate: result.expiryDate,
    };
    const account = await upsertAccount(userId, firebaseEmail, result.email, tokens);
    let watchWarning;
    if (env.googlePubsubTopic) {
        try {
            const watch = await registerGmailWatch(tokens, env.googlePubsubTopic);
            const { updateWatchExpiry } = await import("./firestore.js");
            await updateWatchExpiry(account.id, watch.expiration);
        }
        catch (err) {
            watchWarning =
                err instanceof Error
                    ? err.message
                    : "Unable to register Gmail watch";
            console.warn("Gmail watch registration failed; continuing without watch:", err);
        }
    }
    return { accountId: account.id, gmailEmail: result.email, watchWarning };
}
async function processInBatches(items, batchSize, processor) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(item => processor(item)));
    }
}
export async function processPubSubNotification(payload) {
    const snap = await getFirestore()
        .collection("accounts")
        .where("gmailEmail", "==", payload.emailAddress)
        .limit(1)
        .get();
    if (snap.empty) {
        console.warn("No account for", payload.emailAddress);
        return;
    }
    const accountDoc = snap.docs[0];
    const accountId = accountDoc.id;
    const doc = accountDoc.data();
    let tokens = getGmailTokens(doc);
    tokens = await refreshGmailTokensIfNeeded(tokens);
    await getFirestore()
        .collection("accounts")
        .doc(accountId)
        .update({
        gmailTokenEncrypted: encrypt(JSON.stringify(tokens)),
    });
    const messageIds = await listHistoryMessages(tokens, payload.historyId);
    // Process messages concurrently in groups of 5
    await processInBatches(messageIds, 5, async (gmailId) => {
        try {
            await processGmailMessage(accountId, doc, tokens, gmailId);
        }
        catch (err) {
            console.error(`PubSub: Failed to process message ${gmailId}:`, err);
        }
    });
}
export async function processGmailMessage(accountId, doc, tokens, gmailMessageId) {
    const raw = await fetchMessage(tokens, gmailMessageId);
    if (!raw.raw)
        return;
    const parsed = await parseRawEmail(raw.raw, raw.threadId ?? gmailMessageId, raw.internalDate);
    if (!(await passesEmailFilter(parsed.fromEmail, doc.emailFilters))) {
        return;
    }
    if (await messageExists(accountId, parsed.messageId)) {
        return;
    }
    const syncId = await createSyncedEmail(accountId, {
        messageId: parsed.messageId,
        threadId: parsed.threadId,
        subject: parsed.subject,
        fromEmail: parsed.fromEmail,
        receivedAt: parsed.receivedAt,
    });
    try {
        const extracted = await extractFromEmail(parsed);
        await updateSyncedEmail(syncId, { extractedData: extracted });
        if (!doc.hubspotConnected) {
            await updateSyncedEmail(syncId, {
                syncStatus: "pending",
                errorMessage: "Dench CRM not connected",
            });
            return;
        }
        const hubspotTokens = getHubspotTokens(doc);
        if (!hubspotTokens) {
            await updateSyncedEmail(syncId, {
                syncStatus: "failed",
                errorMessage: "Dench CRM tokens missing",
            });
            return;
        }
        const crmRecordId = await upsertContactAndNote(hubspotTokens, parsed, extracted);
        await updateSyncedEmail(syncId, {
            syncStatus: "synced",
            crmRecordId,
            syncedAt: new Date(),
            errorMessage: undefined,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown sync error";
        await updateSyncedEmail(syncId, {
            syncStatus: "failed",
            errorMessage: message,
        });
    }
}
export async function retrySync(syncId, userId) {
    const { getSyncById, getAccountByUserId } = await import("./firestore.js");
    const sync = await getSyncById(syncId, userId);
    const account = await getAccountByUserId(userId);
    if (!sync || !account || (sync.syncStatus !== "failed" && sync.syncStatus !== "pending")) {
        throw new Error("Sync not found or not retryable");
    }
    await updateSyncedEmail(syncId, {
        syncStatus: "pending",
        errorMessage: undefined,
    });
    const fullAccount = await getAccountById(account.id);
    if (!fullAccount)
        throw new Error("Account not found");
    const tokens = getGmailTokens(fullAccount.doc);
    const gmail = gmailClientFromTokens(tokens);
    const list = await gmail.users.messages.list({
        userId: "me",
        q: `rfc822msgid:${sync.messageId}`,
        maxResults: 1,
    });
    const gmailId = list.data.messages?.[0]?.id;
    if (!gmailId) {
        await updateSyncedEmail(syncId, {
            syncStatus: "failed",
            errorMessage: "Original Gmail message not found",
        });
        return;
    }
    await processGmailMessage(account.id, fullAccount.doc, tokens, gmailId);
}
export async function renewAllWatches() {
    const { listAccountsNeedingWatchRenewal } = await import("./firestore.js");
    const accounts = await listAccountsNeedingWatchRenewal();
    for (const { id, doc } of accounts) {
        if (!env.googlePubsubTopic)
            continue;
        try {
            let tokens = getGmailTokens(doc);
            tokens = await refreshGmailTokensIfNeeded(tokens);
            const watch = await registerGmailWatch(tokens, env.googlePubsubTopic);
            const { updateWatchExpiry } = await import("./firestore.js");
            await updateWatchExpiry(id, watch.expiration);
            await getFirestore()
                .collection("accounts")
                .doc(id)
                .update({
                gmailTokenEncrypted: encrypt(JSON.stringify(tokens)),
            });
            console.log(`Renewed watch for account ${id}`);
        }
        catch (err) {
            console.error(`Watch renewal failed for ${id}:`, err);
        }
    }
}
/**
 * Manual sync — fetches recent inbox messages directly from Gmail and runs
 * them through the full extraction + HubSpot pipeline. Works without Pub/Sub,
 * so it's the primary way to ingest emails in local dev and for on-demand backfill.
 */
export async function manualSync(userId, maxMessages = 50) {
    const { getAccountByUserId, getAccountById } = await import("./firestore.js");
    const account = await getAccountByUserId(userId);
    if (!account)
        throw new Error("No Gmail account connected");
    let tokens = getGmailTokens(account.doc);
    tokens = await refreshGmailTokensIfNeeded(tokens);
    // Persist the refreshed tokens immediately
    await getFirestore()
        .collection("accounts")
        .doc(account.id)
        .update({ gmailTokenEncrypted: encrypt(JSON.stringify(tokens)) });
    const gmail = gmailClientFromTokens(tokens);
    // Fetch the most recent inbox messages
    const listRes = await gmail.users.messages.list({
        userId: "me",
        labelIds: ["INBOX"],
        maxResults: maxMessages,
    });
    const messages = listRes.data.messages ?? [];
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    // Re-fetch the account doc (tokens may have been updated above)
    const freshAccount = await getAccountById(account.id);
    if (!freshAccount)
        throw new Error("Account not found after token refresh");
    // Parallelize existence checking first to make sync incredibly fast
    const pendingMessages = [];
    await Promise.all(messages.map(async (msg) => {
        if (!msg.id)
            return;
        const before = await import("./firestore.js").then((m) => m.messageExists(account.id, msg.id));
        if (before) {
            skipped++;
        }
        else {
            pendingMessages.push(msg);
        }
    }));
    // Process new messages concurrently in safe parallel batches of 5 to avoid API rate limits
    await processInBatches(pendingMessages, 5, async (msg) => {
        try {
            await processGmailMessage(account.id, freshAccount.doc, tokens, msg.id);
            processed++;
        }
        catch (err) {
            console.error(`manualSync: failed to process message ${msg.id}:`, err);
            failed++;
        }
    });
    return { processed, skipped, failed };
}
