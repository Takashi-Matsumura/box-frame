"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { templateAdminTranslations } from "./translations";

interface TemplateAdminClientProps {
  language: "en" | "ja";
}

/**
 * テンプレート管理クライアントコンポーネント
 *
 * 管理者向けの設定ページのテンプレートです。
 * モジュール固有の設定機能を実装する際の参考にしてください。
 */
export function TemplateAdminClient({ language }: TemplateAdminClientProps) {
  const t = templateAdminTranslations[language];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.pageTitle}</h1>
        <p className="text-muted-foreground mt-1">{t.description}</p>
      </div>

      {/* 設定セクション */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settingsSection}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{t.settingsSectionDesc}</p>

          {/* 設定例 */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-medium text-foreground mb-2">
              {t.exampleSetting}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t.exampleSettingDesc}
            </p>
          </div>

          {/* ボタン例 */}
          <div className="flex gap-3">
            <Button variant="default">{t.save}</Button>
            <Button variant="outline">{t.cancel}</Button>
          </div>
        </CardContent>
      </Card>

      {/* 危険な操作セクション */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">{t.dangerZone}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t.dangerZoneDesc}</p>
        </CardContent>
      </Card>
    </div>
  );
}
