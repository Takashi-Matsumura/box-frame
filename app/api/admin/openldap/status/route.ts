import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  loadOpenLdapConfigFromDatabase,
  OpenLdapService,
} from "@/lib/ldap/openldap-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized", errorJa: "権限がありません" },
        { status: 401 },
      );
    }

    const openLdapService = await OpenLdapService.createWithDatabaseConfig();
    const isAvailable = await openLdapService.isAvailable();

    // データベースから設定情報を取得
    const dbConfig = await loadOpenLdapConfigFromDatabase();
    const config = {
      url: dbConfig.serverUrl,
      baseDn: dbConfig.baseDN,
      usersOu: dbConfig.usersOU,
    };

    return NextResponse.json({
      isAvailable,
      config,
      timestamp: new Date().toISOString(),
      message: isAvailable
        ? "OpenLDAP server is available"
        : "OpenLDAP server is not available",
      messageJa: isAvailable
        ? "OpenLDAPサーバは利用可能です"
        : "OpenLDAPサーバに接続できません",
    });
  } catch (error) {
    console.error("OpenLDAP status check error:", error);
    return NextResponse.json(
      {
        isAvailable: false,
        error: "Failed to check OpenLDAP status",
        errorJa: "OpenLDAPの状態確認に失敗しました",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
