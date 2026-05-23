import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { listSyncsForUser } from "../services/firestore.js";

export const peopleRouter = Router();

peopleRouter.use(requireAuth);

export type ContactStatus = "new" | "contacted" | "qualified" | "converted";

export interface PersonRecord {
    id: string;          // derived from syncedEmail id + email hash
    emailId: string;     // source synced email id
    fullName: string | null;
    email: string | null;
    company: string | null;
    title: string | null;
    linkedin: string | null;
    notes: string | null;
    status: ContactStatus;
    receivedAt: string;
    sentiment: string | null;
    emailType: string | null;
    phone: string | null;
}

/** Derive a LinkedIn search URL from a person's name + company */
function buildLinkedIn(name: string | null, company: string | null): string | null {
    if (!name) return null;
    const q = encodeURIComponent([name, company].filter(Boolean).join(" "));
    return `https://www.linkedin.com/search/results/people/?keywords=${q}`;
}

/** Heuristic status based on email type + sentiment */
function deriveStatus(
    emailType: string | null,
    sentiment: string | null,
): ContactStatus {
    if (emailType === "closing") return "converted";
    if (emailType === "proposal") return "qualified";
    if (emailType === "follow_up") return "contacted";
    if (sentiment === "positive") return "contacted";
    return "new";
}

/**
 * GET /people
 * Returns deduplicated contacts extracted from all synced emails.
 */
peopleRouter.get("/", async (req: AuthenticatedRequest, res) => {
    try {
        // Pull all synced emails (no limit — we aggregate contacts)
        const syncs = await listSyncsForUser(req.user!.uid, false);

        // Deduplicate by contact email address
        const seen = new Map<string, PersonRecord>();

        for (const sync of syncs) {
            if (!sync.extractedData?.contact) continue;
            const contact = sync.extractedData.contact;

            // Use the contact email or fallback to fromEmail as dedup key
            const key = (contact.email ?? sync.fromEmail).toLowerCase().trim();
            if (!key) continue;

            // If already seen, keep the richer/more-recent record
            if (seen.has(key)) continue;

            const name = contact.name ?? null;
            const company = contact.company ?? null;
            const linkedin = buildLinkedIn(name, company);
            const status = deriveStatus(
                sync.extractedData.emailType,
                sync.extractedData.dealSignals?.sentiment ?? null,
            );

            seen.set(key, {
                id: `${sync.id}-${key}`,
                emailId: sync.id,
                fullName: name,
                email: key,
                company,
                title: contact.title ?? null,
                linkedin,
                notes: sync.bodyText
                    ? sync.bodyText.slice(0, 180).replace(/\s+/g, " ").trim()
                    : null,
                status,
                receivedAt: sync.receivedAt,
                sentiment: sync.extractedData.dealSignals?.sentiment ?? null,
                emailType: sync.extractedData.emailType ?? null,
                phone: contact.phone ?? null,
            });
        }

        const people = Array.from(seen.values()).sort(
            (a, b) =>
                new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
        );

        // Pipeline counts
        const pipeline = {
            new: people.filter((p) => p.status === "new").length,
            contacted: people.filter((p) => p.status === "contacted").length,
            qualified: people.filter((p) => p.status === "qualified").length,
            converted: people.filter((p) => p.status === "converted").length,
        };

        res.json({ people, pipeline, total: people.length });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load people";
        res.status(500).json({ error: message, people: [], pipeline: {}, total: 0 });
    }
});
