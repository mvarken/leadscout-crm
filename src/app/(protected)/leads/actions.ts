"use server";

import {
  ContactChannel,
  ContactDirection,
  LeadActivityType,
  LeadStatus,
  Prisma,
  ReminderStatus,
  ReminderType
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { findBlocklistMatch } from "@/lib/blocklist";
import { renderCommunicationTemplate } from "@/lib/communication";
import { setFlash } from "@/lib/flash";
import {
  cleanOptional,
  companyNameLooksSimilar,
  getDuplicateReason,
  normalizeDomain,
  normalizeEmail,
  normalizePhone,
  normalizeWebsite
} from "@/lib/lead-utils";
import { calculateLeadScore } from "@/lib/lead-score";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { checkWebsite } from "@/lib/website-checker";

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
    website: normalizeWebsite(cleanOptional(formData.get("website"))),
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
  const blocklistMatch = await findBlocklistMatch(data);

  if (blocklistMatch) {
    setFlash("error", "Lead ist durch die Ausschlussliste blockiert.");
    redirect(`/leads?blocked=${blocklistMatch.id}`);
  }

  const duplicate = await findDuplicateLead(data);

  if (duplicate) {
    setFlash("warning", duplicate.reason ?? "Moegliches Duplikat gefunden.");
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
  setFlash("success", "Lead angelegt.");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(leadId: string, formData: FormData) {
  const user = await requireUser();
  const data = leadDataFromForm(formData);
  const blocklistMatch = await findBlocklistMatch(data);

  if (blocklistMatch) {
    setFlash("error", "Aenderung durch die Ausschlussliste blockiert.");
    redirect(`/leads/${leadId}?edit=1&blocked=${blocklistMatch.id}`);
  }

  const duplicate = await findDuplicateLead({ ...data, excludeId: leadId });

  if (duplicate) {
    setFlash("warning", duplicate.reason ?? "Moegliches Duplikat gefunden.");
    redirect(`/leads/${leadId}?edit=1&duplicate=${duplicate.lead.id}`);
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
  setFlash("success", "Stammdaten gespeichert.");
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
  setFlash("success", "Status gespeichert.");
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
  setFlash("success", "Notiz gespeichert.");
}

export async function logLeadContact(leadId: string, formData: FormData) {
  const user = await requireUser();
  const channel = z.nativeEnum(ContactChannel).parse(formData.get("channel"));
  const direction = z.nativeEnum(ContactDirection).parse(formData.get("direction"));
  const templateId = cleanOptional(formData.get("templateId"));
  let subject = cleanOptional(formData.get("subject"));
  let message = cleanOptional(formData.get("message"));
  const contactedAtRaw = cleanOptional(formData.get("contactedAt"));
  const contactedAt = contactedAtRaw ? new Date(contactedAtRaw) : new Date();

  if (Number.isNaN(contactedAt.getTime())) {
    setFlash("error", "Ungueltiges Kontaktdatum.");
    redirect(`/leads/${leadId}`);
  }

  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    select: {
      companyName: true,
      contactName: true,
      city: true,
      website: true,
      email: true
    }
  });
  const template = templateId
    ? await prisma.emailTemplate.findUnique({ where: { id: templateId } })
    : null;

  if (template) {
    subject = subject || renderCommunicationTemplate(template.subject, lead);
    message = message || renderCommunicationTemplate(template.body, lead);
  }

  const parsedMessage = z.string().trim().min(1).max(5000).safeParse(message);
  if (!parsedMessage.success) {
    setFlash("error", "Bitte Nachricht oder Vorlage angeben.");
    redirect(`/leads/${leadId}`);
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      lastContactedAt: contactedAt,
      contactCount: { increment: 1 },
      contactLogs: {
        create: {
          userId: user.id,
          templateId,
          channel,
          direction,
          subject,
          message: parsedMessage.data,
          contactedAt
        }
      },
      activities: {
        create: {
          type: LeadActivityType.CONTACT_LOGGED,
          userId: user.id,
          note: `Kontakt protokolliert: ${channel}${subject ? ` - ${subject}` : ""}`
        }
      }
    }
  });

  revalidatePath("/kommunikation");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  setFlash("success", "Kontakt gespeichert.");
}

