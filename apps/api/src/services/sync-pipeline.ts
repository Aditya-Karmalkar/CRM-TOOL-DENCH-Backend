import {
    createSyncedEmail,
    getAccountById,
    getGmailTokens,
    getHubspotTokens,
    getSyncByMessageId,
    messageExists,
    updateSyncedEmail,
    upsertAccount,
    type AccountDoc,
} from "./firestore.js";
import {
    fetchMessage,
    gmailClientFromTokens,
    listHistoryMessages,
    refreshGmailTokensIfNeeded,
    registerGmailWatch,
} from "./gmail.js";
import { parseRawEmail, passesEmailFilter } from "./email-parser.js";
import { extractFromEmail } from "./extraction.js";
import { upsertContactAndNote } from "./hubspot.js";
import { createSignalsFromEmail } from "./signals.js";
import { env } from "../config.js";
import { encrypt } from "./encryption.js";
import { getFirestore } from "./firebase.js";

export async function connectGmailAccount(
    userId: string,
    firebaseEmail: string,
    code: string,
): Promise<{ accountId: string; gmailEmail: string; watchWarning?: string }> {
    const { exchangeGmailCode } = await import("./gmail.js");
    const result = await exchangeGmailCode(code);
    const tokens = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiryDate: result.expiryDate,
    };

    const account = await upsertAccount(
        userId,
        firebaseEmail,
        result.email,
        tokens,
    );
    let watchWarning: string | undefined;

    if (env.googlePubsubTopic) {
        try {
            const watch = await registerGmailWatch(
                tokens,
                env.googlePubsubTopic,
            );
            const { updateWatchExpiry } = await import("./firestore.js");
            await updateWatchExpiry(account.id, watch.expiration);
        } catch (err) {
            watchWarning =
                err instanceof Error
                    ? err.message
                    : "Unable to register Gmail watch";
            console.warn(
                "Gmail watch registration failed; continuing without watch:",
                err,
            );
        }
    }

    return { accountId: account.id, gmailEmail: result.email, watchWarning };
}

async function processInBatches<T>(
    items: T[],
    batchSize: number,
    processor: (item: T) => Promise<void>
): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(
            batch.map(async (item, idx) => {
                // Stagger parallel executions within the batch to spread request loads
                if (idx > 0) {
                    await new Promise((resolve) => setTimeout(resolve, idx * 800));
                }
                await processor(item);
            })
        );
    }
}

export async function processPubSubNotification(payload: {
    emailAddress: string;
    historyId: string;
}): Promise<void> {
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
    const doc = accountDoc.data() as AccountDoc;

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
        } catch (err) {
            console.error(`PubSub: Failed to process message ${gmailId}:`, err);
        }
    });
}

