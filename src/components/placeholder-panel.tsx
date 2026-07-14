export function PlaceholderPanel({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{text}</p>
    </section>
  );
}