export async function runWebsiteCheck(leadId: string) {
  const user = await requireUser();
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    select: { website: true }
  });

  if (!lead.website) {
    setFlash("warning", "Keine Website hinterlegt.");
    redirect(`/leads/${leadId}?websiteCheck=missing`);
  }

  const result = await checkWebsite(lead.website);

  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      website: result.finalUrl ?? result.normalizedUrl,
      websiteReachable: result.websiteReachable,
      httpsEnabled: result.httpsEnabled,
      httpRedirectsToHttps: result.httpRedirectsToHttps,
      wordpressStatus: result.wordpressStatus,
      hasImpressum: result.hasImpressum,
      hasPrivacyPolicy: result.hasPrivacyPolicy,
      hasContactPage: result.hasContactPage,
      websiteEmail: result.websiteEmail,
      websitePhone: result.websitePhone,
      websiteCheckNotes: [
        `Gepruefte Website: ${result.normalizedUrl}`,
        result.finalUrl ? `Finale URL: ${result.finalUrl}` : null,
        ...result.notes
      ]
        .filter(Boolean)
        .join("\n"),
      websiteCheckedAt: new Date(),
      activities: {
        create: {
          type: LeadActivityType.WEBSITE_CHECKED,
          userId: user.id,
          note: `Websitepruefung ausgefuehrt: ${result.websiteReachable ? "erreichbar" : "nicht erreichbar"}.`
        }
      }
    }
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      leadScore: calculateLeadScore(updatedLead),
      leadScoreUpdatedAt: new Date()
    }
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  setFlash(
    result.websiteReachable ? "success" : "warning",
    result.websiteReachable ? "Websitepruefung abgeschlossen." : "Website nicht erreichbar."
  );
}

export async function recalculateLeadScore(leadId: string) {
  await requireUser();
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      leadScore: calculateLeadScore(lead),
      leadScoreUpdatedAt: new Date()
    }
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  setFlash("success", "Lead-Score neu berechnet.");
}

export async function createReminder(leadId: string, formData: FormData) {
  const user = await requireUser();
  const dueAtRaw = z.string().min(1).parse(formData.get("dueAt"));
  const title = z.string().trim().min(2).max(160).parse(formData.get("title"));
  const note = cleanOptional(formData.get("note"));
  const type = z.nativeEnum(ReminderType).parse(formData.get("type") || ReminderType.FOLLOW_UP);
  const dueAt = new Date(dueAtRaw);

  if (Number.isNaN(dueAt.getTime())) {
    setFlash("error", "Ungueltiges Wiedervorlagedatum.");
    redirect(`/leads/${leadId}`);
  }

  await prisma.$transaction([
    prisma.reminder.create({
      data: {
        leadId,
        assignedToId: user.id,
        type,
        dueAt,
        title,
        note
      }
    }),
    prisma.leadActivity.create({
      data: {
        leadId,
        userId: user.id,
        type: LeadActivityType.NOTE_ADDED,
        note: `Wiedervorlage erstellt: ${title}`
      }
    })
  ]);

  const nextOpenReminder = await prisma.reminder.findFirst({
    where: {
      leadId,
      status: ReminderStatus.OPEN
    },
    orderBy: { dueAt: "asc" }
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      nextFollowUpAt: nextOpenReminder?.dueAt ?? null
    }
  });

  revalidatePath("/wiedervorlagen");
  revalidatePath(`/leads/${leadId}`);
  setFlash("success", "Wiedervorlage gespeichert.");
}

export async function completeReminder(reminderId: string) {
  await requireUser();
  const reminder = await prisma.reminder.update({
    where: { id: reminderId },
    data: {
      status: ReminderStatus.DONE,
      completedAt: new Date()
    }
  });

  const nextOpenReminder = await prisma.reminder.findFirst({
    where: {
      leadId: reminder.leadId,
      status: ReminderStatus.OPEN
    },
    orderBy: { dueAt: "asc" }
  });

  await prisma.lead.update({
    where: { id: reminder.leadId },
    data: {
      nextFollowUpAt: nextOpenReminder?.dueAt ?? null
    }
  });

  revalidatePath("/wiedervorlagen");
  revalidatePath(`/leads/${reminder.leadId}`);
  setFlash("success", "Wiedervorlage erledigt.");
}
