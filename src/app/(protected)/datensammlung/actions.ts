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
import { fetch11880DetailWebsite } from "@/lib/11880-search";
import {
  cleanOptional,
  companyNameLooksSimilar,
  getDuplicateReason,
  normalizeDomain,
  normalizeEmail,
  normalizeWebsite,
  normalizePhone
} from "@/lib/lead-utils";
import { prisma } from "@/lib/prisma";
import { getDirectoryProviderDefinition, searchDirectory } from "@/lib/directory-provider";
import { parseDirectoryCsv } from "@/lib/manual-import";
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
  robotsTxtReviewed: z.boolean(),
  termsReviewed: z.boolean(),
  licensedAccessReviewed: z.boolean(),
  privacyReviewed: z.boolean(),
  reviewCompleted: z.boolean(),
  notes: z.string().trim().max(2000).nullable()
});

const manualImportSchema = z.object({
  sourceName: z.string().trim().min(2).max(120),
  industry: z.string().trim().max(120).nullable(),
  country: z.string().trim().max(120).default("Deutschland"),
  limit: z.coerce.number().int().min(1).max(500)
});

const previewLeadSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  industry: z.string().trim().max(120).nullable(),
  street: z.string().trim().max(160).nullable(),
  postalCode: z.string().trim().max(20).nullable(),
  city: z.string().trim().max(120).nullable(),
  state: z.string().trim().max(120).nullable(),
  country: z.string().trim().max(120).default("Deutschland"),
  phone: z.string().trim().max(80).nullable(),
  email: z.string().trim().email().max(254).nullable().or(z.literal(null)),
  website: z.string().trim().max(240).nullable(),
  source: z.string().trim().max(120).nullable(),
  sourceUrl: z.string().trim().max(300).nullable()
});

function reviewedAt(checked: boolean, currentValue?: Date | null) {
  if (!checked) return null;
  return currentValue ?? new Date();
}

function collectionDataFromForm(formData: FormData) {
  return collectionSchema.parse({
    provider: formData.get("provider") || "11880-com",
    industry: formData.get("industry"),
    country: cleanOptional(formData.get("country")) ?? "Deutschland",
    state: cleanOptional(formData.get("state")),
    city: cleanOptional(formData.get("city")),
    postalCode: cleanOptional(formData.get("postalCode")),
    limit: formData.get("limit") || "10"
  });
}

function previewLeadDataFromForm(formData: FormData) {
  return previewLeadSchema.parse({
    companyName: String(formData.get("companyName") ?? ""),
    industry: cleanOptional(formData.get("industry")),
    street: cleanOptional(formData.get("street")),
    postalCode: cleanOptional(formData.get("postalCode")),
    city: cleanOptional(formData.get("city")),
    state: cleanOptional(formData.get("state")),
    country: cleanOptional(formData.get("country")) ?? "Deutschland",
    phone: cleanOptional(formData.get("phone")),
    email: normalizeEmail(cleanOptional(formData.get("email"))),
    website: normalizeWebsite(cleanOptional(formData.get("website"))),
    source: cleanOptional(formData.get("source")),
    sourceUrl: cleanOptional(formData.get("sourceUrl"))
  });
}

async function createDirectoryResults(
  jobId: string,
  companies: Awaited<ReturnType<typeof searchDirectory>>
) {
  return Promise.all(
    companies.map(async (company) => {
      const duplicateReason = await findDuplicate(company);

      return {
        jobId,
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
        website: normalizeWebsite(company.website),
        status: duplicateReason ? DirectoryResultStatus.DUPLICATE : DirectoryResultStatus.NEW,
        duplicateReason
      };
    })
  );
}

