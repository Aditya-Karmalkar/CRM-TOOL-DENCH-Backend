import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { env } from "../config.js";
import puppeteer from "puppeteer-core";

export const scraperRouter = Router();

type ScraperResult = {
    company: { name: string; linkedinUrl: string; snippet: string };
    employees: Array<{ name: string; title: string; url: string | null }>;
    note?: string;
};

// In-memory cache: company name → { result, expiresAt }
const scraperCache = new Map<string, { result: ScraperResult; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCached(key: string): ScraperResult | null {
    const entry = scraperCache.get(key.toLowerCase());
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { scraperCache.delete(key.toLowerCase()); return null; }
    return entry.result;
}

function setCache(key: string, result: ScraperResult) {
    scraperCache.set(key.toLowerCase(), { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

scraperRouter.post("/", async (req: AuthenticatedRequest, res) => {
    try {
        const { query } = req.body as { query: string };
        if (!query) {
            res.status(400).json({ error: "Query parameter is required" });
            return;
        }

        // Serve from cache if available
        const cached = getCached(query);
        if (cached) {
            res.json({ ...cached, note: "Served from cache." });
            return;
        }

        if (!env.lightpandaApiKey) {
            const data = await getAiFallback(query);
            setCache(query, data);
            res.json(data);
            return;
        }

        const searchUrl = `https://www.google.com/search?q=site:linkedin.com/in+OR+site:linkedin.com/company+"${encodeURIComponent(query)}"`;

        let html = "";
        try {
            const browser = await puppeteer.connect({
                browserWSEndpoint: `wss://uswest.cloud.lightpanda.io/ws?token=${env.lightpandaApiKey}`,
            });
            const page = await browser.newPage();
            await page.setExtraHTTPHeaders({ "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" });
            await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
            html = await page.content();
            await browser.close();
        } catch (crawlErr) {
            console.error("Lightpanda crawl error, falling back to AI:", crawlErr);
            const data = await getAiFallback(query);
            setCache(query, data);
            res.json({
                ...data,
                note: `Lightpanda unavailable. AI-generated profile loaded.`,
            });
            return;
        }

        // Parse DOM for LinkedIn profiles
        const employees: Array<{ name: string; title: string; url: string | null }> = [];
        const companyInfo = {
            name: query,
            linkedinUrl: `https://www.linkedin.com/company/${query.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            snippet: `Active enterprise profile for ${query}.`,
        };

        const companyMatch = html.match(/<a href="([^"]*linkedin\.com\/company\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
        if (companyMatch) {
            companyInfo.linkedinUrl = companyMatch[1];
            companyInfo.name = companyMatch[2].replace(/<[^>]*>/g, "").trim().split(" - ")[0];
        }

        const profileMatches = html.matchAll(/<a href="([^"]*linkedin\.com\/in\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi);
        for (const match of profileMatches) {
            const url = match[1];
            const rawTitle = match[2].replace(/<[^>]*>/g, "").trim();
            const parts = rawTitle.split(" - ");
            const name = parts[0] || "LinkedIn Member";
            const title = parts[1] || `Employee at ${query}`;
            if (employees.length < 5 && !url.includes("dir/")) {
                employees.push({ name, title, url });
            }
        }

        if (employees.length === 0) {
            const data = await getAiFallback(query);
            setCache(query, data);
            res.json({ ...data, note: "Live scrape returned no profiles. AI-generated profile loaded." });
        } else {
            const result: ScraperResult = { company: companyInfo, employees, note: "Scraped via Lightpanda." };
            setCache(query, result);
            res.json(result);
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Scraping failed";
        res.status(500).json({ error: message });
    }
});

const MISTRAL_PROMPT = `You are a business intelligence agent. Given a company name, return a JSON object with real executive/founder profiles.
Use only real, publicly known people. If a LinkedIn URL is unknown, set url to null.
Return ONLY valid JSON with this exact shape:
{
  "company": { "name": string, "linkedinUrl": string|null, "snippet": string },
  "employees": [{ "name": string, "title": string, "url": string|null }]
}`;

async function getAiFallback(query: string): Promise<ScraperResult> {
    if (!env.mistralApiKey) {
        throw new Error("No AI key configured for scraper fallback.");
    }

    const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.mistralApiKey}`,
        },
        body: JSON.stringify({
            model: "mistral-small-latest",
            messages: [{ role: "user", content: `${MISTRAL_PROMPT}\n\nCompany: "${query}"` }],
            response_format: { type: "json_object" },
            temperature: 0.2,
        }),
    });

    if (!resp.ok) {
        throw new Error(`Mistral returned ${resp.status}`);
    }

    const result = await resp.json() as { choices: Array<{ message: { content: string } }> };
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    const parsed = JSON.parse(content) as {
        company: { name: string; linkedinUrl: string | null; snippet: string };
        employees: Array<{ name: string; title: string; url: string | null }>;
    };

    return {
        company: {
            name: parsed.company.name || query,
            linkedinUrl: parsed.company.linkedinUrl || `https://www.linkedin.com/company/${query.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            snippet: parsed.company.snippet || "",
        },
        employees: (parsed.employees || []).slice(0, 5).map((emp) => ({
            name: emp.name,
            title: emp.title,
            url: emp.url || null,
        })),
        note: "AI-generated company intelligence.",
    };
}
