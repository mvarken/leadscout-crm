import { BlocklistType } from "@prisma/client";
import {
  createBlocklistEntry,
  deactivateBlocklistEntry
} from "@/app/(protected)/einstellungen/actions";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";

const blocklistTypeLabels: Record<BlocklistType, string> = {
  DOMAIN: "Domain",
  EMAIL: "E-Mail",
  PHONE: "Telefon",
  COMPANY: "Firma"
};

export default async function EinstellungenPage() {
  const entries = await prisma.blocklistEntry.findMany({
    where: { active: true },
    orderBy: [{ type: "asc" }, { value: "asc" }]
  });

  return (
    <>
      <PageHeader
        title="Einstellungen"
        description="Administrative Grundeinstellungen und Ausschlussliste fuer Datensammlung und Leadanlage."
      />

      <section className="mb-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Ausschlussliste erweitern</h2>
        <form
          action={createBlocklistEntry}
          className="grid gap-4 md:grid-cols-[180px_1fr_1fr_auto]"
        >
          <label className="block">
            <span className="text-sm font-medium text-ink">Typ</span>
            <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="type">
              {Object.entries(blocklistTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Wert</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              name="value"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Notiz</span>
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="note" />
          </label>
          <div className="flex items-end">
            <button
              className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-teal-800"
              type="submit"
            >
              Hinzufuegen
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line p-5">
          <h2 className="text-lg font-semibold text-ink">Aktive Ausschluesse</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-field text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Typ</th>
                <th className="px-5 py-3 font-semibold">Wert</th>
                <th className="px-5 py-3 font-semibold">Notiz</th>
                <th className="px-5 py-3 font-semibold">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const deactivateWithId = deactivateBlocklistEntry.bind(null, entry.id);

                return (
                  <tr className="border-t border-line" key={entry.id}>
                    <td className="px-5 py-4">{blocklistTypeLabels[entry.type]}</td>
                    <td className="px-5 py-4 font-medium text-ink">{entry.value}</td>
                    <td className="px-5 py-4 text-muted">{entry.note || "-"}</td>
                    <td className="px-5 py-4">
                      <form action={deactivateWithId}>
                        <button
                          className="rounded-md border border-line px-3 py-2 font-semibold text-ink"
                          type="submit"
                        >
                          Deaktivieren
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-muted" colSpan={4}>
                    Noch keine aktiven Ausschluesse.
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
