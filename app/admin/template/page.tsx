import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { TemplateAdminClient } from "./TemplateAdminClient";
import { templateAdminTranslations } from "./translations";

/**
 * ページメタデータの生成
 */
export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = templateAdminTranslations[language];

  return {
    title: t.title,
  };
}

/**
 * テンプレート管理ページ（サーバコンポーネント）
 *
 * 管理者専用ページのテンプレートです。
 * ADMIN ロール以外のユーザはダッシュボードにリダイレクトされます。
 */
export default async function TemplateAdminPage() {
  // 1. セッション確認
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  // 2. ADMINロールのチェック
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // 3. 言語設定を取得
  const language = await getLanguage();

  // 4. ユーザ情報を取得
  const userName =
    session.user.name || session.user.email?.split("@")[0] || "User";
  const userRole = session.user.role || "ADMIN";

  // 5. クライアントコンポーネントをレンダリング
  return (
    <div className="max-w-7xl mx-auto">
      <TemplateAdminClient
        language={language as "en" | "ja"}
        userName={userName}
        userRole={userRole}
      />
    </div>
  );
}
