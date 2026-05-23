import type { ExtractedData, SignalType, DealSignal } from "@crm/shared";
import { Timestamp } from "firebase-admin/firestore";
import { getFirestore } from "./firebase.js";

const SIGNALS = "dealSignals";

// ── Scoring weights ──────────────────────────────────────────────────────────

const DECISION_MAKER_TITLES = [
    "ceo", "cto", "cfo", "coo", "vp", "vice president", "director",
    "head of", "chief", "founder", "owner", "president", "partner",
];

const COMPETITOR_KEYWORDS = [
    "salesforce", "hubspot", "pipedrive", "zoho", "monday", "notion",
    "airtable", "close", "outreach", "salesloft", "apollo", "competitor",
    "alternative", "vs ", "versus", "switching from", "replacing",
];

const OBJECTION_KEYWORDS = [
    "too expensive", "not sure", "need to think", "not ready", "budget concern",
    "not a priority", "already have", "not interested", "maybe later",
    "need approval", "need to discuss", "concerns about", "worried about",
];

const BUDGET_PATTERN = /\$[\d,]+|\d+[kK]\s*(usd|dollars?)?|\bbudget\b|\bprice\b|\bcost\b|\bpricin[g]?\b/i;
const TIMELINE_URGENT_PATTERN = /\b(asap|urgent|immediately|this week|this month|by end of|deadline|q[1-4]\s*\d{4}|next \d+ days?|within \d+ days?)\b/i;

function scoreSignal(
    type: SignalType,
    extracted: ExtractedData,
    bodyText: string,
): number {
    let score = 0;
    const body = bodyText.toLowerCase();
    const title = (extracted.contact.title ?? "").toLowerCase();

    // Budget (+25)
    if (type === "budget" || BUDGET_PATTERN.test(bodyText)) score += 25;

    // Timeline urgency (+20)
    if (type === "timeline" || TIMELINE_URGENT_PATTERN.test(bodyText)) score += 20;

    // Positive buying intent (+20)
    if (extracted.dealSignals.sentiment === "positive" &&
        (extracted.dealSignals.intent ?? "").toLowerCase().includes("buy") ||
        (extracted.dealSignals.intent ?? "").toLowerCase().includes("purchase") ||
        (extracted.dealSignals.intent ?? "").toLowerCase().includes("interested") ||
        extracted.emailType === "proposal" || extracted.emailType === "closing") {
        score += 20;
    }

    // Decision-maker title (+20)
    if (DECISION_MAKER_TITLES.some(t => title.includes(t))) score += 20;

    // Competitor mention (+10)
    if (COMPETITOR_KEYWORDS.some(k => body.includes(k))) score += 10;

    // Objection language (+5)
    if (OBJECTION_KEYWORDS.some(k => body.includes(k))) score += 5;

    // Base score so nothing is 0
    score = Math.max(score, 10);

    return Math.min(score, 100);
}

// ── Signal type detection ────────────────────────────────────────────────────

function detectSignalTypes(extracted: ExtractedData, bodyText: string): SignalType[] {
    const types: SignalType[] = [];
    const body = bodyText.toLowerCase();
    const title = (extracted.contact.title ?? "").toLowerCase();

    if (BUDGET_PATTERN.test(bodyText) || extracted.dealSignals.budget) {
        types.push("budget");
    }
    if (TIMELINE_URGENT_PATTERN.test(bodyText) || extracted.dealSignals.timeline) {
        types.push("timeline");
    }
    if (COMPETITOR_KEYWORDS.some(k => body.includes(k))) {
        types.push("competitor");
    }
    if (
        extracted.emailType === "proposal" ||
        extracted.emailType === "closing" ||
        (extracted.dealSignals.intent ?? "").toLowerCase().includes("buy") ||
        (extracted.dealSignals.intent ?? "").toLowerCase().includes("interested") ||
        extracted.dealSignals.sentiment === "positive"
    ) {
        types.push("buying_intent");
    }
    if (DECISION_MAKER_TITLES.some(t => title.includes(t))) {
        types.push("decision_maker");
    }
    if (OBJECTION_KEYWORDS.some(k => body.includes(k))) {
        types.push("objection");
    }

    return types;
}

// ── Next-step engine ─────────────────────────────────────────────────────────

function getNextSteps(type: SignalType, extracted: ExtractedData): string[] {
    const name = extracted.contact.name ?? "the contact";
    const company = extracted.contact.company ?? "their company";

    const steps: Record<SignalType, string[]> = {
        budget: [
            `Confirm budget scope and approval process with ${name} at ${company}.`,
            "Send a tailored pricing proposal based on their stated budget range.",
            "Schedule a call to walk through ROI and cost justification.",
        ],
        timeline: [
            `Schedule a follow-up call with ${name} within their urgency window.`,
            "Send a project timeline and onboarding overview to accelerate decision.",
            "Confirm key milestones and deadlines to align on next steps.",
        ],
        competitor: [
            `Send ${name} a competitive comparison document highlighting your differentiators.`,
            "Offer a live demo focused on features the competitor lacks.",
            "Share a case study from a customer who switched from the competitor.",
        ],
        buying_intent: [
            `Move ${name} from ${company} to the next stage in your pipeline.`,
            "Send a proposal or contract to capitalize on their buying intent.",
            "Schedule a closing call to address any remaining questions.",
        ],
        decision_maker: [
            `Schedule a discovery call directly with ${name} as the decision-maker.`,
            "Prepare an executive summary tailored to their strategic priorities.",
            "Send a personalized outreach referencing their role and company goals.",
        ],
        objection: [
            `Address ${name}'s objection with a relevant case study or proof point.`,
            "Schedule a call to understand and resolve their specific concerns.",
            "Send a FAQ or objection-handling document to build confidence.",
        ],
    };

    return steps[type].slice(0, 3);
}

