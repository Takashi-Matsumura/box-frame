"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent } from "@/components/ui/card";
import { useSidebar } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { PasswordChangeSection } from "./PasswordChangeSection";
import { TwoFactorSection } from "./TwoFactorSection";
import type { settingsTranslations } from "./translations";
import { UserAccessKeySection } from "./UserAccessKeySection";

type SettingsTranslations =
  | (typeof settingsTranslations)["en"]
  | (typeof settingsTranslations)["ja"];

interface SettingsClientProps {
  language: "en" | "ja";
  translations: SettingsTranslations;
  twoFactorEnabled: boolean;
  isLdapUser: boolean;
  mustChangePassword: boolean;
}

export function SettingsClient({
  language,
  translations: t,
  twoFactorEnabled: initialTwoFactorEnabled,
  isLdapUser,
  mustChangePassword: initialMustChangePassword,
}: SettingsClientProps) {
  const { open } = useSidebar();
  const { width } = useSidebarStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as "basic" | "keys") || "basic";
  const passwordReset = searchParams.get("passwordReset") === "true";
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    initialTwoFactorEnabled,
  );
  const [mustChangePassword, setMustChangePassword] = useState(
    initialMustChangePassword,
  );

  const handleTwoFactorStatusChange = useCallback(() => {
    setTwoFactorEnabled((prev) => !prev);
  }, []);

  const handlePasswordChanged = useCallback(() => {
    setMustChangePassword(false);
    // URLからpasswordReset パラメータを削除
    if (passwordReset) {
      router.replace("/settings");
    }
  }, [passwordReset, router]);

  return (
    <>
      <style jsx global>{`
        body {
          overflow: hidden !important;
        }
      `}</style>

      <div
        className="fixed inset-0 flex flex-col bg-muted/30 transition-all duration-300"
        style={{ top: "6rem", left: open ? `${width}px` : "4rem" }}
      >
        {/* スクロール可能なコンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {activeTab === "basic" && (
              <div className="space-y-6">
                {/* Password Change Section (LDAP users only) */}
                {isLdapUser && (
                  <Card>
                    <CardContent className="pt-6">
                      <PasswordChangeSection
                        translations={t.passwordChange}
                        mustChangePassword={mustChangePassword || passwordReset}
                        onPasswordChanged={handlePasswordChanged}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Language Settings */}
                <Card>
                  <CardContent className="pt-6">
                    <LanguageSwitcher
                      currentLanguage={language}
                      translations={t.language}
                    />
                  </CardContent>
                </Card>

                {/* Two-Factor Authentication */}
                <Card>
                  <CardContent className="pt-6">
                    <TwoFactorSection
                      isEnabled={twoFactorEnabled}
                      translations={t.twoFactor}
                      onStatusChange={handleTwoFactorStatusChange}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "keys" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <UserAccessKeySection language={language} />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
