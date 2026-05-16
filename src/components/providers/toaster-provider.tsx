"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

/**
 * Global toast surfaces: Radix Toaster (confirmations) + Sonner (inline feedback).
 */
export function ToasterProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
      <SonnerToaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              "border border-gold/25 bg-card text-foreground shadow-xl",
            title: "text-sm font-semibold text-foreground",
            description: "text-sm text-muted-foreground",
            success: "border-gold/40",
            error: "border-destructive/50",
          },
        }}
      />
    </>
  );
}
