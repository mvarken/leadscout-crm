import { BlocklistType, LeadActivityType } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addLeadNote,
  createReminder,
  logLeadContact,
  recalculateLeadScore,
  runWebsiteCheck,
  updateLead,
  updateLeadStatus
} from "@/app/(protected)/leads/actions";
import { PageHeader } from "@/components/page-header";
import { contactChannelLabels, contactDirectionLabels } from "@/lib/communication";
import { leadStatusLabels, leadStatusOptions, normalizeWebsite } from "@/lib/lead-utils";
import { getSmtpStatus } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

type LeadDetailPageProps = {
  params: {
    id: string;
  };
  searchParams: {
    duplicate?: string;
    blocked?: string;
    edit?: string;
  };
};

const blocklistTypeLabels: Record<BlocklistType, string> = {
  DOMAIN: "Domain",
  EMAIL: "E-Mail",
  PHONE: "Telefon",
  COMPANY: "Firma"
};

const activityLabels: Record<LeadActivityType, string> = {
  CREATED: "Angelegt",
  UPDATED: "Aktualisiert",
  STATUS_CHANGED: "Status geaendert",
  NOTE_ADDED: "Notiz",
  WEBSITE_CHECKED: "Website geprueft",
  CONTACT_LOGGED: "Kontakt protokolliert"
};

function booleanLabel(value: boolean | null) {
  if (value === true) return "Ja";
  if (value === false) return "Nein";
  return "Noch nicht geprueft";
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "-";
}

