"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { templateTranslations } from "./translations";

interface TemplateClientProps {
  language: "en" | "ja";
  userName: string;
  userRole: string;
}

/**
 * テンプレートクライアントコンポーネント
 *
 * このコンポーネントは、新しいページを作成する際のテンプレートです。
 * "use client" ディレクティブにより、クライアントサイドで動作します。
 *
 * ## 主な機能
 * - 多言語対応（translations.ts を使用）
 * - ユーザ情報の表示
 * - UI コンポーネントの使用例
 */
export function TemplateClient({
  language,
  userName,
  userRole,
}: TemplateClientProps) {
  const t = templateTranslations[language];

  return (
    <div className="space-y-6">
      {/* ヘッダーセクション */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.pageTitle}</h1>
        <p className="text-muted-foreground mt-1">{t.description}</p>
      </div>

      {/* ウェルカムカード */}
      <Card className="bg-primary border-0">
        <CardContent className="py-6">
          <div className="text-primary-foreground">
            <h2 className="text-xl font-bold mb-2">{t.welcomeMessage}</h2>
            <p className="opacity-80">
              {language === "ja" ? "ログインユーザ" : "Logged in as"}: {userName} (
              {userRole})
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 機能リスト */}
      <Card>
        <CardHeader>
          <CardTitle>{t.features}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            {t.featureList.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* はじめにセクション */}
      <Card>
        <CardHeader>
          <CardTitle>{t.gettingStarted}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t.gettingStartedText}</p>
        </CardContent>
      </Card>

      {/* サンプルカード */}
      <Card>
        <CardHeader>
          <CardTitle>{t.sampleCard}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t.sampleCardContent}</p>
        </CardContent>
      </Card>
    </div>
  );
}
