"use server";

import { BlocklistType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeBlocklistValue } from "@/lib/blocklist";
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

  if (!value) throw new Error("Ungueltiger Ausschlusslisten-Wert.");

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
}

export async function deactivateBlocklistEntry(entryId: string) {
  await requireUser();

  await prisma.blocklistEntry.update({
    where: { id: entryId },
    data: { active: false }
  });

  revalidatePath("/einstellungen");
}
