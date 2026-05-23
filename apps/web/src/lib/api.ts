import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function getToken(): Promise<string> {
    let user = auth.currentUser;
    if (user) return user.getIdToken();

    // If currentUser is not yet available (race after sign-in), wait briefly for auth state to appear.
    // Timeout after 5s to avoid hanging forever.
    return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Not authenticated"));
        }, 5000);

        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) {
                clearTimeout(timeout);
                unsub();
                void u.getIdToken().then(resolve, reject);
            }
        });
    });
}

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
        },
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed: ${res.status}`);
    }

    return res.json() as Promise<T>;
}
