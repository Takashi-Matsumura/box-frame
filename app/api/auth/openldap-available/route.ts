import { NextResponse } from "next/server";
import { OpenLdapService } from "@/lib/ldap/openldap-service";

/**
 * OpenLDAPログインが利用可能かどうかを確認するAPI
 * 認証不要（ログインページで使用）
 */
export async function GET() {
  try {
    // OpenLDAPサーバが利用可能か確認（データベースから設定を読み込む）
    const openLdapService = await OpenLdapService.createWithDatabaseConfig();
    const isServerAvailable = await openLdapService.isAvailable();

    if (!isServerAvailable) {
      return NextResponse.json({
        available: false,
        reason: "server_unavailable",
      });
    }

    return NextResponse.json({
      available: true,
    });
  } catch (error) {
    console.error("OpenLDAP availability check error:", error);
    return NextResponse.json({
      available: false,
      reason: "error",
    });
  }
}
