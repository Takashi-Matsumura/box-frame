import { getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

/**
 * テンプレートモジュール
 *
 * このモジュールは、カスタムモジュールを作成する際のテンプレートです。
 * 新しいモジュールを作成する場合は、このファイルをコピーして編集してください。
 *
 * ## 作成手順
 * 1. lib/addon-modules/ に新しいフォルダを作成（例: lib/addon-modules/mymodule/）
 * 2. このファイルをコピーして module.tsx として保存
 * 3. モジュールID、名前、メニューを編集
 * 4. lib/modules/registry.tsx でモジュールをインポート・登録
 * 5. app/(menus)/ 配下にページを作成
 * 6. （任意）lib/modules/icons.tsx にアイコンを追加
 */
export const templateModule: AppModule = {
  // === モジュール基本情報 ===
  id: "template", // 一意のモジュールID（英数字、ケバブケース推奨）
  name: "Template Module", // 英語名
  nameJa: "テンプレートモジュール", // 日本語名
  description: "A template module for creating custom modules", // 英語説明
  descriptionJa: "カスタムモジュールを作成するためのテンプレート", // 日本語説明

  // === アイコン ===
  // lib/modules/icons.tsx で定義したアイコンを使用
  // 未定義の場合はデフォルトアイコンが表示されます
  icon: getModuleIcon("template"),

  // === モジュール設定 ===
  enabled: true, // モジュールの有効/無効（falseで非表示）
  order: 50, // 表示順序（小さいほど上に表示）
  dependencies: ["system"], // 依存するモジュールのID配列

  // === メニュー定義 ===
  menus: [
    // --- ユーザ向けメニュー ---
    {
      id: "templateHome", // メニューID（モジュール内で一意）
      moduleId: "template", // 親モジュールのID
      name: "Template", // 英語名
      nameJa: "テンプレート", // 日本語名
      path: "/template", // URLパス
      menuGroup: "user", // メニューグループ: "user" | "manager" | "admin"
      requiredRoles: ["USER", "MANAGER", "ADMIN"], // アクセス可能なロール
      enabled: true, // メニューの有効/無効
      order: 10, // グループ内の表示順序
      description: "Template page for users",
      descriptionJa: "ユーザ向けテンプレートページ",
    },

    // --- 管理者向けメニュー ---
    {
      id: "templateAdmin",
      moduleId: "template",
      name: "Template Settings",
      nameJa: "テンプレート設定",
      path: "/admin/template",
      menuGroup: "admin",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 60,
      description: "Template settings for administrators",
      descriptionJa: "管理者向けテンプレート設定",
    },

    // --- サブメニュー例（コメントアウト） ---
    // {
    //   id: "templateSub",
    //   moduleId: "template",
    //   name: "Sub Menu",
    //   nameJa: "サブメニュー",
    //   path: "/template/sub",
    //   menuGroup: "user",
    //   requiredRoles: ["USER", "MANAGER", "ADMIN"],
    //   enabled: true,
    //   order: 11,
    //   // 親メニューのIDを指定するとサブメニューになります
    //   // parentId: "templateHome",
    // },
  ],
};
