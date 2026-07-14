import { LeadStatus } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [newLeads, contactedLeads, interestedLeads, openFollowUps, loggedContacts] =
    await Promise.all([
      prisma.lead.count({ where: { status: LeadStatus.NEW } }),
      prisma.lead.count({ where: { status: LeadStatus.CONTACTED } }),
      prisma.lead.count({ where: { status: LeadStatus.INTERESTED } }),
      prisma.reminder.count({ where: { status: "OPEN" } }),
      prisma.contactLog.count()
    ]);

  const cards = [
    { label: "Neue Leads", value: newLeads },
    { label: "Angeschriebene Leads", value: contactedLeads },
    { label: "Interessierte Leads", value: interestedLeads },
    { label: "Offene Wiedervorlagen", value: openFollowUps },
    { label: "Protokollierte Kontakte", value: loggedContacts }
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Aktuelle Kennzahlen aus der Leadverwaltung. Automatisierte Datensammlung und Websitepruefung folgen spaeter."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <article
            className="rounded-lg border border-line bg-white p-5 shadow-sm"
            key={card.label}
          >
            <p className="text-sm font-medium text-muted">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{card.value}</p>
          </article>
        ))}
      </section>
    </>
  );
}
