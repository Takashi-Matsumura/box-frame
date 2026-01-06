import { getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

/**
 * LDAP Migrationモジュール
 *
 * レガシーLDAPからOpenLDAPへのLazy Migration機能を提供します。
 *
 * 認証フロー:
 * 1. ユーザーがOpenLDAPでログイン試行
 * 2. 認証失敗 & このモジュールが有効な場合
 * 3. レガシーLDAPで認証を試行
 * 4. 成功した場合、OpenLDAPに新規ユーザーを自動作成
 * 5. 会社組織(Employee)からメールで検索し、社員情報も含めて登録
 *
 * マイグレーション完了後はこのモジュールを無効化するだけで運用可能
 */
export const ldapMigrationModule: AppModule = {
  id: "ldap-migration",
  name: "LDAP Migration",
  nameJa: "LDAPマイグレーション",
  description:
    "Lazy migration from legacy LDAP to OpenLDAP during authentication",
  descriptionJa:
    "認証時にレガシーLDAPからOpenLDAPへ段階的にユーザーを移行します",
  dependencies: ["openldap"],
  icon: getModuleIcon("ldap-migration"),
  enabled: false, // デフォルトは無効（必要な期間のみ有効化）
  order: 110,
  menus: [], // メニューなし（モジュール管理画面から設定）
};
