import { DirectoryProviderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type DirectorySearchInput = {
  industry: string;
  country: string;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
  limit: number;
};

export type DirectoryProviderDefinition = {
  key: string;
  name: string;
  websiteUrl?: string;
  robotsTxtUrl?: string;
  termsUrl?: string;
  status: DirectoryProviderStatus;
  crawlDelaySeconds: number;
  maxResultsPerJob: number;
  requiresManualApproval: boolean;
  notes: string;
  implemented: boolean;
};

export const directoryProviderDefinitions: DirectoryProviderDefinition[] = [
  {
    key: "mock-directory",
    name: "Mock-Verzeichnis",
    websiteUrl: "https://example.local",
    status: DirectoryProviderStatus.APPROVED,
    crawlDelaySeconds: 0,
    maxResultsPerJob: 50,
    requiresManualApproval: false,
    notes: "Interne Testquelle ohne externe Abrufe.",
    implemented: true
  },
  {
    key: "11880-com",
    name: "11880 Vorbereitung",
    websiteUrl: "https://www.11880.com",
    robotsTxtUrl: "https://www.11880.com/robots.txt",
    termsUrl: "https://www.11880.com",
    status: DirectoryProviderStatus.NEEDS_REVIEW,
    crawlDelaySeconds: 30,
    maxResultsPerJob: 10,
    requiresManualApproval: true,
    notes:
      "Vor einem echten Abruf muessen Nutzungsbedingungen, robots.txt, Zugriffsgeschwindigkeit und moegliche lizenzierte Daten-/API-Loesungen geprueft werden.",
    implemented: false
  },
  {
    key: "manual-import",
    name: "Manueller CSV-Import",
    status: DirectoryProviderStatus.APPROVED,
    crawlDelaySeconds: 0,
    maxResultsPerJob: 500,
    requiresManualApproval: false,
    notes: "Import fuer erlaubte, lizenzierte oder selbst gepflegte Unternehmensdaten.",
    implemented: true
  }
];

export function getDirectoryProviderDefinition(providerKey: string) {
  return directoryProviderDefinitions.find((provider) => provider.key === providerKey) ?? null;
}

export async function ensureDefaultDirectoryProviders() {
  await prisma.directoryProviderConfig.createMany({
    data: directoryProviderDefinitions.map((provider) => ({
      key: provider.key,
      name: provider.name,
      websiteUrl: provider.websiteUrl,
      robotsTxtUrl: provider.robotsTxtUrl,
      termsUrl: provider.termsUrl,
      status: provider.status,
      crawlDelaySeconds: provider.crawlDelaySeconds,
      maxResultsPerJob: provider.maxResultsPerJob,
      requiresManualApproval: provider.requiresManualApproval,
      notes: provider.notes
    })),
    skipDuplicates: true
  });
}

export type DirectoryCompany = {
  externalId?: string;
  source: string;
  sourceUrl?: string;
  companyName: string;
  industry?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
};

const companyWords = ["Meister", "Nord", "Altstadt", "Hansa", "Rhein", "City", "Profi", "Muster"];
const streets = ["Hauptstrasse", "Industrieweg", "Marktstrasse", "Bahnhofstrasse", "Ring"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function searchMockDirectory(
  input: DirectorySearchInput
): Promise<DirectoryCompany[]> {
  const limit = Math.min(Math.max(input.limit, 1), 50);
  const city = input.city?.trim() || "Koeln";
  const state = input.state?.trim() || "NRW";
  const postalCode = input.postalCode?.trim() || "50667";
  const industry = input.industry.trim();

  return Array.from({ length: limit }, (_, index) => {
    const word = companyWords[index % companyWords.length];
    const street = streets[index % streets.length];
    const companyName = `${word} ${industry} ${city} ${index + 1} GmbH`;
    const domain = `${slugify(word)}-${slugify(industry)}-${slugify(city)}-${index + 1}.de`;

    return {
      externalId: `mock-${slugify(industry)}-${slugify(city)}-${index + 1}`,
      source: "mock-directory",
      sourceUrl: `https://example.local/mock/${slugify(industry)}/${slugify(city)}/${index + 1}`,
      companyName,
      industry,
      street: `${street} ${index + 3}`,
      postalCode,
      city,
      state,
      country: input.country || "Deutschland",
      phone: `+49 221 100${String(index + 1).padStart(3, "0")}`,
      email: `info@${domain}`,
      website: `https://www.${domain}`
    };
  });
}

export async function searchDirectory(provider: string, input: DirectorySearchInput) {
  if (provider !== "mock-directory") {
    throw new Error("Dieser Provider ist vorbereitet, aber noch nicht fuer Abrufe implementiert.");
  }

  return searchMockDirectory(input);
}
