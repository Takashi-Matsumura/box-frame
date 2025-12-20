"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyTotpTranslations } from "./translations";

interface VerifyTotpClientProps {
  language: "en" | "ja";
}

export function VerifyTotpClient({ language }: VerifyTotpClientProps) {
  const t = verifyTotpTranslations[language];
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/verify-totp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (response.ok) {
          router.push("/dashboard");
          router.refresh();
        } else {
          const data = await response.json();
          setError(data.error || t.invalidCode);
        }
      } catch {
        setError(t.error);
      } finally {
        setIsLoading(false);
      }
    },
    [code, router, t],
  );

  const handleLogout = useCallback(async () => {
    // Clear 2FA cookie first
    await fetch("/api/auth/signout-2fa", { method: "POST" });
    // Then sign out
    await signOut({ callbackUrl: "/login" });
  }, []);

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
      setCode(value);
    },
    [],
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <CardTitle className="text-xl">{t.title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">{t.subtitle}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t.codeLabel}</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t.codePlaceholder}
                value={code}
                onChange={handleCodeChange}
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={code.length !== 6 || isLoading}
            >
              {isLoading ? t.verifying : t.verifyButton}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleLogout}
            >
              {t.logout}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
