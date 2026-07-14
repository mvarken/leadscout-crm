export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>
    </header>
  );
}
