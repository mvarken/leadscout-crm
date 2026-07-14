import { LeadActivityType } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addLeadNote,
  runWebsiteCheck,
  updateLead,
  updateLeadStatus
} from "@/app/(protected)/leads/actions";
import { PageHeader } from "@/components/page-header";
import { leadStatusLabels, leadStatusOptions } from "@/lib/lead-utils";
import { prisma } from "@/lib/prisma";

type LeadDetailPageProps = {
  params: {
    id: string;
  };
  searchParams: {
    duplicate?: string;
  };
};

const activityLabels: Record<LeadActivityType, string> = {
  CREATED: "Angelegt",
  UPDATED: "Aktualisiert",
  STATUS_CHANGED: "Status geaendert",
  NOTE_ADDED: "Notiz",
  WEBSITE_CHECKED: "Website geprueft"
};

function booleanLabel(value: boolean | null) {
  if (value === true) return "Ja";
  if (value === false) return "Nein";
  return "Noch nicht geprueft";
}

export default async function LeadDetailPage({ params, searchParams }: LeadDetailPageProps) {
  const [lead, duplicateLead] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    }),
    searchParams.duplicate
      ? prisma.lead.findUnique({
          where: { id: searchParams.duplicate },
          select: { id: true, companyName: true, city: true, website: true }
        })
      : null
  ]);

  if (!lead) {
    notFound();
  }

  const updateLeadWithId = updateLead.bind(null, lead.id);
  const updateStatusWithId = updateLeadStatus.bind(null, lead.id);
  const addNoteWithId = addLeadNote.bind(null, lead.id);
  const runWebsiteCheckWithId = runWebsiteCheck.bind(null, lead.id);

  return (
    <>
      <div className="mb-4">
        <Link className="text-sm font-semibold text-brand hover:underline" href="/leads">
          Zurueck zu Leads
        </Link>
      </div>
      <PageHeader
        title={lead.companyName}
        description={`${leadStatusLabels[lead.status]}${lead.city ? ` · ${lead.city}` : ""}`}
      />

      {duplicateLead ? (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Aehnlicher oder gleicher Lead gefunden:{" "}
          <Link className="font-semibold underline" href={`/leads/${duplicateLead.id}`}>
            {duplicateLead.companyName}
          </Link>
          {duplicateLead.city ? `, ${duplicateLead.city}` : ""}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-ink">Stammdaten</h2>
          <form action={updateLeadWithId} className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-ink">Firma</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.companyName}
                name="companyName"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Ansprechpartner</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.contactName ?? ""}
                name="contactName"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Branche</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.industry ?? ""}
                name="industry"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Telefon</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.phone ?? ""}
                name="phone"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">E-Mail</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.email ?? ""}
                name="email"
                type="email"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-ink">Website</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.website ?? ""}
                name="website"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-ink">Strasse</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.street ?? ""}
                name="street"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">PLZ</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.postalCode ?? ""}
                name="postalCode"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Stadt</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.city ?? ""}
                name="city"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Bundesland</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.state ?? ""}
                name="state"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Land</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.country}
                name="country"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Quelle</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.source ?? ""}
                name="source"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Quell-URL</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.sourceUrl ?? ""}
                name="sourceUrl"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-ink">Interne Notiz</span>
              <textarea
                className="mt-1 min-h-28 w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.notes ?? ""}
                name="notes"
              />
            </label>
            <div className="md:col-span-2">
              <button
                className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-teal-800"
                type="submit"
              >
                Stammdaten speichern
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-ink">Status</h2>
            <form action={updateStatusWithId} className="space-y-4">
              <select
                className="w-full rounded-md border border-line px-3 py-2"
                defaultValue={lead.status}
                name="status"
              >
                {leadStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-24 w-full rounded-md border border-line px-3 py-2"
                name="note"
                placeholder="Optionale Historiennotiz"
              />
              <button
                className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-teal-800"
                type="submit"
              >
                Status speichern
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-ink">Notiz hinzufuegen</h2>
            <form action={addNoteWithId} className="space-y-4">
              <textarea
                className="min-h-28 w-full rounded-md border border-line px-3 py-2"
                name="note"
                required
              />
              <button
                className="rounded-md border border-line px-4 py-2 font-semibold text-ink"
                type="submit"
              >
                Notiz speichern
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Websitepruefung</h2>
                <p className="mt-1 text-sm text-muted">
                  {lead.websiteCheckedAt
                    ? `Zuletzt geprueft: ${lead.websiteCheckedAt.toLocaleString("de-DE")}`
                    : "Noch nicht geprueft"}
                </p>
              </div>
            </div>
            <form action={runWebsiteCheckWithId}>
              <button
                className="mb-4 rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={!lead.website}
                type="submit"
              >
                Website pruefen
              </button>
            </form>
            {!lead.website ? (
              <p className="text-sm text-muted">Keine Website hinterlegt.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted">Erreichbar</dt>
                <dd className="font-medium text-ink">{booleanLabel(lead.websiteReachable)}</dd>
                <dt className="text-muted">HTTPS/SSL</dt>
                <dd className="font-medium text-ink">{booleanLabel(lead.httpsEnabled)}</dd>
                <dt className="text-muted">HTTP zu HTTPS</dt>
                <dd className="font-medium text-ink">{booleanLabel(lead.httpRedirectsToHttps)}</dd>
                <dt className="text-muted">WordPress</dt>
                <dd className="font-medium text-ink">
                  {lead.wordpressStatus ?? "Noch nicht geprueft"}
                </dd>
                <dt className="text-muted">Impressum</dt>
                <dd className="font-medium text-ink">{booleanLabel(lead.hasImpressum)}</dd>
                <dt className="text-muted">Datenschutz</dt>
                <dd className="font-medium text-ink">{booleanLabel(lead.hasPrivacyPolicy)}</dd>
                <dt className="text-muted">Kontaktseite</dt>
                <dd className="font-medium text-ink">{booleanLabel(lead.hasContactPage)}</dd>
                <dt className="text-muted">E-Mail Website</dt>
                <dd className="break-all font-medium text-ink">{lead.websiteEmail ?? "-"}</dd>
                <dt className="text-muted">Telefon Website</dt>
                <dd className="font-medium text-ink">{lead.websitePhone ?? "-"}</dd>
              </dl>
            )}
            {lead.websiteCheckNotes ? (
              <p className="mt-4 whitespace-pre-line rounded-md bg-field p-3 text-sm text-muted">
                {lead.websiteCheckNotes}
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-ink">Historie</h2>
            <div className="space-y-4">
              {lead.activities.map((activity) => (
                <article className="border-l-2 border-brand pl-4" key={activity.id}>
                  <p className="text-sm font-semibold text-ink">{activityLabels[activity.type]}</p>
                  <p className="text-xs text-muted">
                    {activity.createdAt.toLocaleString("de-DE")}
                    {activity.user?.name ? ` · ${activity.user.name}` : ""}
                  </p>
                  {activity.oldValue || activity.newValue ? (
                    <p className="mt-2 text-sm text-muted">
                      {activity.oldValue
                        ? leadStatusLabels[activity.oldValue as keyof typeof leadStatusLabels]
                        : ""}
                      {activity.oldValue && activity.newValue ? " -> " : ""}
                      {activity.newValue
                        ? leadStatusLabels[activity.newValue as keyof typeof leadStatusLabels]
                        : ""}
                    </p>
                  ) : null}
                  {activity.note ? (
                    <p className="mt-2 whitespace-pre-line text-sm text-ink">{activity.note}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
