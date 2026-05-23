import { google } from 'googleapis';
import { GMAIL_SCOPES } from '@crm/shared';
import { env } from '../config.js';
import type { StoredTokens } from './firestore.js';

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    env.gmailRedirectUri,
  );
}

export function getGmailAuthUrl(state: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [...GMAIL_SCOPES],
    state,
  });
}

export async function exchangeGmailCode(code: string): Promise<StoredTokens & { email: string }> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Gmail OAuth did not return refresh token. Re-authorize with prompt=consent.');
  }

  client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: client });
  const profile = await gmail.users.getProfile({ userId: 'me' });

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date ?? Date.now() + 3600 * 1000,
    email: profile.data.emailAddress ?? '',
  };
}

export function gmailClientFromTokens(tokens: StoredTokens) {
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });
  return google.gmail({ version: 'v1', auth: client });
}

export async function refreshGmailTokensIfNeeded(tokens: StoredTokens): Promise<StoredTokens> {
  if (tokens.expiryDate > Date.now() + 60_000) {
    return tokens;
  }
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });
  const { credentials } = await client.refreshAccessToken();
  return {
    accessToken: credentials.access_token ?? tokens.accessToken,
    refreshToken: credentials.refresh_token ?? tokens.refreshToken,
    expiryDate: credentials.expiry_date ?? Date.now() + 3600 * 1000,
  };
}

export async function registerGmailWatch(
  tokens: StoredTokens,
  topicName: string,
): Promise<{ historyId: string; expiration: Date }> {
  const gmail = gmailClientFromTokens(tokens);
  const res = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: ['INBOX'],
    },
  });

  const expirationMs = parseInt(res.data.expiration ?? '0', 10);
  return {
    historyId: res.data.historyId ?? '',
    expiration: new Date(expirationMs),
  };
}

export async function stopGmailWatch(tokens: StoredTokens): Promise<void> {
  const gmail = gmailClientFromTokens(tokens);
  await gmail.users.stop({ userId: 'me' });
}

export async function fetchMessage(tokens: StoredTokens, gmailMessageId: string) {
  const gmail = gmailClientFromTokens(tokens);
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: gmailMessageId,
    format: 'raw',
  });
  return res.data;
}

export async function listHistoryMessages(
  tokens: StoredTokens,
  startHistoryId: string,
): Promise<string[]> {
  const gmail = gmailClientFromTokens(tokens);
  const res = await gmail.users.history.list({
    userId: 'me',
    startHistoryId,
    historyTypes: ['messageAdded'],
  });

  const ids: string[] = [];
  for (const h of res.data.history ?? []) {
    for (const added of h.messagesAdded ?? []) {
      if (added.message?.id) ids.push(added.message.id);
    }
  }
  return ids;
}
