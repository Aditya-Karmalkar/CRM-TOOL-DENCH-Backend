import { simpleParser } from "mailparser";
import type { ParsedEmail } from "@crm/shared";

function getHeader(
    headers: Array<{ name?: string | null; value?: string | null }>,
    name: string,
): string | null {
    const found = headers.find(
        (h) => h.name?.toLowerCase() === name.toLowerCase(),
    );
    return found?.value ?? null;
}

function parseAddressList(value: string | null): string[] {
    if (!value) return [];
    return value
        .split(",")
        .map((part) => {
            const match = part.match(/<([^>]+)>/);
            return (match?.[1] ?? part).trim().toLowerCase();
        })
        .filter(Boolean);
}

function parseFrom(value: string | null): {
    email: string;
    name: string | null;
} {
    if (!value) return { email: "", name: null };
    const match = value.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    if (match) {
        return {
            name: match[1]?.trim() || null,
            email: match[2].trim().toLowerCase(),
        };
    }
    return { email: value.trim().toLowerCase(), name: null };
}

export async function parseRawEmail(
    rawBase64: string,
    threadId: string,
    internalDate?: string | null,
): Promise<ParsedEmail> {
    const raw = Buffer.from(
        rawBase64.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
    );
    const parsed = await simpleParser(raw);

    const messageId =
        parsed.messageId ??
        getHeader(
            (parsed.headers as unknown as Map<string, string>).entries
                ? []
                : [],
            "Message-ID",
        ) ??
        `generated-${Date.now()}@crm-sync`;

    const getHeaderText = (
        value: typeof parsed.to | typeof parsed.cc | typeof parsed.from,
    ): string | null => {
        if (!value) return null;
        return Array.isArray(value)
            ? value.map((entry) => entry.text).join(", ")
            : value.text;
    };

    const from = parseFrom(getHeaderText(parsed.from));
    const receivedAt = internalDate
        ? new Date(parseInt(internalDate, 10))
        : (parsed.date ?? new Date());

    return {
        messageId,
        threadId,
        subject: parsed.subject ?? "(no subject)",
        fromEmail: from.email,
        fromName: from.name,
        toEmails: parseAddressList(getHeaderText(parsed.to)),
        ccEmails: parseAddressList(getHeaderText(parsed.cc)),
        bodyText:
            parsed.text ?? parsed.textAsHtml?.replace(/<[^>]+>/g, " ") ?? "",
        receivedAt,
    };
}

export function passesEmailFilter(
    fromEmail: string,
    filters: { includeDomains: string[]; excludeDomains: string[] },
): boolean {
    const domain = fromEmail.split("@")[1]?.toLowerCase() ?? "";

    if (
        filters.excludeDomains.some(
            (d) => domain === d.toLowerCase() || domain.endsWith(`.${d}`),
        )
    ) {
        return false;
    }

    if (filters.includeDomains.length === 0) return true;
    return filters.includeDomains.some(
        (d) => domain === d.toLowerCase() || domain.endsWith(`.${d}`),
    );
}
