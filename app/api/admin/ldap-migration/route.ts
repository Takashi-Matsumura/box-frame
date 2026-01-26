import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";

/**
 * レガシーLDAP設定と移行統計を取得
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 移行統計を取得
    const totalUsers = await prisma.ldapUserMapping.count({
      where: { isActive: true },
    });

    const migratedUsers = await prisma.ldapUserMapping.count({
      where: { isActive: true, migrated: true },
    });

    const pendingUsers = totalUsers - migratedUsers;
    const migrationPercentage =
      totalUsers > 0 ? Math.round((migratedUsers / totalUsers) * 1000) / 10 : 0;

    // レガシーLDAP設定を取得
    const legacyLdapConfig = await prisma.legacyLdapConfig.findFirst();

    return NextResponse.json({
      stats: {
        totalUsers,
        migratedUsers,
        pendingUsers,
        migrationPercentage,
      },
      legacyLdapConfig: legacyLdapConfig
        ? {
            id: legacyLdapConfig.id,
            serverUrl: legacyLdapConfig.serverUrl,
            baseDN: legacyLdapConfig.baseDN,
            bindDN: legacyLdapConfig.bindDN || "",
            // パスワードはマスクして返す
            bindPassword: legacyLdapConfig.bindPassword ? "********" : "",
            searchFilter: legacyLdapConfig.searchFilter,
            timeout: legacyLdapConfig.timeout,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to get legacy LDAP config:", error);
    return NextResponse.json(
      { error: "Failed to get legacy LDAP config" },
      { status: 500 },
    );
  }
}

export interface LegacyLdapConfigInput {
  serverUrl: string;
  baseDN: string;
  bindDN: string;
  bindPassword: string;
  searchFilter: string;
  timeout: number;
}

/**
 * レガシーLDAP設定を保存
 * モジュールのON/OFFで移行を制御するため、isEnabledは常にtrueで保存
 */
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { serverUrl, baseDN, bindDN, bindPassword, searchFilter, timeout } =
      body as LegacyLdapConfigInput;

    // 既存の設定を取得
    const existingConfig = await prisma.legacyLdapConfig.findFirst();

    // パスワードが "********" の場合は既存のパスワードを維持
    const actualPassword =
      bindPassword === "********"
        ? existingConfig?.bindPassword || null
        : bindPassword || null;

    if (existingConfig) {
      // 更新
      await prisma.legacyLdapConfig.update({
        where: { id: existingConfig.id },
        data: {
          serverUrl,
          baseDN,
          bindDN: bindDN || null,
          bindPassword: actualPassword,
          searchFilter: searchFilter || "(uid={username})",
          timeout: timeout || 10000,
          isEnabled: true, // モジュールON時は常に有効
        },
      });
    } else {
      // 新規作成
      await prisma.legacyLdapConfig.create({
        data: {
          serverUrl,
          baseDN,
          bindDN: bindDN || null,
          bindPassword: actualPassword,
          searchFilter: searchFilter || "(uid={username})",
          timeout: timeout || 10000,
          isEnabled: true, // モジュールON時は常に有効
        },
      });
    }

    // 全管理者にレガシーLDAP設定変更通知を発行
    await NotificationService.broadcast({
      role: "ADMIN",
      type: "SYSTEM",
      priority: "HIGH",
      title: "Legacy LDAP configuration updated",
      titleJa: "レガシーLDAP設定が更新されました",
      message: `Legacy LDAP configuration has been updated. Server: ${serverUrl}`,
      messageJa: `レガシーLDAP設定が更新されました。サーバー: ${serverUrl}`,
      source: "LDAP",
    }).catch((err) => {
      console.error("[Legacy LDAP] Failed to create notification:", err);
    });

    // 保存後のデータを返す（パスワードはマスク）
    return NextResponse.json({
      success: true,
      legacyLdapConfig: {
        serverUrl,
        baseDN,
        bindDN: bindDN || "",
        bindPassword: actualPassword ? "********" : "",
        searchFilter: searchFilter || "(uid={username})",
        timeout: timeout || 10000,
      },
    });
  } catch (error) {
    console.error("Failed to save legacy LDAP config:", error);
    return NextResponse.json(
      { error: "Failed to save legacy LDAP config" },
      { status: 500 },
    );
  }
}
