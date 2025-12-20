import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { TemplateManagerClient } from "./TemplateManagerClient";
import { templateManagerTranslations } from "./translations";

/**
 * ページメタデータの生成
 */
export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = templateManagerTranslations[language];

  return {
    title: t.title,
  };
}

/**
 * マネージャー向けテンプレートページ（サーバコンポーネント）
 *
 * MANAGERまたはADMINロール専用ページのテンプレートです。
 * それ以外のロールはダッシュボードにリダイレクトされます。
 */
export default async function TemplateManagerPage() {
  // 1. セッション確認
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  // 2. MANAGERまたはADMINロールのチェック
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // 3. 言語設定を取得
  const language = await getLanguage();

  // 4. ユーザ情報を取得
  const userName =
    session.user.name || session.user.email?.split("@")[0] || "User";
  const userRole = session.user.role || "USER";

  // 5. クライアントコンポーネントをレンダリング
  return (
    <div className="max-w-7xl mx-auto">
      <TemplateManagerClient
        language={language as "en" | "ja"}
        userName={userName}
        userRole={userRole}
      />
    </div>
  );
}
