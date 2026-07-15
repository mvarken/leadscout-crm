import { LeadActivityType } from "@prisma/client";
import { leadStatusLabels } from "@/lib/lead-utils";

export type LeadHistoryItem = {
  id: string;
  typeLabel: string;
  createdAt: string;
  userName: string | null;
  oldLabel: string | null;
  newLabel: string | null;
  note: string | null;
};

export const activityLabels: Record<LeadActivityType, string> = {
  CREATED: "Angelegt",
  UPDATED: "Aktualisiert",
  STATUS_CHANGED: "Status geaendert",
  NOTE_ADDED: "Notiz",
  WEBSITE_CHECKED: "Website geprueft",
  CONTACT_LOGGED: "Kontakt protokolliert"
};

type RawActivity = {
  id: string;
  type: LeadActivityType;
  createdAt: Date;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  user?: {
    name: string;
  } | null;
};

function statusLabel(value: string | null) {
  if (!value) return null;
  return leadStatusLabels[value as keyof typeof leadStatusLabels] ?? value;
}

export function formatLeadHistoryItem(activity: RawActivity): LeadHistoryItem {
  return {
    id: activity.id,
    typeLabel: activityLabels[activity.type],
    createdAt: activity.createdAt.toISOString(),
    userName: activity.user?.name ?? null,
    oldLabel: statusLabel(activity.oldValue),
    newLabel: statusLabel(activity.newValue),
    note: activity.note
  };
}
