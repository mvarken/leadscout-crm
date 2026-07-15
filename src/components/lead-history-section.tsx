"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LeadHistoryItem } from "@/lib/lead-activity-format";

type LeadHistorySectionProps = {
  leadId: string;
  initialItems: LeadHistoryItem[];
  initialHasMore: boolean;
};

function HistoryItem({ item }: { item: LeadHistoryItem }) {
  return (
    <article className="border-l-2 border-brand pl-4">
      <p className="text-sm font-semibold text-ink">{item.typeLabel}</p>
      <p className="text-xs text-muted">
        {new Date(item.createdAt).toLocaleString("de-DE")}
        {item.userName ? ` · ${item.userName}` : ""}
      </p>
      {item.oldLabel || item.newLabel ? (
        <p className="mt-2 text-sm text-muted">
          {item.oldLabel ?? ""}
          {item.oldLabel && item.newLabel ? " -> " : ""}
          {item.newLabel ?? ""}
        </p>
      ) : null}
      {item.note ? <p className="mt-2 whitespace-pre-line text-sm text-ink">{item.note}</p> : null}
    </article>
  );
}

export function LeadHistorySection({
  leadId,
  initialItems,
  initialHasMore
}: LeadHistorySectionProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !hasMore || loading) return;
    const root = scrollerRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setLoading(true);
        fetch(`/api/leads/${leadId}/activities?skip=${items.length}`)
          .then((response) => {
            if (!response.ok) throw new Error("Historie konnte nicht geladen werden.");
            return response.json() as Promise<{
              items: LeadHistoryItem[];
              hasMore: boolean;
            }>;
          })
          .then((data) => {
            setItems((current) => [...current, ...data.items]);
            setHasMore(data.hasMore);
          })
          .catch(() => {
            setHasMore(false);
          })
          .finally(() => setLoading(false));
      },
      { root, rootMargin: "120px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, items.length, leadId, loading, open]);

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-ink">Historie</h2>
        {initialHasMore ? (
          <button
            className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-field"
            type="button"
            onClick={() => setOpen(true)}
          >
            Alles anzeigen
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        {initialItems.length > 0 ? (
          initialItems.map((item) => <HistoryItem item={item} key={item.id} />)
        ) : (
          <p className="text-sm text-muted">Noch keine Historie vorhanden.</p>
        )}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="flex max-h-[86vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-ink">Vollstaendige Historie</h3>
                <p className="text-sm text-muted">
                  Weitere Eintraege werden beim Scrollen geladen.
                </p>
              </div>
              <button
                className="rounded-md border border-line p-2 text-ink hover:bg-field"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Historie schliessen"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <HistoryItem item={item} key={item.id} />
                ))}
                {loading ? (
                  <p className="text-sm text-muted">Weitere Historie wird geladen...</p>
                ) : null}
                <div ref={sentinelRef} />
                {!hasMore ? <p className="text-sm text-muted">Alle Eintraege geladen.</p> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
