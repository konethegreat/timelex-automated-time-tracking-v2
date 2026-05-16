export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="border-b border-border px-8 py-6">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-muted">{description}</p>
      ) : null}
    </header>
  );
}
