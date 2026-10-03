import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { ToasterProvider } from "@/components/providers/toaster-provider";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TimeLex",
  description:
    "Prototype multi-tenant time-entry review for law firms, with a simulated Ghost Practice export",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full dark", inter.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthSessionProvider>
          <ToasterProvider>{children}</ToasterProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
