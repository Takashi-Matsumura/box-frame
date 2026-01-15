"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface LanguageSwitcherProps {
  currentLanguage: string;
  translations: {
    title: string;
    description: string;
    english: string;
    japanese: string;
    current: string;
    saveButton: string;
    saved: string;
  };
}

export function LanguageSwitcher({
  currentLanguage,
  translations,
}: LanguageSwitcherProps) {
  const [language, setLanguage] = useState(currentLanguage);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/user/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });

      if (!response.ok) {
        throw new Error("Failed to save language preference");
      }

      setMessage(translations.saved);

      // Reload the page to apply the new language
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error saving language:", error);
      setMessage("Failed to save language preference");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">{translations.title}</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {translations.description}
      </p>

      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium mb-3">
            {translations.current}:{" "}
            <strong>{language === "en" ? "English" : "日本語"}</strong>
          </Label>

          <div className="space-y-2">
            <label className="flex items-center p-3 border rounded-lg hover:bg-muted cursor-pointer">
              <input
                type="radio"
                name="language"
                value="en"
                checked={language === "en"}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-4 h-4 text-primary"
              />
              <span className="ml-3 font-medium">{translations.english}</span>
            </label>

            <label className="flex items-center p-3 border rounded-lg hover:bg-muted cursor-pointer">
              <input
                type="radio"
                name="language"
                value="ja"
                checked={language === "ja"}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-4 h-4 text-primary"
              />
              <span className="ml-3 font-medium">{translations.japanese}</span>
            </label>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || language === currentLanguage}
          loading={isSaving}
        >
          {translations.saveButton}
        </Button>

        {message && (
          <Alert
            variant={message.includes("Failed") ? "destructive" : "default"}
            className={
              message.includes("Failed")
                ? ""
                : "border-green-200 bg-green-50 text-green-800"
            }
          >
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
