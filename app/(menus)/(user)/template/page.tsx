import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { TemplateClient } from "./TemplateClient";
import { templateTranslations } from "./translations";

/**
 * ページメタデータの生成
 * 言語に応じたタイトルを設定します
 */
export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = templateTranslations[language];

  return {
    title: t.title,
  };
}

/**
 * テンプレートページ（サーバコンポーネント）
 *
 * このファイルは、新しいページを作成する際のテンプレートです。
 *
 * ## 主な役割
 * 1. 認証チェック（セッション確認）
 * 2. アクセス権限チェック（ロールベース）
 * 3. サーバサイドデータ取得（Prisma など）
 * 4. クライアントコンポーネントへのデータ渡し
 *
 * ## 注意点
 * - このファイルはサーバサイドで実行されます
 * - "use client" は使用しません
 * - データベースアクセスはここで行います
 */
export default async function TemplatePage() {
  // 1. セッション確認
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  // 2. 言語設定を取得
  const language = await getLanguage();

  // 3. ユーザ情報を取得
  const userName =
    session.user.name || session.user.email?.split("@")[0] || "User";
  const userRole = session.user.role || "USER";

  // 4. クライアントコンポーネントをレンダリング
  return (
    <div className="max-w-7xl mx-auto">
      <TemplateClient
        language={language as "en" | "ja"}
        userName={userName}
        userRole={userRole}
      />
    </div>
  );
}
