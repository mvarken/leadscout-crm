import Link from "next/link";
import {
  createEmailTemplate,
  deactivateEmailTemplate
} from "@/app/(protected)/kommunikation/actions";
import { PageHeader } from "@/components/page-header";
import { contactChannelLabels, contactDirectionLabels } from "@/lib/communication";
import { prisma } from "@/lib/prisma";

export default async function KommunikationPage() {
  const [templates, contactLogs] = await Promise.all([
    prisma.emailTemplate.findMany({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      take: 50
    }),
    prisma.contactLog.findMany({
      orderBy: { contactedAt: "desc" },
      take: 25,
      include: {
        lead: {
          select: {
            id: true,
            companyName: true,
            city: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      }
    })
  ]);

  return (
    <>
      <PageHeader
        title="Kommunikation"
        description="E-Mail-Vorlagen verwalten und den aktuellen Kontaktverlauf ueberblicken."
      />

      <section className="mb-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Neue E-Mail-Vorlage</h2>
        <form action={createEmailTemplate} className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink">Name</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              name="name"
              placeholder="Erstkontakt WordPress"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Betreff</span>
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              name="subject"
              placeholder="Kurzer Hinweis zu Ihrer Website"
              required
            />
          </label>
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-ink">Text</span>
            <textarea
              className="mt-1 min-h-40 w-full rounded-md border border-line px-3 py-2"
              name="body"
              placeholder="Hallo {{firma}}, ..."
              required
            />
          </label>
          <div className="lg:col-span-2">
            <button
              className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-teal-800"
              type="submit"
            >
              Vorlage speichern
            </button>
          </div>
        </form>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-lg border border-line bg-white shadow-sm">
          <div className="border-b border-line p-5">
            <h2 className="text-lg font-semibold text-ink">Aktive Vorlagen</h2>
          </div>
          <div className="divide-y divide-line">
            {templates.map((template) => {
              const deactivateWithId = deactivateEmailTemplate.bind(null, template.id);

              return (
                <article className="p-5" key={template.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-ink">{template.name}</h3>
                      <p className="mt-1 text-sm text-muted">{template.subject}</p>
                    </div>
                    <form action={deactivateWithId}>
                      <button
                        className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink"
                        type="submit"
                      >
                        Deaktivieren
                      </button>
                    </form>
                  </div>
                  <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm text-muted">
                    {template.body}
                  </p>
                </article>
              );
            })}
            {templates.length === 0 ? (
              <p className="p-5 text-sm text-muted">Noch keine aktiven Vorlagen vorhanden.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white shadow-sm">
          <div className="border-b border-line p-5">
            <h2 className="text-lg font-semibold text-ink">Letzte Kontakte</h2>
          </div>
          <div className="divide-y divide-line">
            {contactLogs.map((log) => (
              <article className="p-5" key={log.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      className="font-semibold text-brand hover:underline"
                      href={`/leads/${log.lead.id}`}
                    >
                      {log.lead.companyName}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      {[log.lead.city, contactChannelLabels[log.channel]]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <p className="text-right text-xs text-muted">
                    {log.contactedAt.toLocaleString("de-DE")}
                  </p>
                </div>
                <p className="mt-3 text-sm font-medium text-ink">
                  {contactDirectionLabels[log.direction]}
                  {log.subject ? ` · ${log.subject}` : ""}
                </p>
                {log.message ? (
                  <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted">
                    {log.message}
                  </p>
                ) : null}
                {log.user?.name ? <p className="mt-2 text-xs text-muted">{log.user.name}</p> : null}
              </article>
            ))}
            {contactLogs.length === 0 ? (
              <p className="p-5 text-sm text-muted">Noch keine Kontakte protokolliert.</p>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}
