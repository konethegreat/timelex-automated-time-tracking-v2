"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/notify";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      notify.error("Sign-in failed", {
        description:
          "Invalid credentials or no firm workspace assigned to this account.",
      });
      return;
    }

    notify.success("Welcome back", {
      description: "Loading your executive dashboard…",
    });
    window.location.href = "/dashboard";
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-muted-foreground">
          Work email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-border bg-card focus-visible:border-primary focus-visible:ring-primary/30"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-muted-foreground">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-border bg-card focus-visible:border-primary focus-visible:ring-primary/30"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary font-semibold text-primary-foreground hover:bg-accent"
      >
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
