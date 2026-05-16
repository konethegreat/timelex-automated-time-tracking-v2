import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="space-y-6 text-center">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          TimeLex
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Multi-tenant access for your firm. Auth.js wiring is next.
        </p>
      </div>
      <p className="text-sm text-muted">
        <Link href="/dashboard" className="text-gold hover:underline">
          Continue to dashboard (dev)
        </Link>
      </p>
    </div>
  );
}
