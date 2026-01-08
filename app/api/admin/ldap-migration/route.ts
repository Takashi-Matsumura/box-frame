import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";

export interface LdapMigrationConfig {
  enabled: boolean;
  startDate: string | null;
  endDate: string | null;
}

const MIGRATION_KEYS = {
  ENABLED: "ldap_migration_enabled",
  START_DATE: "ldap_migration_start_date",
  END_DATE: "ldap_migration_end_date",
};

/**
 * 移行設定と統計情報を取得
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 移行設定を取得
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: Object.values(MIGRATION_KEYS),
        },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    const config: LdapMigrationConfig = {
      enabled: settingsMap.get(MIGRATION_KEYS.ENABLED) === "true",
      startDate: settingsMap.get(MIGRATION_KEYS.START_DATE) || null,
      endDate: settingsMap.get(MIGRATION_KEYS.END_DATE) || null,
    };

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

    // 移行期間の状態を判定
    const now = new Date();
    let periodStatus: "before" | "active" | "after" | "not_configured" =
      "not_configured";

    if (config.startDate && config.endDate) {
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);

      if (now < startDate) {
        periodStatus = "before";
      } else if (now > endDate) {
        periodStatus = "after";
      } else {
        periodStatus = "active";
      }
    }

    // レガシーLDAP設定を取得（LegacyLdapConfigテーブル）
    const legacyLdapConfig = await prisma.legacyLdapConfig.findFirst();

    return NextResponse.json({
      config,
      stats: {
        totalUsers,
        migratedUsers,
        pendingUsers,
        migrationPercentage,
      },
      periodStatus,
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
            isEnabled: legacyLdapConfig.isEnabled,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to get migration config:", error);
    return NextResponse.json(
      { error: "Failed to get migration config" },
      { status: 500 }
    );
  }
}

/**
 * 移行設定を保存
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { enabled, startDate, endDate } = body as LdapMigrationConfig;

    // 設定を保存（upsert）
    await Promise.all([
      prisma.systemSetting.upsert({
        where: { key: MIGRATION_KEYS.ENABLED },
        update: { value: String(enabled) },
        create: { key: MIGRATION_KEYS.ENABLED, value: String(enabled) },
      }),
      prisma.systemSetting.upsert({
        where: { key: MIGRATION_KEYS.START_DATE },
        update: { value: startDate || "" },
        create: { key: MIGRATION_KEYS.START_DATE, value: startDate || "" },
      }),
      prisma.systemSetting.upsert({
        where: { key: MIGRATION_KEYS.END_DATE },
        update: { value: endDate || "" },
        create: { key: MIGRATION_KEYS.END_DATE, value: endDate || "" },
      }),
    ]);

    // 全管理者にLDAP移行設定変更通知を発行
    await NotificationService.broadcast({
      role: "ADMIN",
      type: "SYSTEM",
      priority: "HIGH",
      title: "LDAP migration settings updated",
      titleJa: "LDAP移行設定が更新されました",
      message: `LDAP migration ${enabled ? "enabled" : "disabled"}. Period: ${startDate || "N/A"} - ${endDate || "N/A"}`,
      messageJa: `LDAP移行が${enabled ? "有効" : "無効"}になりました。期間: ${startDate || "未設定"} - ${endDate || "未設定"}`,
      source: "LDAP",
    }).catch((err) => {
      console.error("[LDAP Migration] Failed to create notification:", err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save migration config:", error);
    return NextResponse.json(
      { error: "Failed to save migration config" },
      { status: 500 }
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
  isEnabled: boolean;
}

/**
 * レガシーLDAP設定を保存
 */
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      serverUrl,
      baseDN,
      bindDN,
      bindPassword,
      searchFilter,
      timeout,
      isEnabled,
    } = body as LegacyLdapConfigInput;

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
          isEnabled,
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
          isEnabled,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save legacy LDAP config:", error);
    return NextResponse.json(
      { error: "Failed to save legacy LDAP config" },
      { status: 500 }
    );
  }
}
