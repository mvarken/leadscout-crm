"use server";

import { LeadActivityType, LeadStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cleanOptional,
  companyNameLooksSimilar,
  getDuplicateReason,
  normalizeDomain,
  normalizeEmail,
  normalizePhone
} from "@/lib/lead-utils";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const leadSchema = z.object({
  companyName: z.string().trim().min(2, "Firmenname ist erforderlich.").max(160),
  contactName: z.string().trim().max(120).nullable(),
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
  sourceUrl: z.string().trim().max(300).nullable(),
  notes: z.string().trim().max(3000).nullable()
});

function leadDataFromForm(formData: FormData) {
  return leadSchema.parse({
    companyName: String(formData.get("companyName") ?? ""),
    contactName: cleanOptional(formData.get("contactName")),
    industry: cleanOptional(formData.get("industry")),
    street: cleanOptional(formData.get("street")),
    postalCode: cleanOptional(formData.get("postalCode")),
    city: cleanOptional(formData.get("city")),
    state: cleanOptional(formData.get("state")),
    country: cleanOptional(formData.get("country")) ?? "Deutschland",
    phone: cleanOptional(formData.get("phone")),
    email: normalizeEmail(cleanOptional(formData.get("email"))),
    website: cleanOptional(formData.get("website")),
    source: cleanOptional(formData.get("source")),
    sourceUrl: cleanOptional(formData.get("sourceUrl")),
    notes: cleanOptional(formData.get("notes"))
  });
}

async function findDuplicateLead(input: {
  companyName: string;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  excludeId?: string;
}) {
  const domain = normalizeDomain(input.website);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  const candidates = await prisma.lead.findMany({
    where: {
      id: input.excludeId ? { not: input.excludeId } : undefined,
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
    if (domain && candidateDomain === domain)
      return { lead: candidate, reason: getDuplicateReason({ domain }) };
    if (email && normalizeEmail(candidate.email) === email)
      return { lead: candidate, reason: getDuplicateReason({ email }) };
    if (phone && normalizePhone(candidate.phone) === phone)
      return { lead: candidate, reason: getDuplicateReason({ phone }) };
    if (
      input.city &&
      candidate.city?.toLowerCase() === input.city.toLowerCase() &&
      companyNameLooksSimilar(input.companyName, candidate.companyName)
    ) {
      return {
        lead: candidate,
        reason: getDuplicateReason({ similarName: candidate.companyName })
      };
    }
  }

  return null;
}

export async function createLead(formData: FormData) {
  const user = await requireUser();
  const data = leadDataFromForm(formData);
  const duplicate = await findDuplicateLead(data);

  if (duplicate) {
    redirect(`/leads?duplicate=${duplicate.lead.id}`);
  }

  const lead = await prisma.lead.create({
    data: {
      ...data,
      activities: {
        create: {
          type: LeadActivityType.CREATED,
          userId: user.id,
          note: "Lead manuell angelegt."
        }
      }
    }
  });

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(leadId: string, formData: FormData) {
  const user = await requireUser();
  const data = leadDataFromForm(formData);
  const duplicate = await findDuplicateLead({ ...data, excludeId: leadId });

  if (duplicate) {
    redirect(`/leads/${leadId}?duplicate=${duplicate.lead.id}`);
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      ...data,
      activities: {
        create: {
          type: LeadActivityType.UPDATED,
          userId: user.id,
          note: "Stammdaten aktualisiert."
        }
      }
    }
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}`);
}

export async function updateLeadStatus(leadId: string, formData: FormData) {
  const user = await requireUser();
  const status = z.nativeEnum(LeadStatus).parse(formData.get("status"));
  const note = cleanOptional(formData.get("note"));
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status,
      activities: {
        create: {
          type: LeadActivityType.STATUS_CHANGED,
          userId: user.id,
          oldValue: lead.status,
          newValue: status,
          note
        }
      }
    }
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function addLeadNote(leadId: string, formData: FormData) {
  const user = await requireUser();
  const note = z.string().trim().min(1).max(3000).parse(formData.get("note"));

  await prisma.leadActivity.create({
    data: {
      leadId,
      userId: user.id,
      type: LeadActivityType.NOTE_ADDED,
      note
    }
  });

  revalidatePath(`/leads/${leadId}`);
}