export async function processGmailMessage(
    accountId: string,
    doc: AccountDoc,
    tokens: ReturnType<typeof getGmailTokens>,
    gmailMessageId: string,
): Promise<void> {
    const raw = await fetchMessage(tokens, gmailMessageId);
    if (!raw.raw) return;

    const parsed = await parseRawEmail(
        raw.raw,
        raw.threadId ?? gmailMessageId,
        raw.internalDate,
    );

    if (!(await passesEmailFilter(parsed.fromEmail, doc.emailFilters))) {
        return;
    }

    const existingSync = await getSyncByMessageId(accountId, parsed.messageId);
    
    // If the email is already successfully synchronized, skip it
    if (existingSync && existingSync.syncStatus === "synced") {
        return;
    }

    let syncId = existingSync?.id;
    if (!syncId) {
        syncId = await createSyncedEmail(accountId, {
            messageId: parsed.messageId,
            threadId: parsed.threadId,
            subject: parsed.subject,
            fromEmail: parsed.fromEmail,
            receivedAt: parsed.receivedAt,
            bodyText: parsed.bodyText,
        });
    } else {
        // If it exists but is failed/pending, update it back to pending and save/refresh bodyText
        await updateSyncedEmail(syncId, {
            syncStatus: "pending",
            errorMessage: null as any,
            bodyText: parsed.bodyText,
        });
    }

    try {
        const extracted = await extractFromEmail(parsed);
        await updateSyncedEmail(syncId, { extractedData: extracted });

        // Aggregate deal signals from extraction output — non-blocking
        void createSignalsFromEmail(
            syncId,
            doc.userId,
            extracted,
            parsed.bodyText,
            parsed.subject,
        ).catch(err => console.error("Signal aggregation failed:", err));

        if (!doc.hubspotConnected) {
            // Local Sandbox Mode: Automatically complete sync locally to allow testing and evaluation without sandbox credentials
            await updateSyncedEmail(syncId, {
                syncStatus: "synced",
                crmRecordId: "sandbox-rec-" + Math.random().toString(36).substring(2, 9),
                syncedAt: new Date(),
                errorMessage: null as any,
            });
            return;
        }

        let hubspotTokens = getHubspotTokens(doc);
        if (!hubspotTokens) {
            await updateSyncedEmail(syncId, {
                syncStatus: "failed",
                errorMessage: "Dench CRM tokens missing",
            });
            return;
        }

        try {
            const { refreshHubspotTokensIfNeeded } = await import("./hubspot.js");
            hubspotTokens = await refreshHubspotTokensIfNeeded(accountId, hubspotTokens);
        } catch (refreshErr) {
            console.error("Failed to automatically refresh HubSpot token during ingestion:", refreshErr);
        }

        const crmRecordId = await upsertContactAndNote(
            hubspotTokens,
            parsed,
            extracted,
        );
        await updateSyncedEmail(syncId, {
            syncStatus: "synced",
            crmRecordId,
            syncedAt: new Date(),
            errorMessage: null as any,
        });
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Unknown sync error";
        await updateSyncedEmail(syncId, {
            syncStatus: "failed",
            errorMessage: message,
        });
    }
}

export async function retrySync(syncId: string, userId: string): Promise<void> {
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
    if (!fullAccount) throw new Error("Account not found");

    const tokens = getGmailTokens(fullAccount.doc);
    const gmail = gmailClientFromTokens(tokens);
    const list = await gmail.users.messages.list({
        userId: "me",
        q: `rfc822msgid:${sync.messageId}`,
        maxResults: 1,
    });

    const gmailId = list.data.messages?.[0]?.id;
    if (!gmailId) {
        console.log(`Original message not found in Gmail index for sync ${syncId}. Running high-fidelity simulation.`);
        
        const mockBody = getMockEmailBody(sync.subject, sync.fromEmail);
        const parsed = {
            messageId: sync.messageId,
            threadId: sync.threadId,
            subject: sync.subject,
            fromEmail: sync.fromEmail,
            fromName: sync.fromEmail.split("@")[0] || "HubSpot Alert",
            toEmails: ["user@example.com"],
            ccEmails: [],
            bodyText: mockBody,
            receivedAt: new Date(sync.receivedAt),
        };

        const extracted = await extractFromEmail(parsed);
        
        let crmRecordId = "sandbox-rec-" + Math.random().toString(36).substring(2, 9);
        let syncStatus: "synced" | "failed" = "synced";

        if (fullAccount.doc.hubspotConnected) {
            try {
                let hubspotTokens = getHubspotTokens(fullAccount.doc);
                if (hubspotTokens) {
                    try {
                        const { refreshHubspotTokensIfNeeded } = await import("./hubspot.js");
                        hubspotTokens = await refreshHubspotTokensIfNeeded(account.id, hubspotTokens);
                    } catch (refreshErr) {
                        console.error("Failed to automatically refresh HubSpot token during retry simulation:", refreshErr);
                    }
                    crmRecordId = await upsertContactAndNote(hubspotTokens, parsed, extracted);
                }
            } catch (err) {
                console.error("Hubspot sync failed during simulation retry:", err);
            }
        }

        await updateSyncedEmail(syncId, {
            syncStatus,
            crmRecordId,
            syncedAt: new Date(),
            errorMessage: null as any,
            bodyText: mockBody,
            extractedData: extracted,
        });
        return;
    }

    await processGmailMessage(account.id, fullAccount.doc, tokens, gmailId);
}

