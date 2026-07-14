"use server";

import {
  CollectionJobStatus,
  DirectoryResultStatus,
  DirectoryProviderStatus,
  LeadActivityType,
  Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { findBlocklistMatch } from "@/lib/blocklist";
import {
  cleanOptional,
  companyNameLooksSimilar,
  getDuplicateReason,
  normalizeDomain,
  normalizeEmail,
  normalizePhone
} from "@/lib/lead-utils";
import { prisma } from "@/lib/prisma";
import { getDirectoryProviderDefinition, searchDirectory } from "@/lib/directory-provider";
import { requireUser } from "@/lib/session";

const collectionSchema = z.object({
  provider: z.string().trim().min(2).max(80),
  industry: z.string().trim().min(2).max(120),
  country: z.string().trim().max(120).default("Deutschland"),
  state: z.string().trim().max(120).nullable(),
  city: z.string().trim().max(120).nullable(),
  postalCode: z.string().trim().max(20).nullable(),
  limit: z.coerce.number().int().min(1).max(50)
});

const providerConfigSchema = z.object({
  key: z.string().trim().min(2).max(80),
  status: z.nativeEnum(DirectoryProviderStatus),
  crawlDelaySeconds: z.coerce.number().int().min(0).max(3600),
  maxResultsPerJob: z.coerce.number().int().min(1).max(500),
  requiresManualApproval: z.boolean(),
  notes: z.string().trim().max(2000).nullable()
});

function collectionDataFromForm(formData: FormData) {
  return collectionSchema.parse({
    provider: formData.get("provider") || "mock-directory",
    industry: formData.get("industry"),
    country: cleanOptional(formData.get("country")) ?? "Deutschland",
    state: cleanOptional(formData.get("state")),
    city: cleanOptional(formData.get("city")),
    postalCode: cleanOptional(formData.get("postalCode")),
    limit: formData.get("limit") || "10"
  });
}

export async function updateDirectoryProviderConfig(formData: FormData) {
  await requireUser();
  const data = providerConfigSchema.parse({
    key: formData.get("key"),
    status: formData.get("status"),
    crawlDelaySeconds: formData.get("crawlDelaySeconds") || "10",
    maxResultsPerJob: formData.get("maxResultsPerJob") || "25",
    requiresManualApproval: formData.get("requiresManualApproval") === "on",
    notes: cleanOptional(formData.get("notes"))
  });

  await prisma.directoryProviderConfig.update({
    where: { key: data.key },
    data: {
      status: data.status,
      crawlDelaySeconds: data.crawlDelaySeconds,
      maxResultsPerJob: data.maxResultsPerJob,
      requiresManualApproval: data.requiresManualApproval,
      notes: data.notes
    }
  });

  revalidatePath("/datensammlung");
}

async function findDuplicate(input: {
  companyName: string;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}) {
  const domain = normalizeDomain(input.website);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  const candidates = await prisma.lead.findMany({
    where: {
      OR: [
        email ? { email } : undefined,
        phone ? { phone: { contains: phone } } : undefined,
        domain ? { website: { contains: domain, mode: "insensitive" } } : undefined,
        input.city ? { city: { equals: input.city, mode: "insensitive" } } : undefined
      ].filter(Boolean) as Prisma.LeadWhereInput[]
    },
    select: {
      id: true,
      companyName: true,
      city: true,
      email: true,
      phone: true,
      website: true
    },
    take: 25
  });

  for (const candidate of candidates) {
    const candidateDomain = normalizeDomain(candidate.website);
    if (domain && candidateDomain === domain) return getDuplicateReason({ domain });
    if (email && normalizeEmail(candidate.email) === email) return getDuplicateReason({ email });
    if (phone && normalizePhone(candidate.phone) === phone) return getDuplicateReason({ phone });
    if (
      input.city &&
      candidate.city?.toLowerCase() === input.city.toLowerCase() &&
      companyNameLooksSimilar(input.companyName, candidate.companyName)
    ) {
      return getDuplicateReason({ similarName: candidate.companyName });
    }
  }

  const blocklistMatch = await findBlocklistMatch(input);
  if (blocklistMatch)
    return `Ausschlussliste: ${blocklistMatch.type.toLowerCase()} ${blocklistMatch.value}`;

  return null;
}

export async function startCollectionJob(formData: FormData) {
  const user = await requireUser();
  const input = collectionDataFromForm(formData);
  const providerDefinition = getDirectoryProviderDefinition(input.provider);
  const providerConfig = await prisma.directoryProviderConfig.findUnique({
    where: { key: input.provider }
  });

  if (!providerDefinition || !providerConfig) {
    throw new Error("Unbekannte Datenquelle.");
  }

  if (
    providerConfig.status !== DirectoryProviderStatus.APPROVED ||
    providerConfig.requiresManualApproval ||
    !providerDefinition.implemented
  ) {
    throw new Error("Diese Datenquelle ist vorbereitet, aber noch nicht fuer Abrufe freigegeben.");
  }

  const safeInput = {
    ...input,
    limit: Math.min(input.limit, providerConfig.maxResultsPerJob)
  };

  const job = await prisma.collectionJob.create({
    data: {
      ...safeInput,
      status: CollectionJobStatus.RUNNING,
      createdById: user.id,
      startedAt: new Date()
    }
  });

  try {
    const companies = await searchDirectory(safeInput.provider, safeInput);
    const rows = await Promise.all(
      companies.map(async (company) => {
        const duplicateReason = await findDuplicate(company);

        return {
          jobId: job.id,
          externalId: company.externalId,
          source: company.source,
          sourceUrl: company.sourceUrl,
          companyName: company.companyName,
          industry: company.industry,
          street: company.street,
          postalCode: company.postalCode,
          city: company.city,
          state: company.state,
          country: company.country,
          phone: company.phone,
          email: company.email,
          website: company.website,
          status: duplicateReason ? DirectoryResultStatus.DUPLICATE : DirectoryResultStatus.NEW,
          duplicateReason
        };
      })
    );

    await prisma.$transaction([
      prisma.directoryResult.createMany({ data: rows }),
      prisma.collectionJob.update({
        where: { id: job.id },
        data: {
          status: CollectionJobStatus.COMPLETED,
          finishedAt: new Date()
        }
      })
    ]);
  } catch (error) {
    await prisma.collectionJob.update({
      where: { id: job.id },
      data: {
        status: CollectionJobStatus.FAILED,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
        finishedAt: new Date()
      }
    });
  }

  revalidatePath("/datensammlung");
  redirect(`/datensammlung?job=${job.id}`);
}

export async function convertDirectoryResult(resultId: string) {
  const user = await requireUser();
  const result = await prisma.directoryResult.findUniqueOrThrow({ where: { id: resultId } });

  if (result.status === DirectoryResultStatus.CONVERTED && result.leadId) {
    redirect(`/leads/${result.leadId}`);
  }

  const duplicateReason = await findDuplicate(result);
  if (duplicateReason) {
    await prisma.directoryResult.update({
      where: { id: result.id },
      data: {
        status: DirectoryResultStatus.DUPLICATE,
        duplicateReason
      }
    });
    revalidatePath("/datensammlung");
    redirect(`/datensammlung?job=${result.jobId}`);
  }

  const lead = await prisma.lead.create({
    data: {
      companyName: result.companyName,
      industry: result.industry,
      street: result.street,
      postalCode: result.postalCode,
      city: result.city,
      state: result.state,
      country: result.country,
      phone: result.phone,
      email: result.email,
      website: result.website,
      source: result.source,
      sourceUrl: result.sourceUrl,
      activities: {
        create: {
          type: LeadActivityType.CREATED,
          userId: user.id,
          note: `Aus Datensammlung uebernommen: ${result.source}.`
        }
      }
    }
  });

  await prisma.directoryResult.update({
    where: { id: result.id },
    data: {
      status: DirectoryResultStatus.CONVERTED,
      leadId: lead.id
    }
  });

  revalidatePath("/datensammlung");
  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function ignoreDirectoryResult(resultId: string) {
  await requireUser();
  const result = await prisma.directoryResult.update({
    where: { id: resultId },
    data: { status: DirectoryResultStatus.IGNORED }
  });

  revalidatePath("/datensammlung");
  redirect(`/datensammlung?job=${result.jobId}`);
}
