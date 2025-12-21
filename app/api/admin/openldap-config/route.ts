import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";

export interface OpenLdapConfigData {
  isEnabled: boolean;
  serverUrl: string;
  adminDN: string;
  adminPassword: string;
  baseDN: string;
  usersOU: string;
  timeout: number;
}

/**
 * OpenLDAP設定を取得
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 設定を取得（1件のみ）
    let config = await prisma.openLdapConfig.findFirst();

    // 設定がない場合は環境変数からデフォルト値を使用
    if (!config) {
      config = {
        id: "",
        isEnabled: true,
        serverUrl: process.env.OPENLDAP_URL || "ldap://localhost:389",
        adminDN: process.env.OPENLDAP_ADMIN_DN || "cn=admin,dc=occ,dc=co,dc=jp",
        adminPassword: process.env.OPENLDAP_ADMIN_PASSWORD || "",
        baseDN: process.env.OPENLDAP_BASE_DN || "dc=occ,dc=co,dc=jp",
        usersOU: process.env.OPENLDAP_USERS_OU || "ou=Users,dc=occ,dc=co,dc=jp",
        timeout: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // パスワードはマスク（存在確認のみ）
    return NextResponse.json({
      isEnabled: config.isEnabled,
      serverUrl: config.serverUrl,
      adminDN: config.adminDN,
      hasPassword: !!config.adminPassword,
      baseDN: config.baseDN,
      usersOU: config.usersOU,
      timeout: config.timeout,
    });
  } catch (error) {
    console.error("Failed to get OpenLDAP config:", error);
    return NextResponse.json(
      { error: "Failed to get OpenLDAP config" },
      { status: 500 },
    );
  }
}

/**
 * OpenLDAP設定を保存
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      isEnabled,
      serverUrl,
      adminDN,
      adminPassword,
      baseDN,
      usersOU,
      timeout,
    } = body as OpenLdapConfigData;

    // 既存の設定を取得
    const existingConfig = await prisma.openLdapConfig.findFirst();

    if (existingConfig) {
      // 更新（パスワードが空の場合は既存のパスワードを維持）
      await prisma.openLdapConfig.update({
        where: { id: existingConfig.id },
        data: {
          isEnabled,
          serverUrl,
          adminDN,
          ...(adminPassword ? { adminPassword } : {}),
          baseDN,
          usersOU,
          timeout,
        },
      });
    } else {
      // 新規作成
      await prisma.openLdapConfig.create({
        data: {
          isEnabled,
          serverUrl,
          adminDN,
          adminPassword: adminPassword || "",
          baseDN,
          usersOU,
          timeout,
        },
      });
    }

    // 全管理者にOpenLDAP設定変更通知を発行
    await NotificationService.broadcast({
      role: "ADMIN",
      type: "SYSTEM",
      priority: "HIGH",
      title: "OpenLDAP configuration updated",
      titleJa: "OpenLDAP設定が更新されました",
      message: `OpenLDAP configuration has been updated by ${session.user.email}. Server: ${serverUrl}`,
      messageJa: `OpenLDAP設定が ${session.user.email} によって更新されました。サーバー: ${serverUrl}`,
      source: "LDAP",
    }).catch((err) => {
      console.error("[OpenLDAP] Failed to create notification:", err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save OpenLDAP config:", error);
    return NextResponse.json(
      { error: "Failed to save OpenLDAP config" },
      { status: 500 },
    );
  }
}
