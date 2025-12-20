"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { templateManagerTranslations } from "./translations";

interface TemplateManagerClientProps {
  language: "en" | "ja";
  userName: string;
  userRole: string;
}

/**
 * マネージャー向けテンプレートクライアントコンポーネント
 *
 * MANAGERおよびADMINロールがアクセスできるページのテンプレートです。
 * チーム管理、承認ワークフロー、分析ダッシュボードなどの
 * マネージャーレベルの機能を実装する際の参考にしてください。
 */
export function TemplateManagerClient({
  language,
  userName,
  userRole,
}: TemplateManagerClientProps) {
  const t = templateManagerTranslations[language];

  return (
    <div className="space-y-6">
      {/* ヘッダーセクション */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.pageTitle}</h1>
        <p className="text-muted-foreground mt-1">{t.description}</p>
      </div>

      {/* ウェルカムカード */}
      <Card className="bg-blue-600 border-0">
        <CardContent className="py-6">
          <div className="text-white">
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

      {/* 使用例 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.example}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            {t.exampleList.map((example, index) => (
              <li key={index}>{example}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
