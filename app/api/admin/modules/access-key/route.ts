import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { moduleRegistry } from "@/lib/modules/registry";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * allowAccessKey設定を更新するAPI
 *
 * メニューレベル: { type: "menu", menuId: string, allowAccessKey: boolean }
 * タブレベル: { type: "tab", menuId: string, tabId: string, allowAccessKey: boolean }
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, menuId, tabId, allowAccessKey } = body;

    // バリデーション
    if (!type || !menuId || typeof allowAccessKey !== "boolean") {
      return NextResponse.json(
        { error: "type, menuId, and allowAccessKey are required" },
        { status: 400 },
      );
    }

    if (type !== "menu" && type !== "tab") {
      return NextResponse.json(
        { error: "type must be 'menu' or 'tab'" },
        { status: 400 },
      );
    }

    if (type === "tab" && !tabId) {
      return NextResponse.json(
        { error: "tabId is required for tab type" },
        { status: 400 },
      );
    }

    // メニューの存在確認
    let foundModule: (typeof moduleRegistry)[string] | null = null;
    let foundMenu: {
      id: string;
      name: string;
      nameJa?: string;
      tabs?: unknown[];
    } | null = null;
    let foundTab: { id: string; name: string; nameJa?: string } | null = null;

    for (const module of Object.values(moduleRegistry)) {
      const menu = module.menus.find((m) => m.id === menuId);
      if (menu) {
        foundModule = module;
        foundMenu = menu;
        if (type === "tab" && menu.tabs) {
          const tab = menu.tabs.find((t) => t.id === tabId);
          if (tab) {
            foundTab = tab;
          }
        }
        break;
      }
    }

    if (!foundMenu || !foundModule) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    if (type === "tab" && !foundTab) {
      return NextResponse.json({ error: "Tab not found" }, { status: 404 });
    }

    // SystemSettingに保存
    let settingKey: string;
    if (type === "menu") {
      settingKey = `menu_allow_access_key_${menuId}`;
    } else {
      settingKey = `tab_allow_access_key_${menuId}_${tabId}`;
    }

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: allowAccessKey.toString() },
      create: { key: settingKey, value: allowAccessKey.toString() },
    });

    // 監査ログに記録
    await AuditService.log({
      action: "ACCESS_KEY_PERMISSION_UPDATE",
      category: "MODULE",
      userId: session.user.id,
      targetId: type === "menu" ? menuId : `${menuId}/${tabId}`,
      targetType: type === "menu" ? "Menu" : "Tab",
      details: {
        type,
        menuId,
        menuName: foundMenu.name,
        menuNameJa: foundMenu.nameJa,
        ...(type === "tab" && {
          tabId,
          tabName: foundTab?.name,
          tabNameJa: foundTab?.nameJa,
        }),
        allowAccessKey,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      type,
      menuId,
      ...(type === "tab" && { tabId }),
      allowAccessKey,
    });
  } catch (error) {
    console.error("Error updating allowAccessKey setting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * allowAccessKey設定をデフォルトにリセットするAPI
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const menuId = searchParams.get("menuId");
    const tabId = searchParams.get("tabId");

    if (!type || !menuId) {
      return NextResponse.json(
        { error: "type and menuId are required" },
        { status: 400 },
      );
    }

    if (type === "tab" && !tabId) {
      return NextResponse.json(
        { error: "tabId is required for tab type" },
        { status: 400 },
      );
    }

    // SystemSettingから削除（デフォルト値にリセット）
    let settingKey: string;
    if (type === "menu") {
      settingKey = `menu_allow_access_key_${menuId}`;
    } else {
      settingKey = `tab_allow_access_key_${menuId}_${tabId}`;
    }

    await prisma.systemSetting.deleteMany({
      where: { key: settingKey },
    });

    return NextResponse.json({
      success: true,
      type,
      menuId,
      ...(type === "tab" && { tabId }),
      reset: true,
    });
  } catch (error) {
    console.error("Error resetting allowAccessKey setting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
