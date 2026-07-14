import { Lead, WordpressStatus } from "@prisma/client";

type ScoreLead = Pick<
  Lead,
  | "wordpressStatus"
  | "httpsEnabled"
  | "hasImpressum"
  | "hasPrivacyPolicy"
  | "websiteReachable"
  | "email"
  | "phone"
>;

export function calculateLeadScore(lead: ScoreLead) {
  let score = 0;

  if (lead.wordpressStatus === WordpressStatus.DETECTED) score += 20;
  if (lead.wordpressStatus === WordpressStatus.LIKELY) score += 12;
  if (lead.httpsEnabled === false) score += 25;
  if (lead.hasImpressum === false) score += 15;
  if (lead.hasPrivacyPolicy === false) score += 15;
  if (lead.email) score += 10;
  if (lead.phone) score += 5;
  if (lead.websiteReachable === false) score -= 15;

  return Math.max(0, score);
}
