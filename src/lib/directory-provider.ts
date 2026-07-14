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
  supportsSearch: boolean;
};

export const directoryProviderDefinitions: DirectoryProviderDefinition[] = [
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
    implemented: false,
    supportsSearch: false
  },
  {
    key: "manual-import",
    name: "Manueller CSV-Import",
    status: DirectoryProviderStatus.APPROVED,
    crawlDelaySeconds: 0,
    maxResultsPerJob: 500,
    requiresManualApproval: false,
    notes: "Import fuer erlaubte, lizenzierte oder selbst gepflegte Unternehmensdaten.",
    implemented: true,
    supportsSearch: false
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

export async function searchDirectory(
  provider: string,
  input: DirectorySearchInput
): Promise<DirectoryCompany[]> {
  void provider;
  void input;
  throw new Error("Dieser Provider ist vorbereitet, aber noch nicht fuer Abrufe implementiert.");
}
