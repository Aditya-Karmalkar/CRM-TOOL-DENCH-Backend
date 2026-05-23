import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function optional(name, fallback = "") {
    return process.env[name] ?? fallback;
}
export const env = {
    port: parseInt(optional("PORT", "3001"), 10),
    nodeEnv: optional("NODE_ENV", "development"),
    isDev: optional("NODE_ENV", "development") !== "production",
    firebaseProjectId: optional("FIREBASE_PROJECT_ID"),
    firebaseServiceAccountJson: optional("FIREBASE_SERVICE_ACCOUNT_JSON"),
    firebaseServiceAccountPath: optional("FIREBASE_SERVICE_ACCOUNT_PATH"),
    googleClientId: optional("GOOGLE_CLIENT_ID"),
    googleClientSecret: optional("GOOGLE_CLIENT_SECRET"),
    googlePubsubTopic: optional("GOOGLE_PUBSUB_TOPIC"),
    googlePubsubVerificationToken: optional("GOOGLE_PUBSUB_VERIFICATION_TOKEN", "crm-pubsub-secret"),
    hubspotClientId: optional("HUBSPOT_CLIENT_ID"),
    hubspotClientSecret: optional("HUBSPOT_CLIENT_SECRET"),
    hubspotRedirectUri: optional("HUBSPOT_REDIRECT_URI", "http://localhost:3001/auth/hubspot/callback"),
    anthropicApiKey: optional("ANTHROPIC_API_KEY"),
    mistralApiKey: optional("MISTRAL_API_KEY"),
    lightpandaApiKey: optional("LIGHTPANDA_API_KEY"),
    encryptionKey: optional("ENCRYPTION_KEY"),
    webAppUrl: optional("WEB_APP_URL", "http://localhost:5173"),
    apiUrl: optional("API_URL", "http://localhost:3001"),
    gmailRedirectUri: optional("GMAIL_REDIRECT_URI", "http://localhost:5173/connect/gmail/callback"),
};
export function assertProductionConfig() {
    if (env.isDev)
        return;
    required("FIREBASE_PROJECT_ID");
    required("ENCRYPTION_KEY");
    required("GOOGLE_CLIENT_ID");
    required("GOOGLE_CLIENT_SECRET");
}
