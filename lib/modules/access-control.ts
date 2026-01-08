import type { Role } from "@prisma/client";
import type { AppMenu, AppModule, AppTab, MenuGroup } from "@/types/module";
import type { MenuGroupId } from "@/types/common";

/**
 * アクセスキー権限の粒度
 */
export type PermissionGranularity = "module" | "menu" | "tab";

/**
 * アクセスキー権限情報
 */
export interface AccessKeyPermissionInfo {
  granularity: PermissionGranularity;
  moduleId: string;
  menuPath?: string;
  tabId?: string;
}

/**
 * ロール階層の定義
 * 上位ロールは下位ロールのセクションにもアクセス可能
 */
const ROLE_HIERARCHY: Record<Role, MenuGroupId[]> = {
  GUEST: ["guest"],
  USER: ["guest", "user"],
  MANAGER: ["guest", "user", "manager"],
  EXECUTIVE: ["guest", "user", "manager", "executive"],
  ADMIN: ["guest", "user", "manager", "executive", "admin"],
};

/**
 * ユーザのロールに基づいてアクセス可能なメニューグループを取得
 */
export function getAccessibleMenuGroups(
  userRole: Role,
  allMenuGroups: Record<string, MenuGroup>,
): MenuGroup[] {
  const accessibleGroupIds = ROLE_HIERARCHY[userRole] || [];

  return Object.values(allMenuGroups)
    .filter((group) => accessibleGroupIds.includes(group.id as MenuGroupId))
    .sort((a, b) => a.order - b.order);
}

/**
 * メニューグループがユーザのロールでアクセス可能かチェック
 */
export function canAccessMenuGroup(
  groupId: string,
  userRole: Role,
): boolean {
  const accessibleGroupIds = ROLE_HIERARCHY[userRole] || [];
  return accessibleGroupIds.includes(groupId as MenuGroupId);
}

/**
 * ユーザがメニューにアクセスできるかチェック
 */
export function canAccessMenu(
  menu: AppMenu,
  userRole: Role,
  userPermissions: string[],
  userPosition?: string,
  currentPeriodStatus?: string | null,
  userAccessKeys?: string[],
): boolean {
  // メニューが無効な場合はアクセス不可
  if (!menu.enabled) {
    return false;
  }

  // 人事評価関連メニューの動的制御
  if (menu.moduleId === "hrEvaluation") {
    // 評価期間が「実施中」でない場合は、人事評価関連メニューを非表示
    if (!currentPeriodStatus || currentPeriodStatus !== "ACTIVE") {
      // 管理者の「評価環境管理」は常に表示
      if (menu.id !== "evaluationSettings") {
        return false;
      }
    }

    // 評価関係一覧はrequiredRolesで制御（MANAGER, ADMIN）
    // 役職ベースのチェックは削除 - User.roleのみで制御

    // 評価レポートは評価期間中（ACTIVE）のみ表示
    if (menu.id === "evaluationReports") {
      if (!currentPeriodStatus || currentPeriodStatus !== "ACTIVE") {
        return false;
      }
    }
  }

  // ロールベースのチェック
  if (menu.requiredRoles && menu.requiredRoles.length > 0) {
    if (!menu.requiredRoles.includes(userRole)) {
      return false;
    }
  }

  // 権限ベースのチェック
  if (menu.requiredPermissions && menu.requiredPermissions.length > 0) {
    const hasPermission = menu.requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );
    if (!hasPermission) {
      return false;
    }
  }

  // 役職ベースのチェック
  if (menu.requiredPositions && menu.requiredPositions.length > 0) {
    // ADMINロールは役職チェックをスキップ
    if (userRole === "ADMIN") {
      return true;
    }

    // 役職が設定されていない、または必要な役職に含まれていない場合はアクセス不可
    if (!userPosition || !menu.requiredPositions.includes(userPosition)) {
      return false;
    }
  }

  // アクセスキーベースのチェック
  if (menu.requiredAccessKey) {
    // ADMINロールはアクセスキーチェックをスキップ
    if (userRole === "ADMIN") {
      return true;
    }

    // アクセスキーが必要だが、ユーザが持っていない場合はアクセス不可
    if (!userAccessKeys || !userAccessKeys.includes(menu.requiredAccessKey)) {
      return false;
    }
  }

  return true;
}

/**
 * ユーザがモジュールにアクセスできるかチェック
 * モジュールに含まれるメニューのいずれかにアクセス可能であればtrue
 */
export function canAccessModule(
  module: AppModule,
  userRole: Role,
  userPermissions: string[],
  userPosition?: string,
  currentPeriodStatus?: string | null,
  userAccessKeys?: string[],
): boolean {
  // モジュールが無効な場合はアクセス不可
  if (!module.enabled) {
    return false;
  }

  // モジュールに含まれるメニューのいずれかにアクセス可能かチェック
  return module.menus.some((menu) =>
    canAccessMenu(
      menu,
      userRole,
      userPermissions,
      userPosition,
      currentPeriodStatus,
      userAccessKeys,
    ),
  );
}

/**
 * ユーザがアクセス可能なメニューのリストを取得
 */
export function getAccessibleMenus(
  allMenus: AppMenu[],
  userRole: Role,
  userPermissions: string[],
  userPosition?: string,
  currentPeriodStatus?: string | null,
  userAccessKeys?: string[],
): AppMenu[] {
  return allMenus
    .filter((menu) =>
      canAccessMenu(
        menu,
        userRole,
        userPermissions,
        userPosition,
        currentPeriodStatus,
        userAccessKeys,
      ),
    )
    .sort((a, b) => a.order - b.order);
}

