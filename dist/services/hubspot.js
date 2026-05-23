import { Client } from "@hubspot/api-client";
import { env } from "../config.js";
import { randomBytes } from "node:crypto";
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts/models/Filter.js";
import { AssociationSpecAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/objects/notes/models/AssociationSpec.js";
import { consumeOAuthState, getAccountByUserId, saveOAuthState, setHubspotTokens, } from "./firestore.js";
const HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";
export function getHubspotAuthUrl(userId) {
    const state = randomBytes(24).toString("hex");
    void saveOAuthState(state, userId, "hubspot");
    const params = new URLSearchParams({
        client_id: env.hubspotClientId,
        redirect_uri: env.hubspotRedirectUri,
        scope: "crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write crm.schemas.contacts.read crm.schemas.companies.read oauth",
        state,
    });
    return `${HUBSPOT_AUTH_URL}?${params.toString()}`;
}
export async function exchangeHubspotCode(code, state) {
    const oauthState = await consumeOAuthState(state);
    if (!oauthState || oauthState.provider !== "hubspot") {
        throw new Error("Invalid OAuth state");
    }
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: env.hubspotClientId,
        client_secret: env.hubspotClientSecret,
        redirect_uri: env.hubspotRedirectUri,
        code,
    });
    const res = await fetch(HUBSPOT_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!res.ok) {
        throw new Error(`Dench CRM token exchange failed: ${await res.text()}`);
    }
    const data = (await res.json());
    const account = await getAccountByUserId(oauthState.userId);
    if (!account)
        throw new Error("Connect Gmail before Dench CRM");
    await setHubspotTokens(account.id, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiryDate: Date.now() + data.expires_in * 1000,
    });
    return { userId: oauthState.userId };
}
function hubspotClient(tokens) {
    return new Client({ accessToken: tokens.accessToken });
}
async function withRetry(fn, attempts = 3) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            await new Promise((r) => setTimeout(r, 2 ** i * 500));
        }
    }
    throw lastError;
}
export async function upsertContactAndNote(tokens, email, extracted) {
    const client = hubspotClient(tokens);
    const contactEmail = extracted.contact.email ?? email.fromEmail;
    const search = await withRetry(() => client.crm.contacts.searchApi.doSearch({
        filterGroups: [
            {
                filters: [
                    {
                        propertyName: "email",
                        operator: FilterOperatorEnum.Eq,
                        value: contactEmail,
                    },
                ],
            },
        ],
        properties: ["email", "firstname", "lastname"],
        limit: 1,
    }));
    let contactId;
    const [firstName, ...rest] = (extracted.contact.name ??
        email.fromName ??
        "").split(" ");
    const lastName = rest.join(" ") || undefined;
    const properties = { email: contactEmail };
    if (firstName)
        properties.firstname = firstName;
    if (lastName)
        properties.lastname = lastName;
    if (extracted.contact.phone)
        properties.phone = extracted.contact.phone;
    if (extracted.contact.company)
        properties.company = extracted.contact.company;
    if (search.results[0]?.id) {
        contactId = search.results[0].id;
        await withRetry(() => client.crm.contacts.basicApi.update(contactId, { properties }));
    }
    else {
        const created = await withRetry(() => client.crm.contacts.basicApi.create({ properties }));
        contactId = created.id;
    }
    const noteBody = [
        `Email: ${email.subject}`,
        `From: ${email.fromEmail}`,
        `Type: ${extracted.emailType}`,
        extracted.dealSignals.budget
            ? `Budget: ${extracted.dealSignals.budget}`
            : null,
        extracted.dealSignals.timeline
            ? `Timeline: ${extracted.dealSignals.timeline}`
            : null,
        extracted.dealSignals.intent
            ? `Intent: ${extracted.dealSignals.intent}`
            : null,
        extracted.dealSignals.sentiment
            ? `Sentiment: ${extracted.dealSignals.sentiment}`
            : null,
        "",
        email.bodyText.slice(0, 2000),
    ]
        .filter(Boolean)
        .join("\n");
    await withRetry(() => client.crm.objects.notes.basicApi.create({
        properties: {
            hs_timestamp: email.receivedAt.getTime().toString(),
            hs_note_body: noteBody,
        },
        associations: [
            {
                to: { id: contactId },
                types: [
                    {
                        associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
                        associationTypeId: 202,
                    },
                ],
            },
        ],
    }));
    return contactId;
}
