import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { moduleRegistry } from "@/lib/modules/registry";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";
import { OpenLdapService } from "@/lib/ldap/openldap-service";

export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // コンテナステータスをチェックする関数
    const checkContainerStatus = async (containerId: string): Promise<boolean> => {
      try {
        // コンテナIDに基づいて適切なヘルスチェックを実行
        switch (containerId) {
          case "openldap": {
            // OpenLDAPはサービスを直接使用してチェック
            const openLdapService = await OpenLdapService.createWithDatabaseConfig();
            return await openLdapService.isAvailable();
          }
          case "postgres":
          case "postgresql": {
            // PostgreSQLはPrismaの接続チェック
            await prisma.$queryRaw`SELECT 1`;
            return true;
          }
          default:
            // 未知のコンテナは稼働中と仮定
            return true;
        }
      } catch {
        return false;
      }
    };

    // モジュール情報を取得
    // 依存関係がないモジュールをcoreとして扱う
    const modules = await Promise.all(
      Object.values(moduleRegistry).map(async (module) => {
        const isCore = !module.dependencies || module.dependencies.length === 0;

        // コンテナステータスをチェック
        const containersWithStatus = module.containers
          ? await Promise.all(
              module.containers.map(async (container) => ({
                id: container.id,
                name: container.name,
                nameJa: container.nameJa,
                required: container.required,
                description: container.description,
                descriptionJa: container.descriptionJa,
                isRunning: await checkContainerStatus(container.id),
              }))
            )
          : [];

        return {
          id: module.id,
          name: module.name,
          nameJa: module.nameJa,
          description: module.description,
          descriptionJa: module.descriptionJa,
          enabled: module.enabled,
          type: isCore ? ("core" as const) : ("addon" as const),
          menuCount: module.menus.filter((m) => m.enabled).length,
          menus: module.menus.map((menu) => ({
            id: menu.id,
            name: menu.name,
            nameJa: menu.nameJa,
            path: menu.path,
            menuGroup: menu.menuGroup,
            enabled: menu.enabled,
            order: menuOrderOverrides[menu.id] ?? menu.order,
            requiredRoles: menu.requiredRoles || [],
          })),
          containers: containersWithStatus,
        };
      })
    );

    // 統計情報を計算
    const statistics = {
      total: modules.length,
      core: modules.filter((m) => m.type === "core").length,
      addons: modules.filter((m) => m.type === "addon").length,
      enabled: modules.filter((m) => m.enabled).length,
      disabled: modules.filter((m) => !m.enabled).length,
    };

    return NextResponse.json({
      modules,
      statistics,
    });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { moduleId, enabled } = await request.json();

    if (!moduleId || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Module ID and enabled status are required" },
        { status: 400 }
      );
    }

    // モジュールが存在するか確認
    const module = moduleRegistry[moduleId];
    if (!module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // コアモジュールは無効化できない
    const isCore = !module.dependencies || module.dependencies.length === 0;
    if (isCore && !enabled) {
      return NextResponse.json(
        { error: "Core modules cannot be disabled", errorJa: "コアモジュールは無効化できません" },
        { status: 400 }
      );
    }

    // SystemSettingに保存
    const settingKey = `module_enabled_${moduleId}`;
    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: enabled.toString() },
      create: { key: settingKey, value: enabled.toString() },
    });

    // ランタイムのモジュールレジストリも更新（再起動まで有効）
    module.enabled = enabled;

    // 全管理者にモジュール状態変更通知を発行
    await NotificationService.broadcast({
      role: "ADMIN",
      type: "SYSTEM",
      priority: "NORMAL",
      title: enabled ? "Module enabled" : "Module disabled",
      titleJa: enabled ? "モジュールが有効になりました" : "モジュールが無効になりました",
      message: `Module "${module.name}" has been ${enabled ? "enabled" : "disabled"}.`,
      messageJa: `モジュール「${module.nameJa || module.name}」が${enabled ? "有効" : "無効"}になりました。`,
      source: "MODULE",
    }).catch((err) => {
      console.error("[Module] Failed to create notification:", err);
    });

    return NextResponse.json({
      success: true,
      moduleId,
      enabled,
    });
  } catch (error) {
    console.error("Error updating module:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { menuId, order } = await request.json();

    if (!menuId || typeof order !== "number") {
      return NextResponse.json(
        { error: "Menu ID and order are required" },
        { status: 400 }
      );
    }

    // メニューが存在するか確認
    let menuFound = false;
    for (const module of Object.values(moduleRegistry)) {
      const menu = module.menus.find((m) => m.id === menuId);
      if (menu) {
        menuFound = true;
        // ランタイムのメニュー順序も更新
        menu.order = order;
        break;
      }
    }

    if (!menuFound) {
      return NextResponse.json(
        { error: "Menu not found" },
        { status: 404 }
      );
    }

    // SystemSettingに保存
    const settingKey = `menu_order_${menuId}`;
    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: order.toString() },
      create: { key: settingKey, value: order.toString() },
    });

    return NextResponse.json({
      success: true,
      menuId,
      order,
    });
  } catch (error) {
    console.error("Error updating menu order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
