"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defaultFirstContactTemplate } from "@/lib/communication";
import { setFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const emailTemplateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().min(2).max(180),
  body: z.string().trim().min(10).max(5000)
});

export async function createEmailTemplate(formData: FormData) {
  const user = await requireUser();
  const data = emailTemplateSchema.parse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    body: formData.get("body")
  });

  await prisma.emailTemplate.create({
    data: {
      ...data,
      createdById: user.id
    }
  });

  revalidatePath("/kommunikation");
  setFlash("success", "E-Mail-Vorlage gespeichert.");
}

export async function createDefaultEmailTemplate() {
  const user = await requireUser();
  const existing = await prisma.emailTemplate.findFirst({
    where: { name: defaultFirstContactTemplate.name }
  });

  if (existing) {
    await prisma.emailTemplate.update({
      where: { id: existing.id },
      data: {
        ...defaultFirstContactTemplate,
        active: true
      }
    });
  } else {
    await prisma.emailTemplate.create({
      data: {
        ...defaultFirstContactTemplate,
        createdById: user.id
      }
    });
  }

  revalidatePath("/kommunikation");
  setFlash("success", "Standardvorlage angelegt.");
}

export async function deactivateEmailTemplate(templateId: string) {
  await requireUser();

  await prisma.emailTemplate.update({
    where: { id: templateId },
    data: { active: false }
  });

  revalidatePath("/kommunikation");
  setFlash("success", "E-Mail-Vorlage deaktiviert.");
}
