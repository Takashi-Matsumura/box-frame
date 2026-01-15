"use client";

import { useCallback, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TwoFactorTranslations {
  title: string;
  description: string;
  enabled: string;
  disabled: string;
  enable: string;
  disable: string;
  setupTitle: string;
  setupDescription: string;
  manualEntry: string;
  verifyTitle: string;
  verifyDescription: string;
  verifyButton: string;
  disableTitle: string;
  disableDescription: string;
  disableButton: string;
  cancel: string;
  success: string;
  disableSuccess: string;
  invalidCode: string;
  error: string;
}

interface TwoFactorSectionProps {
  isEnabled: boolean;
  translations: TwoFactorTranslations;
  onStatusChange: () => void;
}

type SetupStep = "idle" | "setup" | "verify" | "disable";

export function TwoFactorSection({
  isEnabled,
  translations: t,
  onStatusChange,
}: TwoFactorSectionProps) {
  const [step, setStep] = useState<SetupStep>("idle");
  const [secret, setSecret] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const startSetup = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/two-factor/setup", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to start setup");
      }

      const data = await response.json();
      setSecret(data.secret);
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setStep("setup");
    } catch (_error) {
      setMessage({ type: "error", text: t.error });
    } finally {
      setIsLoading(false);
    }
  }, [t.error]);

  const verifyAndEnable = useCallback(async () => {
    if (code.length !== 6) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/two-factor/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, code }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === "Invalid verification code") {
          setMessage({ type: "error", text: t.invalidCode });
        } else {
          setMessage({ type: "error", text: t.error });
        }
        return;
      }

      setMessage({ type: "success", text: t.success });
      setStep("idle");
      setCode("");
      setSecret("");
      setQrCodeDataUrl("");
      onStatusChange();
    } catch (_error) {
      setMessage({ type: "error", text: t.error });
    } finally {
      setIsLoading(false);
    }
  }, [code, secret, t, onStatusChange]);

  const verifyAndDisable = useCallback(async () => {
    if (code.length !== 6) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/two-factor/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === "Invalid verification code") {
          setMessage({ type: "error", text: t.invalidCode });
        } else {
          setMessage({ type: "error", text: t.error });
        }
        return;
      }

      setMessage({ type: "success", text: t.disableSuccess });
      setStep("idle");
      setCode("");
      onStatusChange();
    } catch (_error) {
      setMessage({ type: "error", text: t.error });
    } finally {
      setIsLoading(false);
    }
  }, [code, t, onStatusChange]);

  const cancel = useCallback(() => {
    setStep("idle");
    setCode("");
    setSecret("");
    setQrCodeDataUrl("");
    setMessage(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t.title}</h3>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>
        <Badge variant={isEnabled ? "default" : "secondary"}>
          {isEnabled ? t.enabled : t.disabled}
        </Badge>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {step === "idle" && (
        <Button
          onClick={isEnabled ? () => setStep("disable") : startSetup}
          disabled={isLoading}
          variant={isEnabled ? "danger" : "default"}
          loading={isLoading}
        >
          {isEnabled ? t.disable : t.enable}
        </Button>
      )}

      {step === "setup" && (
        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold">{t.setupTitle}</h4>
          <p className="text-sm text-muted-foreground">{t.setupDescription}</p>

          {qrCodeDataUrl && (
            <div className="flex justify-center">
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                className="w-48 h-48 border rounded-lg bg-white p-2"
              />
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {t.manualEntry}
            </p>
            <code className="px-3 py-2 bg-background rounded text-sm font-mono select-all border">
              {secret}
            </code>
          </div>

          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={cancel}>
              {t.cancel}
            </Button>
            <Button onClick={() => setStep("verify")}>次へ</Button>
          </div>
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold">{t.verifyTitle}</h4>
          <p className="text-sm text-muted-foreground">{t.verifyDescription}</p>

          <Input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            placeholder="000000"
            className="text-center text-2xl font-mono tracking-widest"
          />

          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={cancel}>
              {t.cancel}
            </Button>
            <Button
              onClick={verifyAndEnable}
              disabled={code.length !== 6}
              loading={isLoading}
            >
              {t.verifyButton}
            </Button>
          </div>
        </div>
      )}

      {step === "disable" && (
        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold">{t.disableTitle}</h4>
          <p className="text-sm text-muted-foreground">
            {t.disableDescription}
          </p>

          <Input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            placeholder="000000"
            className="text-center text-2xl font-mono tracking-widest"
          />

          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={cancel}>
              {t.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={verifyAndDisable}
              disabled={code.length !== 6}
              loading={isLoading}
            >
              {t.disableButton}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