// ── Raw excerpt builder ──────────────────────────────────────────────────────

function buildExcerpt(extracted: ExtractedData, bodyText: string): string {
    // Prefer explicit deal signal fields, fall back to first 200 chars of body
    const parts: string[] = [];
    if (extracted.dealSignals.budget) parts.push(`Budget: ${extracted.dealSignals.budget}`);
    if (extracted.dealSignals.timeline) parts.push(`Timeline: ${extracted.dealSignals.timeline}`);
    if (extracted.dealSignals.intent) parts.push(`Intent: ${extracted.dealSignals.intent}`);
    if (parts.length > 0) return parts.join(" · ");
    return bodyText.slice(0, 200).replace(/\s+/g, " ").trim();
}

// ── Firestore helpers ────────────────────────────────────────────────────────

export async function createSignalsFromEmail(
    emailId: string,
    userId: string,
    extracted: ExtractedData,
    bodyText: string,
    subject: string,
): Promise<void> {
    const types = detectSignalTypes(extracted, bodyText);
    if (types.length === 0) return;

    const db = getFirestore();
    const batch = db.batch();

    for (const type of types) {
        const score = scoreSignal(type, extracted, bodyText);
        const nextSteps = getNextSteps(type, extracted);
        const excerpt = buildExcerpt(extracted, bodyText);

        const ref = db.collection(SIGNALS).doc();
        batch.set(ref, {
            emailId,
            userId,
            contactName: extracted.contact.name ?? null,
            contactEmail: extracted.contact.email ?? null,
            companyName: extracted.contact.company ?? null,
            signalType: type,
            signalScore: score,
            rawExcerpt: excerpt,
            nextSteps,
            subject,
            createdAt: Timestamp.now(),
        });

        // Fire Slack notification for hot signals (score >= 75) — non-blocking
        if (score >= 75) {
            void notifySlack(userId, {
                contactName: extracted.contact.name ?? "Unknown",
                companyName: extracted.contact.company ?? "Unknown",
                signalType: type,
                signalScore: score,
                rawExcerpt: excerpt,
                nextStep: nextSteps[0],
            });
        }
    }

    await batch.commit();
}

export async function listSignalsForUser(userId: string): Promise<DealSignal[]> {
    const snap = await getFirestore()
        .collection(SIGNALS)
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();

    return snap.docs.map((d) => {
        const data = d.data();
        return {
            signalId: d.id,
            emailId: data.emailId,
            userId: data.userId,
            contactName: data.contactName ?? null,
            contactEmail: data.contactEmail ?? null,
            companyName: data.companyName ?? null,
            signalType: data.signalType,
            signalScore: data.signalScore,
            rawExcerpt: data.rawExcerpt,
            nextSteps: data.nextSteps ?? [],
            subject: data.subject ?? "",
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        } satisfies DealSignal;
    });
}

export async function getSlackConfig(userId: string): Promise<{ enabled: boolean; webhookUrl: string } | null> {
    const doc = await getFirestore().collection("slackConfigs").doc(userId).get();
    if (!doc.exists) return null;
    return doc.data() as { enabled: boolean; webhookUrl: string };
}

export async function saveSlackConfig(
    userId: string,
    enabled: boolean,
    webhookUrl: string,
): Promise<void> {
    await getFirestore().collection("slackConfigs").doc(userId).set({ enabled, webhookUrl });
}

// ── Slack notification ───────────────────────────────────────────────────────

async function notifySlack(
    userId: string,
    payload: {
        contactName: string;
        companyName: string;
        signalType: SignalType;
        signalScore: number;
        rawExcerpt: string;
        nextStep: string;
    },
): Promise<void> {
    const config = await getSlackConfig(userId);
    if (!config?.enabled || !config.webhookUrl) {
        console.warn(`Slack not configured for user ${userId}, skipping hot signal notification.`);
        return;
    }

    const typeLabel = payload.signalType.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const message = {
        text: `🔥 *Hot Signal Detected* — Score: ${payload.signalScore}/100`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `🔥 *Hot Signal: ${typeLabel}* (Score: ${payload.signalScore}/100)\n*Contact:* ${payload.contactName} @ ${payload.companyName}`,
                },
            },
            {
                type: "section",
                text: { type: "mrkdwn", text: `*Excerpt:* _${payload.rawExcerpt.slice(0, 150)}_` },
            },
            {
                type: "section",
                text: { type: "mrkdwn", text: `*Suggested next step:* ${payload.nextStep}` },
            },
        ],
    };

    let attempt = 0;
    let delay = 1000;
    while (attempt < 3) {
        try {
            const resp = await fetch(config.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(message),
            });
            if (resp.ok) return;
            throw new Error(`Slack webhook returned ${resp.status}`);
        } catch (err) {
            attempt++;
            if (attempt >= 3) {
                console.error("Slack notification failed permanently:", err);
                return;
            }
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        }
    }
}
