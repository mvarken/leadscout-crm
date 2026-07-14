import { BlocklistType } from "@prisma/client";
import { normalizeDomain, normalizeEmail, normalizePhone } from "@/lib/lead-utils";
import { prisma } from "@/lib/prisma";

export function normalizeBlocklistValue(type: BlocklistType, value: string) {
  if (type === BlocklistType.DOMAIN) return normalizeDomain(value) ?? "";
  if (type === BlocklistType.EMAIL) return normalizeEmail(value) ?? "";
  if (type === BlocklistType.PHONE) return normalizePhone(value) ?? "";
  return value.trim().toLowerCase();
}

export async function findBlocklistMatch(input: {
  companyName?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const checks = [
    input.website
      ? {
          type: BlocklistType.DOMAIN,
          value: normalizeBlocklistValue(BlocklistType.DOMAIN, input.website)
        }
      : null,
    input.email
      ? {
          type: BlocklistType.EMAIL,
          value: normalizeBlocklistValue(BlocklistType.EMAIL, input.email)
        }
      : null,
    input.phone
      ? {
          type: BlocklistType.PHONE,
          value: normalizeBlocklistValue(BlocklistType.PHONE, input.phone)
        }
      : null,
    input.companyName
      ? {
          type: BlocklistType.COMPANY,
          value: normalizeBlocklistValue(BlocklistType.COMPANY, input.companyName)
        }
      : null
  ].filter(Boolean) as { type: BlocklistType; value: string }[];

  if (checks.length === 0) return null;

  return prisma.blocklistEntry.findFirst({
    where: {
      active: true,
      OR: checks.map((check) => ({
        type: check.type,
        value: check.value
      }))
    }
  });
}
