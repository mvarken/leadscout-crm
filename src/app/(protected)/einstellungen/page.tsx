import { BlocklistType } from "@prisma/client";
import {
  createBlocklistEntry,
  deactivateBlocklistEntry,
  sendSmtpTest,
  updateSmtpSettings
} from "@/app/(protected)/einstellungen/actions";
import { PageHeader } from "@/components/page-header";
import { getSmtpSettingsForForm, getSmtpStatus } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

const blocklistTypeLabels: Record<BlocklistType, string> = {
  DOMAIN: "Domain",
  EMAIL: "E-Mail",
  PHONE: "Telefon",
  COMPANY: "Firma"
};

export default async function EinstellungenPage() {
  const [entries, smtpSettings, smtpStatus] = await Promise.all([
    prisma.blocklistEntry.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { value: "asc" }]
    }),
    getSmtpSettingsForForm(),
    getSmtpStatus()
  ]);

  return (
    <>
      <PageHeader
        title="Einstellungen"
        description="Administrative Grundeinstellungen und Ausschlussliste fuer Datensammlung und Leadanlage."
      />

      <section className="mb-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">SMTP-Einstellungen</h2>
            <p className="mt-1 text-sm text-muted">
              {smtpStatus.configured
                ? "E-Mail-Versand ist bereit."
                : `Noch nicht bereit: ${smtpStatus.missing.join(", ")}.`}
            </p>
          </div>
          <span
            className={`w-fit rounded-md px-3 py-2 text-sm font-semibold ${
              smtpStatus.configured
                ? "bg-emerald-50 text-emerald-800"
                : "bg-amber-50 text-amber-900"
            }`}
          >
            {smtpStatus.configured ? "Aktiv" : "Offen"}
          </span>
        </div>
        <form action={updateSmtpSettings} className="grid gap-4 lg:grid-cols-2">
          <label className="flex items-center gap-3 rounded-md border border-line bg-field p-3 text-sm lg:col-span-2">
            <input defaultChecked={smtpSettings?.enabled ?? false} name="enabled" type="checkbox" />
            <span className="font-semibold text-ink">SMTP-Versand aktivieren</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">SMTP-Server</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              defaultValue={smtpSettings?.host ?? ""}
              name="host"
              placeholder="smtp.example.com"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Port</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                defaultValue={smtpSettings?.port ?? 587}
                name="port"
                type="number"
              />
            </label>
            <label className="mt-6 flex items-center gap-3 rounded-md border border-line bg-field p-3 text-sm">
              <input defaultChecked={smtpSettings?.secure ?? false} name="secure" type="checkbox" />
              <span className="font-semibold text-ink">SSL/TLS</span>
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-ink">Benutzer</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              defaultValue={smtpSettings?.user ?? ""}
              name="user"
              placeholder="mail@example.com"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Passwort</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              name="password"
              placeholder={smtpSettings?.password ? "Vorhandenes Passwort bleibt erhalten" : ""}
              type="password"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Absender E-Mail</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              defaultValue={smtpSettings?.fromEmail ?? ""}
              name="fromEmail"
              placeholder="info@example.com"
              type="email"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Absender Name</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              defaultValue={smtpSettings?.fromName ?? ""}
              name="fromName"
              placeholder="LeadScout CRM"
            />
          </label>
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-ink">Antwort an</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              defaultValue={smtpSettings?.replyTo ?? ""}
              name="replyTo"
              placeholder="antwort@example.com"
              type="email"
            />
          </label>
          <div className="lg:col-span-2">
            <button
              className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-teal-800"
              type="submit"
            >
              SMTP speichern
            </button>
          </div>
        </form>
        <div className="mt-5 border-t border-line pt-5">
          <h3 className="text-sm font-semibold text-ink">Testmail senden</h3>
          <form action={sendSmtpTest} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="text-sm font-medium text-ink">Empfaenger</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                name="testEmail"
                placeholder="deine-email@example.com"
                required
                type="email"
              />
            </label>
            <div className="flex items-end">
              <button
                className="rounded-md border border-line px-4 py-2 font-semibold text-ink hover:bg-field"
                type="submit"
              >
                Testmail senden
              </button>
            </div>
          </form>
        </div>
      </section>

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
