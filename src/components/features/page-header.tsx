export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="border-b border-border bg-canvas/80 px-8 py-6 backdrop-blur-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {description ? (
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  );
}