export default async function LeadDetailPage({ params, searchParams }: LeadDetailPageProps) {
  const [lead, duplicateLead, blockedEntry] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        reminders: {
          where: { status: "OPEN" },
          orderBy: { dueAt: "asc" }
        },
        contactLogs: {
          orderBy: { contactedAt: "desc" },
          include: {
            template: {
              select: {
                name: true
              }
            },
            user: {
              select: {
                name: true
              }
            }
          }
        },
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
      : null,
    searchParams.blocked
      ? prisma.blocklistEntry.findUnique({
          where: { id: searchParams.blocked }
        })
      : null
  ]);

  if (!lead) {
    notFound();
  }

  const updateLeadWithId = updateLead.bind(null, lead.id);
  const isEditingStammdaten = searchParams.edit === "1";
  const updateStatusWithId = updateLeadStatus.bind(null, lead.id);
  const addNoteWithId = addLeadNote.bind(null, lead.id);
  const runWebsiteCheckWithId = runWebsiteCheck.bind(null, lead.id);
  const recalculateLeadScoreWithId = recalculateLeadScore.bind(null, lead.id);
  const createReminderWithId = createReminder.bind(null, lead.id);
  const logLeadContactWithId = logLeadContact.bind(null, lead.id);
  const smtpStatus = getSmtpStatus();
  const emailTemplates = await prisma.emailTemplate.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });

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

      {blockedEntry ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          Diese Aenderung wurde durch die Ausschlussliste gestoppt:{" "}
          <span className="font-semibold">
            {blocklistTypeLabels[blockedEntry.type]} {blockedEntry.value}
          </span>
          .
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Stammdaten</h2>
              <p className="mt-1 text-sm text-muted">
                {isEditingStammdaten
                  ? "Bearbeitung aktiv"
                  : "Festgesetzt nach Aufnahme. Zum Aendern zuerst bearbeiten."}
              </p>
            </div>
            {isEditingStammdaten ? (
              <Link
                className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink"
                href={`/leads/${lead.id}`}
              >
                Abbrechen
              </Link>
            ) : (
              <Link
                className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                href={`/leads/${lead.id}?edit=1`}
              >
                Bearbeiten
              </Link>
            )}
          </div>

          {isEditingStammdaten ? (
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
          ) : (
            <dl className="grid gap-x-5 gap-y-4 text-sm md:grid-cols-2">
              <div className="md:col-span-2">
                <dt className="text-muted">Firma</dt>
                <dd className="mt-1 font-semibold text-ink">{lead.companyName}</dd>
              </div>
              <div>
                <dt className="text-muted">Ansprechpartner</dt>
                <dd className="mt-1 font-medium text-ink">{displayValue(lead.contactName)}</dd>
              </div>
              <div>
                <dt className="text-muted">Branche</dt>
                <dd className="mt-1 font-medium text-ink">{displayValue(lead.industry)}</dd>
              </div>
              <div>
                <dt className="text-muted">Telefon</dt>
                <dd className="mt-1 font-medium text-ink">{displayValue(lead.phone)}</dd>
              </div>
              <div>
                <dt className="text-muted">E-Mail</dt>
                <dd className="mt-1 break-all font-medium text-ink">{displayValue(lead.email)}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-muted">Website</dt>
                <dd className="mt-1 break-all font-medium text-ink">
                  {normalizeWebsite(lead.website) ? (
                    <a
                      className="text-brand hover:underline"
                      href={normalizeWebsite(lead.website) ?? undefined}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {lead.website}
                    </a>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-muted">Adresse</dt>
                <dd className="mt-1 font-medium text-ink">
                  {[lead.street, lead.postalCode, lead.city, lead.state, lead.country]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Quelle</dt>
                <dd className="mt-1 font-medium text-ink">{displayValue(lead.source)}</dd>
              </div>
              <div>
                <dt className="text-muted">Quell-URL</dt>
                <dd className="mt-1 break-all font-medium text-ink">
                  {lead.sourceUrl ? (
                    <a
                      className="text-brand hover:underline"
                      href={lead.sourceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {lead.sourceUrl}
                    </a>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-muted">Interne Notiz</dt>
                <dd className="mt-1 whitespace-pre-line rounded-md bg-field p-3 font-medium text-ink">
                  {displayValue(lead.notes)}
                </dd>
              </div>
            </dl>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-ink">Lead-Score</h2>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-semibold text-ink">{lead.leadScore}</p>
                <p className="mt-1 text-sm text-muted">
                  {lead.leadScoreUpdatedAt
                    ? `Aktualisiert: ${lead.leadScoreUpdatedAt.toLocaleString("de-DE")}`
                    : "Noch nicht berechnet"}
                </p>
              </div>
              <form action={recalculateLeadScoreWithId}>
                <button
                  className="rounded-md border border-line px-3 py-2 font-semibold text-ink"
                  type="submit"
                >
                  Neu berechnen
                </button>
              </form>
            </div>
          </section>

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
            <h2 className="mb-4 text-lg font-semibold text-ink">Wiedervorlage</h2>
            <form action={createReminderWithId} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-ink">Art</span>
                <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="type">
                  <option value="FOLLOW_UP">Nachfassen</option>
                  <option value="WEBSITE_RECHECK">Website erneut pruefen</option>
                  <option value="GENERAL">Allgemein</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Faellig am</span>
                <input
                  className="mt-1 w-full rounded-md border border-line px-3 py-2"
                  name="dueAt"
                  required
                  type="datetime-local"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Titel</span>
                <input
                  className="mt-1 w-full rounded-md border border-line px-3 py-2"
                  defaultValue="Nachfassen"
                  name="title"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Notiz</span>
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-line px-3 py-2"
                  name="note"
                />
              </label>
              <button
                className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-teal-800"
                type="submit"
              >
                Wiedervorlage speichern
              </button>
            </form>
            {lead.reminders.length > 0 ? (
              <div className="mt-5 space-y-3">
                {lead.reminders.map((reminder) => (
                  <div className="rounded-md bg-field p-3 text-sm" key={reminder.id}>
                    <p className="font-semibold text-ink">{reminder.title}</p>
                    <p className="text-muted">{reminder.dueAt.toLocaleString("de-DE")}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-ink">Kontakt protokollieren</h2>
            <form action={logLeadContactWithId} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-ink">Kanal</span>
                  <select
                    className="mt-1 w-full rounded-md border border-line px-3 py-2"
                    name="channel"
                  >
                    {Object.entries(contactChannelLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink">Richtung</span>
                  <select
                    className="mt-1 w-full rounded-md border border-line px-3 py-2"
                    name="direction"
                  >
                    {Object.entries(contactDirectionLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-ink">Vorlage</span>
                <select
                  className="mt-1 w-full rounded-md border border-line px-3 py-2"
                  name="templateId"
                >
                  <option value="">Ohne Vorlage</option>
                  {emailTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Datum</span>
                <input
                  className="mt-1 w-full rounded-md border border-line px-3 py-2"
                  name="contactedAt"
                  type="datetime-local"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Betreff</span>
                <input
                  className="mt-1 w-full rounded-md border border-line px-3 py-2"
                  name="subject"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Nachricht / Notiz</span>
                <textarea
                  className="mt-1 min-h-28 w-full rounded-md border border-line px-3 py-2"
                  name="message"
                  placeholder="Leer lassen, wenn eine Vorlage ausgewaehlt ist."
                />
              </label>
              <label className="flex items-start gap-3 rounded-md border border-line bg-field p-3 text-sm">
                <input className="mt-1" name="sendEmail" type="checkbox" value="on" />
                <span>
                  <span className="font-semibold text-ink">E-Mail jetzt senden</span>
                  <span className="mt-1 block text-muted">
                    {smtpStatus.configured
                      ? lead.email
                        ? `Versand an ${lead.email}`
                        : "Nicht moeglich, weil keine E-Mail-Adresse beim Lead hinterlegt ist."
                      : "SMTP ist noch nicht vollstaendig eingerichtet."}
                  </span>
                </span>
              </label>
              <button
                className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-teal-800"
                type="submit"
              >
                Kontakt speichern
              </button>
            </form>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-md bg-field p-3 text-sm">
              <div>
                <p className="text-muted">Kontakte</p>
                <p className="font-semibold text-ink">{lead.contactCount}</p>
              </div>
              <div>
                <p className="text-muted">Zuletzt</p>
                <p className="font-semibold text-ink">
                  {lead.lastContactedAt ? lead.lastContactedAt.toLocaleDateString("de-DE") : "-"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-ink">Kontaktverlauf</h2>
            <div className="space-y-4">
              {lead.contactLogs.map((log) => (
                <article className="rounded-md bg-field p-3 text-sm" key={log.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">
                        {contactDirectionLabels[log.direction]} ·{" "}
                        {contactChannelLabels[log.channel]}
                      </p>
                      <p className="mt-1 text-muted">{log.contactedAt.toLocaleString("de-DE")}</p>
                    </div>
                    {log.template?.name ? (
                      <span className="rounded-md border border-line bg-white px-2 py-1 text-xs text-muted">
                        {log.template.name}
                      </span>
                    ) : null}
                  </div>
                  {log.subject ? <p className="mt-3 font-medium text-ink">{log.subject}</p> : null}
                  {log.message ? (
                    <p className="mt-2 whitespace-pre-line text-muted">{log.message}</p>
                  ) : null}
                  {log.user?.name ? (
                    <p className="mt-2 text-xs text-muted">{log.user.name}</p>
                  ) : null}
                </article>
              ))}
              {lead.contactLogs.length === 0 ? (
                <p className="text-sm text-muted">Noch kein Kontakt protokolliert.</p>
              ) : null}
            </div>
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
