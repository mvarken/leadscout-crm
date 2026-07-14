import { LeadStatus } from "@prisma/client";

export const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: "Neu",
  TO_REVIEW: "Zu pruefen",
  CONTACT_MISSING: "Kontaktinformationen fehlen",
  READY_TO_CONTACT: "Kontaktbereit",
  CONTACTED: "Angeschrieben",
  REPLIED: "Rueckmeldung erhalten",
  INTERESTED: "Interessiert",
  OFFER_SENT: "Angebot gesendet",
  FOLLOW_UP: "Nachfassen",
  CUSTOMER: "Kunde",
  NOT_INTERESTED: "Kein Interesse",
  DO_NOT_CONTACT: "Nicht kontaktieren",
  INVALID: "Ungueltig"
};

export const leadStatusOptions = Object.entries(leadStatusLabels).map(([value, label]) => ({
  value: value as LeadStatus,
  label
}));

export function cleanOptional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export function normalizeDomain(value: string | null | undefined) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!text) return null;

  try {
    const url = new URL(
      text.startsWith("http://") || text.startsWith("https://") ? text : `https://${text}`
    );
    return url.hostname.replace(/^www\./, "");
  } catch {
    return text
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .trim();
  }
}

export function normalizePhone(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const normalized = text.replace(/[^\d+]/g, "");
  return normalized || null;
}

export function normalizeEmail(value: string | null | undefined) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  return text || null;
}

export function normalizeWebsite(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text.replace(/^\/+/, "")}`;
}

export function websiteFromEmail(value: string | null | undefined) {
  const email = normalizeEmail(value);
  const domain = email?.split("@")[1]?.trim();
  if (!domain || !domain.includes(".")) return null;
  return normalizeWebsite(domain);
}

export function getDuplicateReason(input: {
  domain?: string | null;
  email?: string | null;
  phone?: string | null;
  similarName?: string | null;
}) {
  if (input.domain) return `Domain bereits vorhanden: ${input.domain}`;
  if (input.email) return `E-Mail bereits vorhanden: ${input.email}`;
  if (input.phone) return `Telefonnummer bereits vorhanden: ${input.phone}`;
  if (input.similarName) return `Aehnlicher Firmenname am selben Ort: ${input.similarName}`;
  return null;
}

export function companyNameLooksSimilar(left: string, right: string) {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/\b(gmbh|ug|ag|kg|ohg|e\.k\.|mbh)\b/g, "")
      .replace(/[^a-z0-9äöüß]+/gi, "")
      .trim();

  const a = normalize(left);
  const b = normalize(right);

  if (a.length < 4 || b.length < 4) return false;
  return a.includes(b) || b.includes(a);
}