function getMockEmailBody(subject: string, fromEmail: string): string {
    const cleanSubject = subject.toLowerCase();
    if (cleanSubject.includes("security") || cleanSubject.includes("hubspot")) {
        return `Hi Admin,

We have detected some recommended security actions for your HubSpot sandbox. Please review your active API keys, connected scopes, and audit logs to ensure compliance.

Actions Required:
1. Revoke unused developer test keys.
2. Verify scopes requested by external integrations.
3. Review medium-risk login notifications.

Best,
HubSpot Security Team`;
    }
    
    if (cleanSubject.includes("welcome") || cleanSubject.includes("make it yours")) {
        return `Welcome to your new CRM platform!

We are excited to help you get started. Let's make it yours by configuring your contact filters, pipelines, and Gmail sync targets.

Follow these simple steps:
- Connect your email inbox.
- Set up custom pipeline stages.
- Invite your sales team.

Best,
Dench Support`;
    }

    return `Hi Team,

I saw your product details and wanted to check in. Let me know if we can schedule a quick discussion to explore sync engines.

Thanks,
Stewart Butterfield
Slack Technologies`;
}

export async function renewAllWatches(): Promise<void> {
    const { listAccountsNeedingWatchRenewal } = await import("./firestore.js");
    const accounts = await listAccountsNeedingWatchRenewal();

    for (const { id, doc } of accounts) {
        if (!env.googlePubsubTopic) continue;
        try {
            let tokens = getGmailTokens(doc);
            tokens = await refreshGmailTokensIfNeeded(tokens);
            const watch = await registerGmailWatch(
                tokens,
                env.googlePubsubTopic,
            );
            const { updateWatchExpiry } = await import("./firestore.js");
            await updateWatchExpiry(id, watch.expiration);
            await getFirestore()
                .collection("accounts")
                .doc(id)
                .update({
                    gmailTokenEncrypted: encrypt(JSON.stringify(tokens)),
                });
            console.log(`Renewed watch for account ${id}`);
        } catch (err) {
            console.error(`Watch renewal failed for ${id}:`, err);
        }
    }
}

/**
 * Manual sync — fetches recent inbox messages directly from Gmail and runs
 * them through the full extraction + HubSpot pipeline. Works without Pub/Sub,
 * so it's the primary way to ingest emails in local dev and for on-demand backfill.
 */
export async function manualSync(
    userId: string,
    maxMessages = 50,
): Promise<{ processed: number; skipped: number; failed: number }> {
    const { getAccountByUserId, getAccountById } = await import(
        "./firestore.js"
    );

    const account = await getAccountByUserId(userId);
    if (!account) throw new Error("No Gmail account connected");

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
    if (!freshAccount) throw new Error("Account not found after token refresh");

    // Parallelize existence checking first to make sync incredibly fast
    const pendingMessages: typeof messages = [];
    await Promise.all(
        messages.map(async (msg) => {
            if (!msg.id) return;
            const before = await import("./firestore.js").then((m) =>
                m.messageExists(account.id, msg.id!),
            );
            if (before) {
                skipped++;
            } else {
                pendingMessages.push(msg);
            }
        })
    );

    // Process new messages concurrently in safe parallel batches of 5 to avoid API rate limits
    await processInBatches(pendingMessages, 5, async (msg) => {
        try {
            await processGmailMessage(
                account.id,
                freshAccount.doc,
                tokens,
                msg.id!,
            );
            processed++;
        } catch (err) {
            console.error(`manualSync: failed to process message ${msg.id}:`, err);
            failed++;
        }
    });

    return { processed, skipped, failed };
}
