import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-canvas px-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl shadow-black/50">
        <CardHeader className="border-b border-border pb-4 text-center">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-primary">
            TimeLex
          </p>
          <CardTitle className="mt-2 text-2xl font-semibold text-foreground">
            Firm workspace
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Secure multi-tenant legal time capture
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">{children}</CardContent>
      </Card>
    </div>
  );
}
