import { z } from "zod";
import type { ExtractedData, ParsedEmail } from "@crm/shared";
import { env } from "../config.js";

const extractionSchema = z.object({
    contact: z.object({
        name: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        title: z.string().optional().nullable(),
        company: z.string().optional().nullable(),
    }).optional().default({}),
    deal_signals: z.object({
        budget_mentioned: z.string().optional().nullable(),
        timeline: z.string().optional().nullable(),
        intent: z.string().optional().nullable(),
        sentiment: z.enum(["positive", "neutral", "negative"]).optional().nullable(),
    }).optional().default({}),
    email_type: z.enum(["intro", "follow_up", "proposal", "closing", "other"]).optional().default("other"),
});

const EXTRACTION_PROMPT = `Extract structured CRM data from this email. Return ONLY valid JSON matching this schema:
{
  "contact": { "name": string|null, "email": string|null, "phone": string|null, "title": string|null, "company": string|null },
  "deal_signals": { "budget_mentioned": string|null, "timeline": string|null, "intent": string|null, "sentiment": "positive"|"neutral"|"negative"|null },
  "email_type": "intro"|"follow_up"|"proposal"|"closing"|"other"
}

Use the From header as the primary contact. Do not invent data not present in the email.`;

export async function extractFromEmail(
    email: ParsedEmail,
): Promise<ExtractedData> {
    if (!env.mistralApiKey) {
        return mockExtraction(email);
    }

    const userContent = [
        `From: ${email.fromName ?? ""} <${email.fromEmail}>`,
        `Subject: ${email.subject}`,
        `To: ${email.toEmails.join(", ")}`,
        email.ccEmails.length ? `CC: ${email.ccEmails.join(", ")}` : "",
        "",
        email.bodyText.slice(0, 12000),
    ]
        .filter(Boolean)
        .join("\n");

    const maxRetries = 4;
    let delay = 1000; // Start with 1 second delay

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Call Mistral Chat Completions endpoint.
            const resp = await fetch(
                "https://api.mistral.ai/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${env.mistralApiKey}`,
                    },
                    body: JSON.stringify({
                        model: "mistral-large-latest",
                        messages: [
                            {
                                role: "user",
                                content: `${EXTRACTION_PROMPT}\n\n---\n\n${userContent}`,
                            },
                        ],
                        response_format: { type: "json_object" },
                    }),
                },
            );

            if (resp.status === 429) {
                if (attempt === maxRetries) {
                    throw new Error("Mistral API rate limit exceeded after maximum retry attempts.");
                }
                // Randomized Jitter: Distributes retries over time to prevent concurrent spikes
                const jitter = Math.random() * 1500;
                const totalDelay = delay + jitter;
                console.warn(`Mistral API rate limited (429). Retrying attempt ${attempt}/${maxRetries} after ${Math.round(totalDelay)}ms...`);
                await new Promise((resolve) => setTimeout(resolve, totalDelay));
                delay *= 2.5; // Scale backoff
                continue;
            }

            if (!resp.ok) {
                const respText = await resp.text();
                throw new Error(`Mistral API returned status ${resp.status}: ${respText}`);
            }

            const result = await resp.json();
            const assistantContent = result.choices?.[0]?.message?.content;
            if (!assistantContent) {
                throw new Error("No content received from Mistral API");
            }

            const parsed = extractionSchema.parse(JSON.parse(assistantContent));

            return {
                contact: {
                    name: parsed.contact.name ?? null,
                    email: parsed.contact.email ?? email.fromEmail,
                    phone: parsed.contact.phone ?? null,
                    title: parsed.contact.title ?? null,
                    company: parsed.contact.company ?? null,
                },
                dealSignals: {
                    budget: parsed.deal_signals.budget_mentioned ?? null,
                    timeline: parsed.deal_signals.timeline ?? null,
                    intent: parsed.deal_signals.intent ?? null,
                    sentiment: parsed.deal_signals.sentiment ?? null,
                },
                emailType: parsed.email_type,
            };
        } catch (err) {
            if (attempt === maxRetries) {
                throw err;
            }
            console.error(`Mistral API attempt ${attempt} failed, retrying in ${delay}ms:`, err);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
        }
    }

    throw new Error("Mistral API call failed after multiple attempts.");
}

function mockExtraction(email: ParsedEmail): ExtractedData {
    return {
        contact: {
            name: email.fromName,
            email: email.fromEmail,
            phone: null,
            title: null,
            company: null,
        },
        dealSignals: {
            budget: null,
            timeline: null,
            intent: null,
            sentiment: "neutral",
        },
        emailType: "other",
    };
}
