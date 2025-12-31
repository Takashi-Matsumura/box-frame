import { OpenLdapLoginForm } from "@/components/OpenLdapLoginForm";
import { OAuthButtons } from "@/components/OAuthButtons";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getLanguage } from "@/lib/i18n/get-language";
import { OpenLdapService } from "@/lib/ldap/openldap-service";
import { prisma } from "@/lib/prisma";
import { loginTranslations } from "./translations";

export default async function LoginPage() {
  // 言語設定を取得
  const language = await getLanguage();
  const t = loginTranslations[language];

  // OpenLDAP認証の有効/無効を確認
  let isOpenLdapEnabled = false;
  try {
    // OpenLDAPサーバが利用可能か確認（データベースから設定を読み込む）
    const openLdapService = await OpenLdapService.createWithDatabaseConfig();
    isOpenLdapEnabled = await openLdapService.isAvailable();
  } catch (error) {
    console.error("Failed to check OpenLDAP availability:", error);
    isOpenLdapEnabled = false;
  }

  // OAuth認証の有効/無効を確認
  let isGoogleOAuthEnabled = false;
  let isGitHubOAuthEnabled = false;
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ["google_oauth_enabled", "github_oauth_enabled"],
        },
      },
    });
    for (const setting of settings) {
      if (setting.key === "google_oauth_enabled") {
        isGoogleOAuthEnabled = setting.value === "true";
      }
      if (setting.key === "github_oauth_enabled") {
        isGitHubOAuthEnabled = setting.value === "true";
      }
    }
  } catch (error) {
    console.error("Failed to check OAuth settings:", error);
  }

  const hasOAuthEnabled = isGoogleOAuthEnabled || isGitHubOAuthEnabled;

  return (
    <div className="min-h-[calc(100vh-7rem)] flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-6">
        {/* サインインカード */}
        <Card className="shadow-xl">
          <CardContent className="pt-6">
            {/* OpenLDAPログインフォーム */}
            {isOpenLdapEnabled && (
              <OpenLdapLoginForm language={language} />
            )}

            {/* OpenLDAPとOAuthの両方が有効な場合のセパレータ */}
            {isOpenLdapEnabled && hasOAuthEnabled && (
              <div className="my-6 flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground font-medium">
                  {t.or}
                </span>
                <Separator className="flex-1" />
              </div>
            )}

            {/* OAuthボタン */}
            {hasOAuthEnabled && (
              <OAuthButtons
                googleEnabled={isGoogleOAuthEnabled}
                githubEnabled={isGitHubOAuthEnabled}
              />
            )}
          </CardContent>
        </Card>

        {/* フッター */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          © 2025 MatsBACCANO
        </p>
      </div>
    </div>
  );
}
