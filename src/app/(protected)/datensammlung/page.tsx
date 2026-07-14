import {
  CollectionJobStatus,
  DirectoryProviderStatus,
  DirectoryResultStatus
} from "@prisma/client";
import Link from "next/link";
import {
  convertDirectoryResult,
  convertPreviewResult,
  ignoreDirectoryResult,
  importDirectoryCsv,
  startCollectionJob,
  updateDirectoryProviderConfig
} from "@/app/(protected)/datensammlung/actions";
import { PageHeader } from "@/components/page-header";
import {
  ensureDefaultDirectoryProviders,
  getDirectoryProviderDefinition
} from "@/lib/directory-provider";
import { search11880Preview } from "@/lib/11880-search";
import { prisma } from "@/lib/prisma";

type DatensammlungPageProps = {
  searchParams: {
    job?: string;
    q11880?: string;
    loc11880?: string;
  };
};

const jobStatusLabels: Record<CollectionJobStatus, string> = {
  PENDING: "Wartet",
  RUNNING: "Laeuft",
  COMPLETED: "Abgeschlossen",
  FAILED: "Fehlgeschlagen"
};

const resultStatusLabels: Record<DirectoryResultStatus, string> = {
  NEW: "Neu",
  CONVERTED: "Uebernommen",
  IGNORED: "Ignoriert",
  DUPLICATE: "Duplikat"
};

const providerStatusLabels: Record<DirectoryProviderStatus, string> = {
  DRAFT: "Entwurf",
  NEEDS_REVIEW: "Pruefung noetig",
  APPROVED: "Freigegeben",
  DISABLED: "Deaktiviert"
};

function reviewedLabel(value: Date | null) {
  return value ? value.toLocaleDateString("de-DE") : "Offen";
}

