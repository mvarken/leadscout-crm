import {
  CollectionJobStatus,
  DirectoryProviderStatus,
  DirectoryResultStatus
} from "@prisma/client";
import Link from "next/link";
import {
  convertDirectoryResult,
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
import { prisma } from "@/lib/prisma";

type DatensammlungPageProps = {
  searchParams: {
    job?: string;
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
      getDirectoryProviderDefinition(first.key)?.implemented
        ? 0
        : 1;
    const secondReady =
      second.status === DirectoryProviderStatus.APPROVED &&
      !second.requiresManualApproval &&
      getDirectoryProviderDefinition(second.key)?.implemented
        ? 0
        : 1;
    return firstReady - secondReady || first.name.localeCompare(second.name);
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
            Boolean(getDirectoryProviderDefinition(provider.key)?.implemented);
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

      <section className="mb-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Neuen Suchauftrag starten</h2>
        <form action={startCollectionJob} className="grid gap-4 lg:grid-cols-6">
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-ink">Quelle</span>
            <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="provider">
              {sortedProviders.map((provider) => {
                const ready =
                  provider.status === DirectoryProviderStatus.APPROVED &&
                  !provider.requiresManualApproval &&
                  Boolean(getDirectoryProviderDefinition(provider.key)?.implemented);

                return (
                  <option disabled={!ready} key={provider.key} value={provider.key}>
                    {provider.name}
                    {ready ? "" : " (nicht freigegeben)"}
                  </option>
                );
              })}
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
