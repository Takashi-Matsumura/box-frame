"use client";

import { useCallback, useState } from "react";
import { RiAlertLine, RiCheckLine, RiCloseLine, RiArrowDownSLine } from "react-icons/ri";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordChangeTranslations {
  title: string;
  description: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  changeButton: string;
  success: string;
  error: string;
  passwordMismatch: string;
  passwordTooShort: string;
  mustChangeWarning: string;
}

interface PasswordChangeSectionProps {
  translations: PasswordChangeTranslations;
  mustChangePassword: boolean;
  onPasswordChanged?: () => void;
}

export function PasswordChangeSection({
  translations: t,
  mustChangePassword,
  onPasswordChanged,
}: PasswordChangeSectionProps) {
  // アコーディオンの開閉状態（パスワード変更必須の場合は初期状態で開く）
  const [isExpanded, setIsExpanded] = useState(mustChangePassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(false);

      // バリデーション
      if (newPassword.length < 8) {
        setError(t.passwordTooShort);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError(t.passwordMismatch);
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword: mustChangePassword ? undefined : currentPassword,
            newPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.errorJa || data.error || t.error);
          return;
        }

        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onPasswordChanged?.();
      } catch {
        setError(t.error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      currentPassword,
      newPassword,
      confirmPassword,
      mustChangePassword,
      t,
      onPasswordChanged,
    ],
  );

  return (
    <div>
      {/* アコーディオンヘッダー */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold">{t.title}</h3>
          {mustChangePassword && (
            <Badge variant="destructive">!</Badge>
          )}
        </div>
        <RiArrowDownSLine
          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>
      <p className="text-sm text-muted-foreground mt-1">{t.description}</p>

      {/* アコーディオンコンテンツ */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[800px] opacity-100 mt-4" : "max-h-0 opacity-0"
        }`}
      >
        {mustChangePassword && (
          <Alert variant="default" className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
            <RiAlertLine className="h-4 w-4" />
            <AlertDescription>{t.mustChangeWarning}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default" className="mb-4 border-green-200 bg-green-50 text-green-800">
            <RiCheckLine className="h-4 w-4" />
            <AlertDescription>{t.success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <RiCloseLine className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!mustChangePassword && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t.currentPassword}</Label>
              <Input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required={!mustChangePassword}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">{t.newPassword}</Label>
            <Input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
            <Input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
            {t.changeButton}
          </Button>
        </form>
      </div>
    </div>
  );
}
