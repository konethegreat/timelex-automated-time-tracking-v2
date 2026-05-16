export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
