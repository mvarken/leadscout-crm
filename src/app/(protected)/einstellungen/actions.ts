"use server";

import { BlocklistType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeBlocklistValue } from "@/lib/blocklist";
import { setFlash } from "@/lib/flash";
import { sendSmtpTestEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function createBlocklistEntry(formData: FormData) {
  await requireUser();
  const type = z.nativeEnum(BlocklistType).parse(formData.get("type"));
  const rawValue = z.string().trim().min(2).max(240).parse(formData.get("value"));
  const note = z
    .string()
    .trim()
    .max(1000)
    .optional()
    .parse(formData.get("note") || undefined);
  const value = normalizeBlocklistValue(type, rawValue);

  if (!value) {
    setFlash("error", "Ungueltiger Ausschlusslisten-Wert.");
    redirect("/einstellungen");
  }

  await prisma.blocklistEntry.upsert({
    where: {
      type_value: {
        type,
        value
      }
    },
    update: {
      note,
      active: true
    },
    create: {
      type,
      value,
      note
    }
  });

  revalidatePath("/einstellungen");
  setFlash("success", "Ausschlussliste gespeichert.");
}

export async function deactivateBlocklistEntry(entryId: string) {
  await requireUser();

  await prisma.blocklistEntry.update({
    where: { id: entryId },
    data: { active: false }
  });

  revalidatePath("/einstellungen");
  setFlash("success", "Ausschluss entfernt.");
}

const smtpSettingsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().trim().max(240).nullable(),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().trim().max(240).nullable(),
  password: z.string().max(500).nullable(),
  fromEmail: z.string().trim().email().max(254).nullable().or(z.literal(null)),
  fromName: z.string().trim().max(120).nullable(),
  replyTo: z.string().trim().email().max(254).nullable().or(z.literal(null))
});

export async function updateSmtpSettings(formData: FormData) {
  await requireUser();
  const existing = await prisma.smtpSettings.findUnique({ where: { id: "default" } });
  const password = String(formData.get("password") ?? "");
  const data = smtpSettingsSchema.parse({
    enabled: formData.get("enabled") === "on",
    host: cleanSettingsValue(formData.get("host")),
    port: formData.get("port") || "587",
    secure: formData.get("secure") === "on",
    user: cleanSettingsValue(formData.get("user")),
    password: password.trim() ? password : (existing?.password ?? null),
    fromEmail: cleanSettingsValue(formData.get("fromEmail")),
    fromName: cleanSettingsValue(formData.get("fromName")),
    replyTo: cleanSettingsValue(formData.get("replyTo"))
  });

  await prisma.smtpSettings.upsert({
    where: { id: "default" },
    update: data,
    create: {
      id: "default",
      ...data
    }
  });

  revalidatePath("/einstellungen");
  revalidatePath("/kommunikation");
  setFlash("success", "SMTP-Einstellungen gespeichert.");
}

export async function sendSmtpTest(formData: FormData) {
  await requireUser();
  const to = z.string().trim().email().max(254).parse(formData.get("testEmail"));

  try {
    await sendSmtpTestEmail(to);
  } catch {
    setFlash("error", "Testmail konnte nicht gesendet werden. Bitte SMTP-Daten pruefen.");
    redirect("/einstellungen");
  }

  setFlash("success", `Testmail wurde an ${to} gesendet.`);
  redirect("/einstellungen");
}

function cleanSettingsValue(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}
