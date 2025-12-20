import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { OpenLdapService } from "@/lib/ldap/openldap-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized", errorJa: "権限がありません" },
        { status: 401 },
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Username and password are required",
          errorJa: "ユーザ名とパスワードは必須です",
        },
        { status: 400 },
      );
    }

    const openLdapService = await OpenLdapService.createWithDatabaseConfig();
    const authResult = await openLdapService.authenticate(username, password);

    if (authResult.success) {
      return NextResponse.json({
        success: true,
        message: "Authentication successful",
        messageJa: "認証に成功しました",
        user: {
          username,
          displayName: authResult.displayName,
          email: authResult.email,
          userDN: authResult.userDN,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: authResult.error || "Authentication failed",
        errorJa:
          "認証に失敗しました。ユーザ名またはパスワードが正しくありません。",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("OpenLDAP test auth error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test authentication",
        errorJa: "認証テストに失敗しました",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