/**
 * ユーザがアクセス可能なモジュールのリストを取得
 */
export function getAccessibleModules(
  allModules: AppModule[],
  userRole: Role,
  userPermissions: string[],
  userPosition?: string,
  currentPeriodStatus?: string | null,
  userAccessKeys?: string[],
): AppModule[] {
  return allModules
    .filter((module) =>
      canAccessModule(
        module,
        userRole,
        userPermissions,
        userPosition,
        currentPeriodStatus,
        userAccessKeys,
      ),
    )
    .sort((a, b) => a.order - b.order);
}

/**
 * メニューグループごとにメニューをグループ化
 */
export function groupMenusByMenuGroup(
  menus: AppMenu[],
): Record<string, AppMenu[]> {
  const grouped: Record<string, AppMenu[]> = {};

  for (const menu of menus) {
    if (!grouped[menu.menuGroup]) {
      grouped[menu.menuGroup] = [];
    }
    grouped[menu.menuGroup].push(menu);
  }

  // 各グループ内でorder順にソート
  for (const group in grouped) {
    grouped[group].sort((a, b) => a.order - b.order);
  }

  return grouped;
}

/**
 * @deprecated Use groupMenusByMenuGroup instead
 */
export function groupModulesByMenuGroup(
  modules: AppModule[],
): Record<string, AppModule[]> {
  const grouped: Record<string, AppModule[]> = {};

  for (const _module of modules) {
    // 旧構造では menuGroup がモジュールに直接存在していたが、
    // 新構造ではメニューに存在するため、このロジックは非推奨
  }

  return grouped;
}

/**
 * ============================================
 * タブレベルのアクセス制御（Phase 2）
 * ============================================
 */

/**
 * アクセスキー権限がタブへのアクセスを許可するかチェック
 * 権限の階層構造を考慮：モジュール > メニュー > タブ
 */
export function checkPermissionForTab(
  permission: AccessKeyPermissionInfo,
  targetModuleId: string,
  targetMenuPath: string,
  targetTabId: string,
): boolean {
  // モジュールが一致しない場合は不許可
  if (permission.moduleId !== targetModuleId) {
    return false;
  }

  switch (permission.granularity) {
    case "module":
      // モジュールレベルの権限：配下の全メニュー・タブにアクセス可能
      return true;

    case "menu":
      // メニューレベルの権限：対象メニューの全タブにアクセス可能
      return permission.menuPath === targetMenuPath;

    case "tab":
      // タブレベルの権限：特定のタブのみアクセス可能
      return (
        permission.menuPath === targetMenuPath &&
        permission.tabId === targetTabId
      );

    default:
      return false;
  }
}

/**
 * ユーザがタブにアクセスできるかチェック
 *
 * @param tab 対象タブ
 * @param menu タブが属するメニュー
 * @param moduleId メニューが属するモジュールID
 * @param userRole ユーザのロール
 * @param userAccessKeyPermissions ユーザが持つアクセスキー権限
 * @returns アクセス可能かどうか
 */
export function canAccessTab(
  tab: AppTab,
  menu: AppMenu,
  moduleId: string,
  userRole: Role,
  userAccessKeyPermissions: AccessKeyPermissionInfo[] = [],
): boolean {
  // タブが無効な場合はアクセス不可
  if (tab.enabled === false) {
    return false;
  }

  // ADMINロールは常にアクセス可能
  if (userRole === "ADMIN") {
    return true;
  }

  // ロールベースでメニューにアクセス可能な場合、タブにもアクセス可能
  // （タブ固有のロール制限がない場合）
  if (menu.requiredRoles && menu.requiredRoles.includes(userRole)) {
    return true;
  }

  // アクセスキーによるアクセス権チェック
  for (const permission of userAccessKeyPermissions) {
    if (
      checkPermissionForTab(permission, moduleId, menu.path, tab.id)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * メニュー内のアクセス可能なタブを取得
 *
 * @param menu 対象メニュー
 * @param moduleId メニューが属するモジュールID
 * @param userRole ユーザのロール
 * @param userAccessKeyPermissions ユーザが持つアクセスキー権限
 * @returns アクセス可能なタブの配列
 */
export function getAccessibleTabs(
  menu: AppMenu,
  moduleId: string,
  userRole: Role,
  userAccessKeyPermissions: AccessKeyPermissionInfo[] = [],
): AppTab[] {
  if (!menu.tabs) {
    return [];
  }

  return menu.tabs
    .filter((tab) =>
      canAccessTab(tab, menu, moduleId, userRole, userAccessKeyPermissions),
    )
    .sort((a, b) => a.order - b.order);
}

/**
 * アクセスキー権限がメニューへのアクセスを許可するかチェック
 * 権限の階層構造を考慮：モジュール > メニュー
 */
export function checkPermissionForMenu(
  permission: AccessKeyPermissionInfo,
  targetModuleId: string,
  targetMenuPath: string,
): boolean {
  // モジュールが一致しない場合は不許可
  if (permission.moduleId !== targetModuleId) {
    return false;
  }

  switch (permission.granularity) {
    case "module":
      // モジュールレベルの権限：配下の全メニューにアクセス可能
      return true;

    case "menu":
    case "tab":
      // メニュー/タブレベルの権限：対象メニューにアクセス可能
      return permission.menuPath === targetMenuPath;

    default:
      return false;
  }
}

/**
 * アクセスキー権限がモジュールへのアクセスを許可するかチェック
 */
export function checkPermissionForModule(
  permission: AccessKeyPermissionInfo,
  targetModuleId: string,
): boolean {
  return permission.moduleId === targetModuleId;
}
