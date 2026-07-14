import { CollectionJobStatus, DirectoryResultStatus } from "@prisma/client";
import Link from "next/link";
import {
  convertDirectoryResult,
  ignoreDirectoryResult,
  startCollectionJob
} from "@/app/(protected)/datensammlung/actions";
import { PageHeader } from "@/components/page-header";
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

export default async function DatensammlungPage({ searchParams }: DatensammlungPageProps) {
  const [jobs, selectedJob] = await Promise.all([
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
      : null
  ]);

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

      <section className="mb-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Neuen Suchauftrag starten</h2>
        <form action={startCollectionJob} className="grid gap-4 lg:grid-cols-6">
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-ink">Quelle</span>
            <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="provider">
              <option value="mock-directory">Mock-Verzeichnis</option>
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
