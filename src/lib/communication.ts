import { ContactChannel, ContactDirection, Lead } from "@prisma/client";

export const contactChannelLabels: Record<ContactChannel, string> = {
  EMAIL: "E-Mail",
  PHONE: "Telefon",
  WEBSITE_FORM: "Website-Formular",
  LINKEDIN: "LinkedIn",
  OTHER: "Sonstiges"
};

export const contactDirectionLabels: Record<ContactDirection, string> = {
  OUTGOING: "Ausgehend",
  INCOMING: "Eingehend"
};

type TemplateLead = Pick<Lead, "companyName" | "contactName" | "city" | "website" | "email">;

export function renderCommunicationTemplate(template: string, lead: TemplateLead) {
  const contactName = lead.contactName?.trim() || "zusammen";

  return template
    .replaceAll("{{firma}}", lead.companyName)
    .replaceAll("{{ansprechpartner}}", contactName)
    .replaceAll("{{stadt}}", lead.city ?? "")
    .replaceAll("{{website}}", lead.website ?? "")
    .replaceAll("{{email}}", lead.email ?? "");
}