export default async function DatensammlungPage({ searchParams }: DatensammlungPageProps) {
  await ensureDefaultDirectoryProviders();
  const search11880Industry = searchParams.q11880?.trim() ?? "";
  const search11880Location = searchParams.loc11880?.trim() ?? "";
  const search11880PreviewResult = search11880Industry
    ? await search11880Preview({
        industry: search11880Industry,
        location: search11880Location,
        limit: 10
      }).catch((error) => ({
        url: null,
        companies: [],
        error: error instanceof Error ? error.message : "11880 konnte nicht geladen werden."
      }))
    : null;

  const [jobs, selectedJob, providers] = await Promise.all([
    prisma.collectionJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        _count: { select: { results: true } }
      }
    }),
    searchParams.job
      ? prisma.collectionJob.findUnique({
          where: { id: searchParams.job },
          include: {
            results: {
              orderBy: [{ status: "asc" }, { companyName: "asc" }],
              include: {
                lead: {
                  select: {
                    id: true,
                    companyName: true
                  }
                }
              }
            }
          }
        })
      : null,
    prisma.directoryProviderConfig.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }]
    })
  ]);

  const sortedProviders = [...providers].sort((first, second) => {
    const firstReady =
      first.status === DirectoryProviderStatus.APPROVED &&
      !first.requiresManualApproval &&
      getDirectoryProviderDefinition(first.key)?.implemented &&
      getDirectoryProviderDefinition(first.key)?.supportsSearch
        ? 0
        : 1;
    const secondReady =
      second.status === DirectoryProviderStatus.APPROVED &&
      !second.requiresManualApproval &&
      getDirectoryProviderDefinition(second.key)?.implemented &&
      getDirectoryProviderDefinition(second.key)?.supportsSearch
        ? 0
        : 1;
    return firstReady - secondReady || first.name.localeCompare(second.name);
  });
  const searchableProviders = sortedProviders.filter((provider) => {
    const definition = getDirectoryProviderDefinition(provider.key);
    return (
      provider.status === DirectoryProviderStatus.APPROVED &&
      !provider.requiresManualApproval &&
      Boolean(definition?.implemented && definition.supportsSearch)
    );
  });
  const activeJob = selectedJob ?? jobs[0] ?? null;
  const results =
    selectedJob?.results ??
    (activeJob
      ? await prisma.directoryResult.findMany({
          where: { jobId: activeJob.id },
          orderBy: [{ status: "asc" }, { companyName: "asc" }],
          include: {
            lead: {
              select: {
                id: true,
                companyName: true
              }
            }
          }
        })
      : []);

  return (
    <>
      <PageHeader
        title="Datensammlung"
        description="Suchauftraege starten, Ergebnisse pruefen und passende Eintraege als Leads uebernehmen."
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        {sortedProviders.map((provider) => {
          const ready =
            provider.status === DirectoryProviderStatus.APPROVED &&
            !provider.requiresManualApproval &&
            Boolean(
              getDirectoryProviderDefinition(provider.key)?.implemented &&
              getDirectoryProviderDefinition(provider.key)?.supportsSearch
            );
          const reviewItems = [
            {
              name: "robotsTxtReviewed",
              label: "robots.txt geprueft",
              value: provider.robotsTxtReviewedAt
            },
            {
              name: "termsReviewed",
              label: "Nutzungsbedingungen geprueft",
              value: provider.termsReviewedAt
            },
            {
              name: "licensedAccessReviewed",
              label: "API/Lizenzzugang geprueft",
              value: provider.licensedAccessReviewedAt
            },
            {
              name: "privacyReviewed",
              label: "Datenschutz und Verwendungszweck geprueft",
              value: provider.privacyReviewedAt
            },
            {
              name: "reviewCompleted",
              label: "Freigabeentscheidung dokumentiert",
              value: provider.reviewCompletedAt
            }
          ];
          const updateProviderWithKey = updateDirectoryProviderConfig.bind(null);

          return (
            <article
              className="rounded-lg border border-line bg-white p-5 shadow-sm"
              key={provider.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{provider.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {ready ? "Abrufe moeglich" : "Noch nicht fuer Abrufe freigegeben"}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    ready ? "bg-teal-50 text-brand" : "bg-amber-50 text-amber-900"
                  }`}
                >
                  {providerStatusLabels[provider.status]}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Max. Ergebnisse</dt>
                  <dd className="font-medium text-ink">{provider.maxResultsPerJob}</dd>
                </div>
                <div>
                  <dt className="text-muted">Pause je Abruf</dt>
                  <dd className="font-medium text-ink">{provider.crawlDelaySeconds}s</dd>
                </div>
              </dl>
              {!getDirectoryProviderDefinition(provider.key)?.implemented ? (
                <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Diese Quelle ist nur vorbereitet. Ein echter Adapter wird erst nach dokumentierter
                  Freigabe implementiert.
                </p>
              ) : null}
              <div className="mt-4 rounded-md border border-line">
                <div className="border-b border-line bg-field px-3 py-2 text-sm font-semibold text-ink">
                  Provider-Pruefung
                </div>
                <div className="divide-y divide-line">
                  {reviewItems.map((item) => (
                    <label
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      key={item.name}
                    >
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <input
                          className="h-4 w-4"
                          defaultChecked={Boolean(item.value)}
                          form={`provider-${provider.key}`}
                          name={item.name}
                          type="checkbox"
                        />
                        {item.label}
                      </span>
                      <span className="text-muted">{reviewedLabel(item.value)}</span>
                    </label>
                  ))}
                </div>
              </div>
              {provider.notes ? (
                <p className="mt-4 rounded-md bg-field p-3 text-sm text-muted">{provider.notes}</p>
              ) : null}
              <form
                action={updateProviderWithKey}
                className="mt-4 grid gap-3 sm:grid-cols-2"
                id={`provider-${provider.key}`}
              >
                <input name="key" type="hidden" value={provider.key} />
                <label className="block">
                  <span className="text-sm font-medium text-ink">Status</span>
                  <select
                    className="mt-1 w-full rounded-md border border-line px-3 py-2"
                    defaultValue={provider.status}
                    name="status"
                  >
                    {Object.entries(providerStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink">Max. Ergebnisse</span>
                  <input
                    className="mt-1 w-full rounded-md border border-line px-3 py-2"
                    defaultValue={provider.maxResultsPerJob}
                    max="500"
                    min="1"
                    name="maxResultsPerJob"
                    type="number"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink">Pause je Abruf in Sekunden</span>
                  <input
                    className="mt-1 w-full rounded-md border border-line px-3 py-2"
                    defaultValue={provider.crawlDelaySeconds}
                    max="3600"
                    min="0"
                    name="crawlDelaySeconds"
                    type="number"
                  />
                </label>
                <label className="flex items-end gap-2 text-sm font-medium text-ink">
                  <input
                    className="h-4 w-4"
                    defaultChecked={provider.requiresManualApproval}
                    name="requiresManualApproval"
                    type="checkbox"
                  />
                  Manuelle Freigabe noetig
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-ink">Pruefnotiz</span>
                  <textarea
                    className="mt-1 min-h-20 w-full rounded-md border border-line px-3 py-2"
                    defaultValue={provider.notes ?? ""}
                    name="notes"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button
                    className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink"
                    type="submit"
                  >
                    Provider speichern
                  </button>
                </div>
              </form>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-brand">
                {provider.websiteUrl ? (
                  <a href={provider.websiteUrl} rel="noreferrer" target="_blank">
                    Website
                  </a>
                ) : null}
                {provider.robotsTxtUrl ? (
                  <a href={provider.robotsTxtUrl} rel="noreferrer" target="_blank">
                    robots.txt
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      {searchableProviders.length > 0 ? (
        <section className="mb-6 rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-ink">Neuen Suchauftrag starten</h2>
          <form action={startCollectionJob} className="grid gap-4 lg:grid-cols-6">
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-ink">Quelle</span>
              <select
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                name="provider"
              >
                {searchableProviders.map((provider) => (
                  <option key={provider.key} value={provider.key}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-ink">Branche</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue="Dachdecker"
                name="industry"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Limit</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue="10"
                max="50"
                min="1"
                name="limit"
                type="number"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Land</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue="Deutschland"
                name="country"
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-ink">Bundesland</span>
              <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="state" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-ink">Stadt</span>
              <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="city" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">PLZ</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                name="postalCode"
              />
            </label>
            <div className="flex items-end">
              <button
                className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-teal-800"
                type="submit"
              >
                Suche starten
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="mb-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">11880 manuell suchen</h2>
        <form action="/datensammlung" className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="text-sm font-medium text-ink">Branche</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              defaultValue={search11880Industry || "Dachdecker"}
              name="q11880"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Ort</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              defaultValue={search11880Location}
              name="loc11880"
              placeholder="z.B. Bonn"
            />
          </label>
          <div className="flex items-end">
            <button
              className="rounded-md border border-line px-4 py-2 font-semibold text-ink"
              type="submit"
            >
              Suchlink erstellen
            </button>
          </div>
        </form>
        {search11880PreviewResult ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">11880-Vorschau</p>
            <p className="mt-1">
              Erste Trefferseite aus 11880. Bitte nur einzelne passende Firmen uebernehmen.
            </p>
            {search11880PreviewResult.url ? (
              <a
                className="mt-3 inline-block rounded-md border border-amber-300 bg-white px-3 py-2 font-semibold text-amber-950"
                href={search11880PreviewResult.url}
                rel="noreferrer"
                target="_blank"
              >
                Original bei 11880 oeffnen
              </a>
            ) : null}
            {"error" in search11880PreviewResult ? (
              <p className="mt-3 font-semibold text-red-800">{search11880PreviewResult.error}</p>
            ) : null}
          </div>
        ) : null}
        {search11880PreviewResult?.companies.length ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[900px] border-collapse bg-white text-left text-sm">
              <thead className="bg-field text-xs uppercase text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Firma</th>
                  <th className="px-5 py-3 font-semibold">Adresse</th>
                  <th className="px-5 py-3 font-semibold">Kontakt</th>
                  <th className="px-5 py-3 font-semibold">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {search11880PreviewResult.companies.map((company) => (
                  <tr
                    className="border-t border-line"
                    key={company.sourceUrl ?? company.companyName}
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{company.companyName}</p>
                      {company.sourceUrl ? (
                        <a
                          className="mt-1 inline-block text-xs font-semibold text-brand hover:underline"
                          href={company.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          11880-Eintrag
                        </a>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-muted">
                      <p>{company.street || "-"}</p>
                      <p>{[company.postalCode, company.city].filter(Boolean).join(" ") || "-"}</p>
                    </td>
                    <td className="px-5 py-4 text-muted">
                      <p>{company.email || "Keine E-Mail"}</p>
                      <p>{company.phone || "Keine Telefonnummer"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <form action={convertPreviewResult}>
                        {Object.entries({
                          companyName: company.companyName,
                          industry: company.industry,
                          street: company.street,
                          postalCode: company.postalCode,
                          city: company.city,
                          state: company.state,
                          country: company.country,
                          phone: company.phone,
                          email: company.email,
                          website: company.website,
                          source: company.source,
                          sourceUrl: company.sourceUrl
                        }).map(([name, value]) => (
                          <input key={name} name={name} type="hidden" value={value ?? ""} />
                        ))}
                        <button
                          className="rounded-md bg-brand px-3 py-2 font-semibold text-white"
                          type="submit"
                        >
                          +
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="mb-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">CSV-Daten importieren</h2>
        <form action={importDirectoryCsv} className="grid gap-4 lg:grid-cols-6">
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-ink">Quelle / Lizenzhinweis</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              defaultValue="Manueller CSV-Import"
              name="sourceName"
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
            <span className="text-sm font-medium text-ink">Land</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              defaultValue="Deutschland"
              name="country"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Limit</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              defaultValue="100"
              max="500"
              min="1"
              name="limit"
              type="number"
            />
          </label>
          <label className="block lg:col-span-5">
            <span className="text-sm font-medium text-ink">CSV-Datei</span>
            <input
              accept=".csv,text/csv"
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              name="file"
              required
              type="file"
            />
          </label>
          <div className="flex items-end">
            <button
              className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-teal-800"
              type="submit"
            >
              Importieren
            </button>
          </div>
        </form>
        <p className="mt-3 text-sm text-muted">
          Erkannte Spalten: Firma, Branche, Strasse, PLZ, Stadt, Bundesland, Telefon, E-Mail,
          Website und Quell-URL.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <aside className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-ink">Suchauftraege</h2>
          <div className="space-y-2">
            {jobs.map((job) => (
              <Link
                className={`block rounded-md border px-3 py-3 text-sm transition hover:border-brand ${
                  activeJob?.id === job.id ? "border-brand bg-teal-50" : "border-line"
                }`}
                href={`/datensammlung?job=${job.id}`}
                key={job.id}
              >
                <span className="block font-semibold text-ink">{job.industry}</span>
                <span className="mt-1 block text-muted">
                  {job.city || job.state || job.country} · {jobStatusLabels[job.status]}
                </span>
                <span className="mt-1 block text-muted">{job._count.results} Ergebnisse</span>
              </Link>
            ))}
            {jobs.length === 0 ? (
              <p className="text-sm text-muted">Noch keine Suchauftraege.</p>
            ) : null}
          </div>
        </aside>

        <section className="rounded-lg border border-line bg-white shadow-sm">
          <div className="border-b border-line p-5">
            <h2 className="text-lg font-semibold text-ink">
              {activeJob
                ? `${activeJob.industry} in ${activeJob.city || activeJob.state || activeJob.country}`
                : "Ergebnisse"}
            </h2>
            {activeJob ? (
              <p className="mt-1 text-sm text-muted">
                Quelle {activeJob.provider} · {jobStatusLabels[activeJob.status]}
                {activeJob.error ? ` · ${activeJob.error}` : ""}
              </p>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-field text-xs uppercase text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Firma</th>
                  <th className="px-5 py-3 font-semibold">Kontakt</th>
                  <th className="px-5 py-3 font-semibold">Website</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => {
                  const convertWithId = convertDirectoryResult.bind(null, result.id);
                  const ignoreWithId = ignoreDirectoryResult.bind(null, result.id);

                  return (
                    <tr className="border-t border-line" key={result.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink">{result.companyName}</p>
                        <p className="mt-1 text-muted">
                          {[result.street, result.postalCode, result.city]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        {result.duplicateReason ? (
                          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
                            {result.duplicateReason}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-muted">
                        <p>{result.email || "Keine E-Mail"}</p>
                        <p>{result.phone || "Keine Telefonnummer"}</p>
                      </td>
                      <td className="px-5 py-4 text-muted">{result.website || "Keine Website"}</td>
                      <td className="px-5 py-4">{resultStatusLabels[result.status]}</td>
                      <td className="px-5 py-4">
                        {result.lead ? (
                          <Link
                            className="font-semibold text-brand hover:underline"
                            href={`/leads/${result.lead.id}`}
                          >
                            Lead oeffnen
                          </Link>
                        ) : (
                          <div className="flex gap-2">
                            <form action={convertWithId}>
                              <button
                                className="rounded-md bg-brand px-3 py-2 font-semibold text-white disabled:opacity-60"
                                disabled={result.status === DirectoryResultStatus.DUPLICATE}
                                title="Als Lead uebernehmen"
                                type="submit"
                              >
                                +
                              </button>
                            </form>
                            <form action={ignoreWithId}>
                              <button
                                className="rounded-md border border-line px-3 py-2 font-semibold text-ink"
                                type="submit"
                              >
                                Ignorieren
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {results.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-muted" colSpan={5}>
                      Noch keine Ergebnisse vorhanden.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
