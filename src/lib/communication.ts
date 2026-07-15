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

export const defaultFirstContactTemplate = {
  name: "Erstkontakt Website-Check",
  subject: "Kurzer technischer Hinweis zu {{firma}}",
  body: `Guten Tag {{ansprechpartner}},

bei der Recherche zu {{firma}} ist mir Ihre Website {{website}} aufgefallen. Ich unterstuetze regionale Betriebe dabei, Websites technisch sauberer, schneller und vertrauenswuerdiger aufzustellen.

Dabei geht es zum Beispiel um SSL, WordPress-Sicherheit, Kontaktmoeglichkeiten, Impressum/Datenschutz und kleine technische Punkte, die Besucher oder Suchmaschinen beeinflussen koennen.

Wenn Sie moechten, sende ich Ihnen gern eine kurze kostenlose Ersteinschaetzung zu Ihrer Website. Dann sehen Sie direkt, ob es konkrete Ansatzpunkte gibt.

Freundliche Gruesse`
};

export function renderCommunicationTemplate(template: string, lead: TemplateLead) {
  const contactName = lead.contactName?.trim() || "zusammen";

  return template
    .replaceAll("{{firma}}", lead.companyName)
    .replaceAll("{{ansprechpartner}}", contactName)
    .replaceAll("{{stadt}}", lead.city ?? "")
    .replaceAll("{{website}}", lead.website ?? "")
    .replaceAll("{{email}}", lead.email ?? "");
}
