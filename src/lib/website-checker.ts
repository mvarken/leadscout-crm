import { WordpressStatus } from "@prisma/client";

const REQUEST_TIMEOUT_MS = 7000;
const USER_AGENT = "LeadScoutCRM/0.1 WebsiteCheck";

export type WebsiteCheckResult = {
  normalizedUrl: string;
  finalUrl?: string;
  websiteReachable: boolean;
  httpsEnabled: boolean;
  httpRedirectsToHttps: boolean;
  wordpressStatus: WordpressStatus;
  hasImpressum: boolean;
  hasPrivacyPolicy: boolean;
  hasContactPage: boolean;
  websiteEmail?: string | null;
  websitePhone?: string | null;
  notes: string[];
};

type FetchResult = {
  ok: boolean;
  url: string;
  status: number;
  html: string;
};

export function normalizeWebsiteUrl(value: string) {
  const text = value.trim();
  if (!text) throw new Error("Keine Website hinterlegt.");
  return text.startsWith("http://") || text.startsWith("https://") ? text : `https://${text}`;
}

export function buildHttpUrl(value: string) {
  const normalized = normalizeWebsiteUrl(value);
  const url = new URL(normalized);
  url.protocol = "http:";
  return url.toString();
}

export function buildHttpsUrl(value: string) {
  const normalized = normalizeWebsiteUrl(value);
  const url = new URL(normalized);
  url.protocol = "https:";
  return url.toString();
}

function timeoutSignal() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function fetchHtml(url: string): Promise<FetchResult> {
  const timeout = timeoutSignal();

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: timeout.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml"
      }
    });
    const contentType = response.headers.get("content-type") ?? "";
    const html = contentType.includes("text/html") ? await response.text() : "";

    return {
      ok: response.ok,
      url: response.url,
      status: response.status,
      html
    };
  } finally {
    timeout.clear();
  }
}

export function detectWordpress(html: string) {
  const lower = html.toLowerCase();
  const signals = [
    lower.includes("/wp-content/"),
    lower.includes("/wp-includes/"),
    lower.includes('name="generator"') && lower.includes("wordpress"),
    lower.includes("wp-json"),
    lower.includes("wp-emoji-release"),
    lower.includes("/wp-admin/")
  ].filter(Boolean).length;

  if (signals >= 2) return WordpressStatus.DETECTED;
  if (signals === 1) return WordpressStatus.LIKELY;
  return WordpressStatus.NOT_DETECTED;
}

export function findEmail(html: string) {
  const mailto = html.match(/mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i)?.[1];
  if (mailto) return mailto.toLowerCase();
  return html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]?.toLowerCase() ?? null;
}

export function findPhone(html: string) {
  const phone = html.match(/(?:\+49|0049|0)[\d\s()./-]{7,}/)?.[0];
  const normalized = phone?.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, "");
  if (normalized.startsWith("00") && !normalized.startsWith("0049")) return null;
  return digits.length >= 8 ? normalized : null;
}

function getLinkTargets(html: string) {
  const targets = new Set<string>();
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1].trim().toLowerCase();
    const text = match[2].replace(/<[^>]*>/g, " ").toLowerCase();
    targets.add(`${href} ${text}`);
  }

  return Array.from(targets);
}

export function detectLegalPages(html: string) {
  const haystack = [html.toLowerCase(), ...getLinkTargets(html)].join(" ");

  return {
    hasImpressum:
      /\bimpressum\b/.test(haystack) ||
      haystack.includes("imprint") ||
      haystack.includes("anbieterkennzeichnung") ||
      haystack.includes("rechtliches"),
    hasPrivacyPolicy:
      haystack.includes("datenschutz") ||
      haystack.includes("datenschutzerklaerung") ||
      haystack.includes("datenschutzerklärung") ||
      haystack.includes("privacy") ||
      haystack.includes("privacy-policy"),
    hasContactPage:
      haystack.includes("kontakt") ||
      haystack.includes("contact") ||
      haystack.includes("/kontakt") ||
      haystack.includes("/contact")
  };
}

export async function checkWebsite(website: string): Promise<WebsiteCheckResult> {
  const normalizedUrl = normalizeWebsiteUrl(website);
  const httpsUrl = buildHttpsUrl(website);
  const httpUrl = buildHttpUrl(website);
  const notes: string[] = [];

  let main: FetchResult | null = null;
  let http: FetchResult | null = null;
  const failedAttempts: string[] = [];

  try {
    main = await fetchHtml(httpsUrl);
  } catch (error) {
    failedAttempts.push(
      `HTTPS fehlgeschlagen: ${error instanceof Error ? error.message : "unbekannter Fehler"}`
    );
  }

  if (!main?.ok) {
    try {
      main = await fetchHtml(normalizedUrl);
    } catch (error) {
      failedAttempts.push(
        `Website nicht erreichbar: ${error instanceof Error ? error.message : "unbekannter Fehler"}`
      );
    }
  }

  try {
    http = await fetchHtml(httpUrl);
  } catch {
    http = null;
  }

  if (!main?.ok && http?.ok) {
    main = http;
    notes.push(`Erfolgreich ueber HTTP/Weiterleitung: ${http.url}`);
  }

  const html = main?.html ?? "";
  const legalPages = html
    ? detectLegalPages(html)
    : { hasImpressum: false, hasPrivacyPolicy: false, hasContactPage: false };
  const finalUrl = main?.url;
  const httpsEnabled = Boolean(main?.ok && finalUrl?.startsWith("https://"));
  const httpRedirectsToHttps = Boolean(http?.url.startsWith("https://"));
  if (finalUrl && finalUrl !== normalizedUrl) {
    notes.push(`Weitergeleitet zu: ${finalUrl}`);
  }
  if (!main?.ok) {
    notes.push(...failedAttempts);
  }

  return {
    normalizedUrl,
    finalUrl,
    websiteReachable: Boolean(main?.ok),
    httpsEnabled,
    httpRedirectsToHttps,
    wordpressStatus: html ? detectWordpress(html) : WordpressStatus.FAILED,
    ...legalPages,
    websiteEmail: html ? findEmail(html) : null,
    websitePhone: html ? findPhone(html) : null,
    notes
  };
}
