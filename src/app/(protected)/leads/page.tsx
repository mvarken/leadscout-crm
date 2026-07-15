import { BlocklistType, LeadStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { createLead } from "@/app/(protected)/leads/actions";
import { PageHeader } from "@/components/page-header";
import {
  leadStatusGroups,
  leadStatusLabels,
  leadStatusOptions,
  normalizeWebsite
} from "@/lib/lead-utils";
import { prisma } from "@/lib/prisma";

type LeadsPageProps = {
  searchParams: {
    q?: string;
    status?: string;
    duplicate?: string;
    blocked?: string;
    add?: string;
  };
};

const blocklistTypeLabels: Record<BlocklistType, string> = {
  DOMAIN: "Domain",
  EMAIL: "E-Mail",
  PHONE: "Telefon",
  COMPANY: "Firma"
};

function statusFromSearch(value?: string) {
  if (!value) return null;
  return Object.values(LeadStatus).includes(value as LeadStatus) ? (value as LeadStatus) : null;
}

function leadsHref(
  searchParams: LeadsPageProps["searchParams"],
  overrides: Record<string, string | null>
) {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.status) params.set("status", searchParams.status);

  for (const [key, value] of Object.entries(overrides)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }

  const query = params.toString();
  return query ? `/leads?${query}` : "/leads";
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const query = searchParams.q?.trim() ?? "";
  const status = statusFromSearch(searchParams.status);
  const showAddLead = searchParams.add === "1";

  const where: Prisma.LeadWhereInput = {
    status: status ?? undefined,
    OR: query
      ? [
          { companyName: { contains: query, mode: "insensitive" } },
          { contactName: { contains: query, mode: "insensitive" } },
          { city: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { website: { contains: query, mode: "insensitive" } }
        ]
      : undefined
  };

  const [leads, duplicateLead, blockedEntry] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        companyName: true,
        city: true,
        phone: true,
        email: true,
        website: true,
        status: true,
        leadScore: true,
        nextFollowUpAt: true,
        lastContactedAt: true,
        contactCount: true,
        updatedAt: true
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

  return (
    <>
      <PageHeader
        title="Leads"
        description="Leads manuell anlegen, durchsuchen, filtern und in der Detailansicht weiterbearbeiten."
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
          Dieser Datensatz steht auf der Ausschlussliste:{" "}
          <span className="font-semibold">
            {blocklistTypeLabels[blockedEntry.type]} {blockedEntry.value}
          </span>
          .
        </div>
      ) : null}

      <section className="mb-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Manueller Lead</h2>
            <p className="mt-1 text-sm text-muted">
              Formular nur oeffnen, wenn ein Lead direkt erfasst werden soll.
            </p>
          </div>
          <Link
            className={`w-fit rounded-md px-4 py-2 font-semibold ${
              showAddLead
                ? "border border-line text-ink hover:bg-field"
                : "bg-brand text-white hover:bg-teal-800"
            }`}
            href={leadsHref(searchParams, { add: showAddLead ? null : "1" })}
          >
            {showAddLead ? "Formular schliessen" : "Lead manuell hinzufuegen"}
          </Link>
        </div>

        {showAddLead ? (
          <form action={createLead} className="mt-5 grid gap-4 lg:grid-cols-4">
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-ink">Firma</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                name="companyName"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Branche</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                name="industry"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Ansprechpartner</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                name="contactName"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Telefon</span>
              <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="phone" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">E-Mail</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                name="email"
                type="email"
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-ink">Website</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                name="website"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">PLZ</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                name="postalCode"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Stadt</span>
              <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="city" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-ink">Strasse</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                name="street"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Bundesland</span>
              <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="state" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Land</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue="Deutschland"
                name="country"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Quelle</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                name="source"
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-ink">Quell-URL</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                name="sourceUrl"
              />
            </label>
            <label className="block lg:col-span-4">
              <span className="text-sm font-medium text-ink">Notiz</span>
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-line px-3 py-2"
                name="notes"
              />
            </label>
            <div className="lg:col-span-4">
              <button
                className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-teal-800"
                type="submit"
              >
                Lead anlegen
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line p-5">
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/leads">
            <input
              className="rounded-md border border-line px-3 py-2"
              defaultValue={query}
              name="q"
              placeholder="Firma, Stadt, E-Mail, Telefon oder Website suchen"
            />
            <select
              className="rounded-md border border-line px-3 py-2"
              defaultValue={status ?? ""}
              name="status"
            >
              <option value="">Alle Status</option>
              {leadStatusGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              className="rounded-md border border-line px-4 py-2 font-semibold text-ink"
              type="submit"
            >
              Filtern
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead className="bg-field text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Firma</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Kontakt</th>
                <th className="px-5 py-3 font-semibold">Website</th>
                <th className="px-5 py-3 font-semibold">Score</th>
                <th className="px-5 py-3 font-semibold">Kontakte</th>
                <th className="px-5 py-3 font-semibold">Wiedervorlage</th>
                <th className="px-5 py-3 font-semibold">Aktualisiert</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr className="border-t border-line" key={lead.id}>
                  <td className="px-5 py-4">
                    <Link
                      className="font-semibold text-brand hover:underline"
                      href={`/leads/${lead.id}`}
                    >
                      {lead.companyName}
                    </Link>
                    {lead.city ? <p className="mt-1 text-muted">{lead.city}</p> : null}
                  </td>
                  <td className="px-5 py-4">{leadStatusLabels[lead.status]}</td>
                  <td className="px-5 py-4 text-muted">
                    <p>{lead.email || "Keine E-Mail"}</p>
                    <p>{lead.phone || "Keine Telefonnummer"}</p>
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {lead.website ? (
                      <a
                        className="font-semibold text-brand hover:underline"
                        href={normalizeWebsite(lead.website) ?? lead.website}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {lead.website}
                      </a>
                    ) : (
                      "Keine Website"
                    )}
                  </td>
                  <td className="px-5 py-4 font-semibold text-ink">{lead.leadScore}</td>
                  <td className="px-5 py-4 text-muted">
                    <p className="font-semibold text-ink">{lead.contactCount}</p>
                    <p>
                      {lead.lastContactedAt
                        ? lead.lastContactedAt.toLocaleDateString("de-DE")
                        : "Noch kein Kontakt"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {lead.nextFollowUpAt ? lead.nextFollowUpAt.toLocaleDateString("de-DE") : "-"}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {lead.updatedAt.toLocaleDateString("de-DE")}
                  </td>
                </tr>
              ))}
              {leads.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-muted" colSpan={8}>
                    Noch keine Leads gefunden.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
