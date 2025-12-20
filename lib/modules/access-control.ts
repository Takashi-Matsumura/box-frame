import type { Role } from "@prisma/client";
import type { AppMenu, AppModule } from "@/types/module";

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
