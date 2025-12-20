// コアモジュール（静的インポート）
import { systemModule } from "@/lib/core-modules/system";

// アドオンモジュール
import { openldapModule } from "@/lib/addon-modules/openldap";
import { templateModule } from "@/lib/addon-modules/template";
import { prisma } from "@/lib/prisma";
import type {
  AppMenu,
  AppModule,
  MenuGroup,
  ModuleRegistry,
} from "@/types/module";

/**
 * メニューグループの定義
 * サイドバーでの表示グループ
 */
export const menuGroups: Record<string, MenuGroup> = {
  user: {
    id: "user",
    name: "USER",
    nameJa: "ユーザ",
    color: "text-cyan-700",
    order: 1,
  },
  manager: {
    id: "manager",
    name: "MANAGER",
    nameJa: "マネージャー",
    color: "text-blue-700",
    order: 2,
  },
  admin: {
    id: "admin",
    name: "ADMIN",
    nameJa: "管理者",
    color: "text-purple-700",
    order: 3,
  },
};

/**
 * 全モジュールを取得
 * moduleRegistryから有効なモジュールを動的に取得
 * メニュー順序のオーバーライドをデータベースから適用
 */
export async function getAllModules(): Promise<AppModule[]> {
  // メニュー順序のオーバーライドを取得
  const menuOrderSettings = await prisma.systemSetting.findMany({
    where: {
      key: {
        startsWith: "menu_order_",
      },
    },
  });
  const menuOrderOverrides: Record<string, number> = {};
  for (const setting of menuOrderSettings) {
    const menuId = setting.key.replace("menu_order_", "");
    menuOrderOverrides[menuId] = parseInt(setting.value, 10);
  }

  return Object.values(moduleRegistry)
    .filter((module) => module.enabled)
    .map((module) => ({
      ...module,
      menus: module.menus.map((menu) => ({
        ...menu,
        order: menuOrderOverrides[menu.id] ?? menu.order,
      })),
    }));
}

/**
 * モジュールレジストリ
 *
 * 新しいモジュールを追加する場合は、ここにインポートして登録してください。
 * 例: mymodule: myModule,
 */
export const moduleRegistry: ModuleRegistry = {
  // コアモジュール
  system: systemModule,

  // アドオンモジュール
  openldap: openldapModule,
  template: templateModule, // テンプレートモジュール（参考用）
};

/**
 * 有効なモジュールを取得
 */
export function getEnabledModules(): AppModule[] {
  return Object.values(moduleRegistry).filter((module) => module.enabled);
}

/**
 * IDでモジュールを取得
 */
export function getModuleById(id: string): AppModule | undefined {
  return moduleRegistry[id];
}

/**
 * 全メニューをフラットな配列で取得
 * サイドバー表示用
 * メニューにアイコンが指定されていない場合、モジュールのアイコンを継承
 */
export function getAllMenus(): AppMenu[] {
  return Object.values(moduleRegistry)
    .filter((module) => module.enabled)
    .flatMap((module) =>
      module.menus
        .filter((menu) => menu.enabled)
        .map((menu) => ({
          ...menu,
          icon: menu.icon || module.icon,
        })),
    );
}

/**
 * メニューグループごとにメニューを取得
 */
export function getMenusByGroup(groupId: string): AppMenu[] {
  return getAllMenus()
    .filter((menu) => menu.menuGroup === groupId)
    .sort((a, b) => a.order - b.order);
}

/**
 * モジュールIDからメニュー一覧を取得
 */
export function getMenusByModuleId(moduleId: string): AppMenu[] {
  const module = moduleRegistry[moduleId];
  return module ? module.menus.filter((menu) => menu.enabled) : [];
}

/**
 * メニューIDからメニューを取得
 */
export function getMenuById(menuId: string): AppMenu | undefined {
  for (const module of Object.values(moduleRegistry)) {
    const menu = module.menus.find((m) => m.id === menuId);
    if (menu) return menu;
  }
  return undefined;
}

/**
 * パスからメニューを取得
 */
export function getMenuByPath(path: string): AppMenu | undefined {
  for (const module of Object.values(moduleRegistry)) {
    const menu = module.menus.find((m) => m.path === path);
    if (menu) return menu;
  }
  return undefined;
}

/**
 * モジュール統計情報を取得
 */
export async function getModuleStats() {
  const modules = await getAllModules();
  const allMenus = modules.flatMap((module) =>
    module.menus
      .filter((menu) => menu.enabled)
      .map((menu) => ({
        ...menu,
        icon: menu.icon || module.icon,
      })),
  );

  return {
    totalModules: modules.length,
    totalMenus: allMenus.length,
    menusByGroup: Object.keys(menuGroups).reduce(
      (acc, groupId) => {
        acc[groupId] = allMenus.filter((m) => m.menuGroup === groupId).length;
        return acc;
      },
      {} as Record<string, number>,
    ),
    menusByModule: modules.reduce(
      (acc, module) => {
        acc[module.id] = module.menus.filter((m) => m.enabled).length;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };
}
