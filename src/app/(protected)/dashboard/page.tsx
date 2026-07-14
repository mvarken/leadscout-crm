import { PageHeader } from "@/components/page-header";

const cards = [
  { label: "Neue Leads", value: "0" },
  { label: "Angeschriebene Leads", value: "0" },
  { label: "Interessierte Leads", value: "0" },
  { label: "Offene Wiedervorlagen", value: "0" }
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Die Kennzahlen sind fuer Phase 1 statisch vorbereitet und werden spaeter mit echten Lead-Daten verbunden."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
