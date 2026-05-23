import admin from "firebase-admin";
import fs from "node:fs";
import { resolve } from "node:path";
import { env } from "../config.js";
let initialized = false;
export function initFirebase() {
    if (initialized && admin.apps.length) {
        return admin.app();
    }
    // Priority: explicit file path -> JSON from env -> projectId-only
    if (env.firebaseServiceAccountPath) {
        try {
            const abs = resolve(process.cwd(), env.firebaseServiceAccountPath);
            const txt = fs.readFileSync(abs, { encoding: "utf8" });
            const credentials = JSON.parse(txt);
            admin.initializeApp({
                credential: admin.credential.cert(credentials),
                projectId: env.firebaseProjectId || credentials.projectId,
            });
            initialized = true;
            return admin.app();
        }
        catch (err) {
            console.warn("Warning: failed to read/parse FIREBASE_SERVICE_ACCOUNT_PATH, falling back to other methods", err);
        }
    }
    if (env.firebaseServiceAccountJson) {
        try {
            const credentials = JSON.parse(env.firebaseServiceAccountJson);
            admin.initializeApp({
                credential: admin.credential.cert(credentials),
                projectId: env.firebaseProjectId || credentials.projectId,
            });
        }
        catch (err) {
            console.warn("Warning: failed to parse FIREBASE_SERVICE_ACCOUNT_JSON, falling back to projectId-only init", err);
            if (env.firebaseProjectId) {
                admin.initializeApp({ projectId: env.firebaseProjectId });
            }
            else {
                admin.initializeApp({ projectId: "crm-sync-dev" });
            }
        }
    }
    else if (env.firebaseProjectId) {
        admin.initializeApp({ projectId: env.firebaseProjectId });
    }
    else {
        admin.initializeApp({ projectId: "crm-sync-dev" });
    }
    initialized = true;
    return admin.app();
}
export function getFirestore() {
    initFirebase();
    return admin.firestore();
}
export function getAuth() {
    initFirebase();
    return admin.auth();
}
export { admin };
