// コアモジュール（静的インポート）
import { aiModule } from "@/lib/core-modules/ai";
import { systemModule } from "@/lib/core-modules/system";

// アドオンモジュール
import { openldapModule } from "@/lib/addon-modules/openldap";
import { templateModule } from "@/lib/addon-modules/template";
import { prisma } from "@/lib/prisma";
import type {
  AppMenu,
  AppModule,
  AppTab,
  MenuGroup,
  ModuleRegistry,
} from "@/types/module";

/**
 * メニューグループの定義
 * サイドバーでの表示グループ
 * ロール階層に対応: GUEST → USER → MANAGER → EXECUTIVE → ADMIN
 */
export const menuGroups: Record<string, MenuGroup> = {
  guest: {
    id: "guest",
    name: "GUEST",
    nameJa: "ゲスト",
    color: "text-gray-600",
    order: 1,
  },
  user: {
    id: "user",
    name: "USER",
    nameJa: "ユーザ",
    color: "text-cyan-700",
    order: 2,
  },
  manager: {
    id: "manager",
    name: "MANAGER",
    nameJa: "マネージャー",
    color: "text-green-700",
    order: 3,
  },
  executive: {
    id: "executive",
    name: "EXECUTIVE",
    nameJa: "エグゼクティブ",
    color: "text-rose-700",
    order: 4,
  },
  admin: {
    id: "admin",
    name: "ADMIN",
    nameJa: "管理者",
    color: "text-purple-700",
    order: 5,
  },
};

/**
 * 全モジュールを取得
 * moduleRegistryから有効なモジュールを動的に取得
 * メニュー順序と有効状態のオーバーライドをデータベースから適用
 */
export async function getAllModules(): Promise<AppModule[]> {
  // メニュー順序と有効状態のオーバーライドを取得
  const menuSettings = await prisma.systemSetting.findMany({
    where: {
      OR: [
        { key: { startsWith: "menu_order_" } },
        { key: { startsWith: "menu_enabled_" } },
      ],
    },
  });
  const menuOrderOverrides: Record<string, number> = {};
  const menuEnabledOverrides: Record<string, boolean> = {};
  for (const setting of menuSettings) {
    if (setting.key.startsWith("menu_order_")) {
      const menuId = setting.key.replace("menu_order_", "");
      menuOrderOverrides[menuId] = parseInt(setting.value, 10);
    } else if (setting.key.startsWith("menu_enabled_")) {
      const menuId = setting.key.replace("menu_enabled_", "");
      menuEnabledOverrides[menuId] = setting.value === "true";
    }
  }

  return Object.values(moduleRegistry)
    .filter((module) => module.enabled)
    .map((module) => ({
      ...module,
      menus: module.menus.map((menu) => ({
        ...menu,
        order: menuOrderOverrides[menu.id] ?? menu.order,
        enabled: menuEnabledOverrides[menu.id] ?? menu.enabled,
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
  ai: aiModule,
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

/**
 * パスからメニューのタブ定義を取得
 * @param path メニューパス（例: "/admin"）
 * @returns タブ定義の配列、タブがない場合はundefined
 */
export function getTabsByMenuPath(path: string): AppTab[] | undefined {
  const menu = getMenuByPath(path);
  if (!menu?.tabs || menu.tabs.length === 0) {
    return undefined;
  }
  // order順でソートして返す
  return [...menu.tabs]
    .filter((tab) => tab.enabled !== false)
    .sort((a, b) => a.order - b.order);
}

/**
 * メニューIDからタブ定義を取得
 * @param menuId メニューID（例: "adminPanel"）
 * @returns タブ定義の配列、タブがない場合はundefined
 */
export function getTabsByMenuId(menuId: string): AppTab[] | undefined {
  const menu = getMenuById(menuId);
  if (!menu?.tabs || menu.tabs.length === 0) {
    return undefined;
  }
  // order順でソートして返す
  return [...menu.tabs]
    .filter((tab) => tab.enabled !== false)
    .sort((a, b) => a.order - b.order);
}
