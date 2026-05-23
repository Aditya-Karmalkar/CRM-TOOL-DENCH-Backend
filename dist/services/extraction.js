import { z } from "zod";
import { env } from "../config.js";
const extractionSchema = z.object({
    contact: z.object({
        name: z.string().nullable(),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        title: z.string().nullable(),
        company: z.string().nullable(),
    }),
    deal_signals: z.object({
        budget_mentioned: z.string().nullable(),
        timeline: z.string().nullable(),
        intent: z.string().nullable(),
        sentiment: z.enum(["positive", "neutral", "negative"]).nullable(),
    }),
    email_type: z.enum(["intro", "follow_up", "proposal", "closing", "other"]),
});
const EXTRACTION_PROMPT = `Extract structured CRM data from this email. Return ONLY valid JSON matching this schema:
{
  "contact": { "name": string|null, "email": string|null, "phone": string|null, "title": string|null, "company": string|null },
  "deal_signals": { "budget_mentioned": string|null, "timeline": string|null, "intent": string|null, "sentiment": "positive"|"neutral"|"negative"|null },
  "email_type": "intro"|"follow_up"|"proposal"|"closing"|"other"
}

Use the From header as the primary contact. Do not invent data not present in the email.`;
export async function extractFromEmail(email) {
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
    // Call Mistral Chat Completions endpoint.
    const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
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
    });
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
            name: parsed.contact.name,
            email: parsed.contact.email ?? email.fromEmail,
            phone: parsed.contact.phone,
            title: parsed.contact.title,
            company: parsed.contact.company,
        },
        dealSignals: {
            budget: parsed.deal_signals.budget_mentioned,
            timeline: parsed.deal_signals.timeline,
            intent: parsed.deal_signals.intent,
            sentiment: parsed.deal_signals.sentiment,
        },
        emailType: parsed.email_type,
    };
}
function mockExtraction(email) {
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