export async function updateDirectoryProviderConfig(formData: FormData) {
  await requireUser();
  const existingProvider = await prisma.directoryProviderConfig.findUniqueOrThrow({
    where: { key: String(formData.get("key") ?? "") }
  });
  const data = providerConfigSchema.parse({
    key: formData.get("key"),
    status: formData.get("status"),
    crawlDelaySeconds: formData.get("crawlDelaySeconds") || "10",
    maxResultsPerJob: formData.get("maxResultsPerJob") || "25",
    requiresManualApproval: formData.get("requiresManualApproval") === "on",
    robotsTxtReviewed: formData.get("robotsTxtReviewed") === "on",
    termsReviewed: formData.get("termsReviewed") === "on",
    licensedAccessReviewed: formData.get("licensedAccessReviewed") === "on",
    privacyReviewed: formData.get("privacyReviewed") === "on",
    reviewCompleted: formData.get("reviewCompleted") === "on",
    notes: cleanOptional(formData.get("notes"))
  });

  await prisma.directoryProviderConfig.update({
    where: { key: data.key },
    data: {
      status: data.status,
      crawlDelaySeconds: data.crawlDelaySeconds,
      maxResultsPerJob: data.maxResultsPerJob,
      requiresManualApproval: data.requiresManualApproval,
      robotsTxtReviewedAt: reviewedAt(data.robotsTxtReviewed, existingProvider.robotsTxtReviewedAt),
      termsReviewedAt: reviewedAt(data.termsReviewed, existingProvider.termsReviewedAt),
      licensedAccessReviewedAt: reviewedAt(
        data.licensedAccessReviewed,
        existingProvider.licensedAccessReviewedAt
      ),
      privacyReviewedAt: reviewedAt(data.privacyReviewed, existingProvider.privacyReviewedAt),
      reviewCompletedAt: reviewedAt(data.reviewCompleted, existingProvider.reviewCompletedAt),
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
    !providerDefinition.implemented ||
    !providerDefinition.supportsSearch
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
    const rows = await createDirectoryResults(job.id, companies);

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

export async function importDirectoryCsv(formData: FormData) {
  const user = await requireUser();
  const data = manualImportSchema.parse({
    sourceName: formData.get("sourceName") || "Manueller CSV-Import",
    industry: cleanOptional(formData.get("industry")),
    country: cleanOptional(formData.get("country")) ?? "Deutschland",
    limit: formData.get("limit") || "100"
  });
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Bitte eine CSV-Datei auswaehlen.");
  }

  const providerDefinition = getDirectoryProviderDefinition("manual-import");
  const providerConfig = await prisma.directoryProviderConfig.findUnique({
    where: { key: "manual-import" }
  });

  if (
    !providerDefinition?.implemented ||
    !providerConfig ||
    providerConfig.status !== DirectoryProviderStatus.APPROVED ||
    providerConfig.requiresManualApproval
  ) {
    throw new Error("Manueller Import ist nicht freigegeben.");
  }

  const csv = await file.text();
  const companies = parseDirectoryCsv({
    csv,
    source: data.sourceName,
    fallbackIndustry: data.industry,
    fallbackCountry: data.country,
    limit: Math.min(data.limit, providerConfig.maxResultsPerJob)
  });

  const job = await prisma.collectionJob.create({
    data: {
      provider: "manual-import",
      industry: data.industry || data.sourceName,
      country: data.country,
      limit: companies.length,
      status: CollectionJobStatus.RUNNING,
      createdById: user.id,
      startedAt: new Date()
    }
  });

  try {
    const rows = await createDirectoryResults(job.id, companies);

    if (rows.length > 0) {
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
    } else {
      await prisma.collectionJob.update({
        where: { id: job.id },
        data: {
          status: CollectionJobStatus.COMPLETED,
          finishedAt: new Date()
        }
      });
    }
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

export async function convertPreviewResult(formData: FormData) {
  const user = await requireUser();
  const data = previewLeadDataFromForm(formData);
  const detailWebsite = await fetch11880DetailWebsite(data.sourceUrl);
  const enrichedData = {
    ...data,
    website: detailWebsite ?? data.website
  };
  const duplicateReason = await findDuplicate(enrichedData);

  if (duplicateReason) {
    redirect("/datensammlung?previewDuplicate=1");
  }

  const lead = await prisma.lead.create({
    data: {
      ...enrichedData,
      activities: {
        create: {
          type: LeadActivityType.CREATED,
          userId: user.id,
          note: `Aus Vorschau uebernommen: ${enrichedData.source ?? "Datensammlung"}.`
        }
      }
    }
  });

  revalidatePath("/datensammlung");
  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
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
      website: normalizeWebsite(result.website),
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
