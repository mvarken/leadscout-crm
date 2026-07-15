import { ReminderStatus, ReminderType } from "@prisma/client";
import Link from "next/link";
import { completeReminder } from "@/app/(protected)/leads/actions";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";

const reminderTypeLabels: Record<ReminderType, string> = {
  FOLLOW_UP: "Nachfassen",
  WEBSITE_RECHECK: "Website erneut pruefen",
  GENERAL: "Allgemein"
};

const reminderStatusLabels: Record<ReminderStatus, string> = {
  OPEN: "Offen",
  DONE: "Erledigt"
};

export default async function WiedervorlagenPage() {
  const reminders = await prisma.reminder.findMany({
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 100,
    include: {
      lead: {
        select: {
          id: true,
          companyName: true,
          city: true,
          status: true,
          leadScore: true
        }
      }
    }
  });

  const openCount = reminders.filter((reminder) => reminder.status === ReminderStatus.OPEN).length;

  return (
    <>
      <PageHeader
        title="Wiedervorlagen"
        description="Offene Nachfass-Termine, erneute Websitepruefungen und allgemeine Aufgaben."
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Offen</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{openCount}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Gesamt</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{reminders.length}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Ueberfaellig</p>
          <p className="mt-3 text-3xl font-semibold text-ink">
            {
              reminders.filter(
                (reminder) => reminder.status === ReminderStatus.OPEN && reminder.dueAt < new Date()
              ).length
            }
          </p>
        </article>
      </section>

      <section className="rounded-lg border border-line bg-white shadow-sm">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-field text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Faellig</th>
                <th className="px-5 py-3 font-semibold">Lead</th>
                <th className="px-5 py-3 font-semibold">Aufgabe</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((reminder) => {
                const completeWithId = completeReminder.bind(null, reminder.id);

                return (
                  <tr className="border-t border-line" key={reminder.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink">
                        {reminder.dueAt.toLocaleDateString("de-DE")}
                      </p>
                      <p className="text-muted">
                        {reminder.dueAt.toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        className="font-semibold text-brand hover:underline"
                        href={`/leads/${reminder.lead.id}`}
                      >
                        {reminder.lead.companyName}
                      </Link>
                      <p className="mt-1 text-muted">
                        {[reminder.lead.city, `Score ${reminder.lead.leadScore}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink">{reminder.title}</p>
                      <p className="mt-1 text-muted">{reminderTypeLabels[reminder.type]}</p>
                      {reminder.note ? (
                        <p className="mt-2 whitespace-pre-line text-muted">{reminder.note}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">{reminderStatusLabels[reminder.status]}</td>
                    <td className="px-5 py-4">
                      {reminder.status === ReminderStatus.OPEN ? (
                        <form action={completeWithId}>
                          <button
                            className="rounded-md bg-brand px-3 py-2 font-semibold text-white"
                            type="submit"
                          >
                            Erledigt
                          </button>
                        </form>
                      ) : (
                        <span className="text-muted">Abgeschlossen</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {reminders.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-muted" colSpan={5}>
                    Noch keine Wiedervorlagen vorhanden.
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
