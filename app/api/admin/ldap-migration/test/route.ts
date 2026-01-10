import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LegacyLdapService } from "@/lib/addon-modules/ldap-migration/legacy-ldap-service";

/**
 * POST /api/admin/ldap-migration/test
 * レガシーLDAP接続テストを実行
 *
 * テストタイプ:
 * - connection: 接続テスト（バインドのみ）
 * - search: ユーザー検索テスト
 * - auth: 認証テスト（ユーザー名とパスワード）
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { testType, username, password } = body;

    // LegacyLdapServiceを取得
    const service = await LegacyLdapService.createWithDatabaseConfig();

    if (!service) {
      return NextResponse.json(
        { success: false, error: "Legacy LDAP is not configured or disabled" },
        { status: 400 },
      );
    }

    switch (testType) {
      case "connection": {
        // 接続テスト
        const result = await service.testConnection();
        return NextResponse.json({
          success: result.success,
          error: result.error,
          message: result.success
            ? "Connection successful"
            : `Connection failed: ${result.error}`,
          messageJa: result.success
            ? "接続に成功しました"
            : `接続に失敗しました: ${result.error}`,
        });
      }

      case "search": {
        // ユーザー検索テスト
        if (!username) {
          return NextResponse.json(
            { success: false, error: "Username is required for search test" },
            { status: 400 },
          );
        }

        const result = await service.testSearchUser(username);
        return NextResponse.json({
          success: result.success,
          error: result.error,
          userDN: result.userDN,
          email: result.email,
          displayName: result.displayName,
          message: result.success
            ? `User found: ${result.userDN}`
            : `User not found: ${result.error}`,
          messageJa: result.success
            ? `ユーザーが見つかりました: ${result.userDN}`
            : `ユーザーが見つかりませんでした: ${result.error}`,
        });
      }

      case "auth": {
        // 認証テスト
        if (!username || !password) {
          return NextResponse.json(
            {
              success: false,
              error: "Username and password are required for auth test",
            },
            { status: 400 },
          );
        }

        const result = await service.testAuthentication(username, password);
        return NextResponse.json({
          success: result.success,
          error: result.error,
          userDN: result.userDN,
          email: result.email,
          displayName: result.displayName,
          message: result.success
            ? `Authentication successful for ${username}`
            : `Authentication failed: ${result.error}`,
          messageJa: result.success
            ? `${username}の認証に成功しました`
            : `認証に失敗しました: ${result.error}`,
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid test type. Use: connection, search, or auth",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[API] Legacy LDAP test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      },
      { status: 500 },
    );
  }
}
