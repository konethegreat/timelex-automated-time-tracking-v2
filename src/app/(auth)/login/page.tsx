import { LoginForm } from "@/components/features/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          TimeLex
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Secure access to your firm&apos;s time capture workspace.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
