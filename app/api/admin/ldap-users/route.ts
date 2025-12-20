import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { OpenLdapService } from "@/lib/ldap/openldap-service";

/**
 * GET /api/admin/ldap-users
 * LDAPユーザ一覧を取得
 */
export async function GET(request: NextRequest) {
  console.log("🚀 [API /api/admin/ldap-users] GET request received");
  try {
    const session = await auth();
    console.log(
      "👤 [API] Session:",
      session
        ? `User: ${session.user.email}, Role: ${session.user.role}`
        : "No session",
    );
    if (!session || session.user.role !== "ADMIN") {
      console.log("❌ [API] Unauthorized - returning 401");
      return NextResponse.json(
        { error: "Unauthorized", errorJa: "権限がありません" },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "20", 10);
    console.log("📋 [API] Parameters:", { search, page, pageSize });

    // バリデーション
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      console.log("❌ [API] Invalid parameters - returning 400");
      return NextResponse.json(
        { error: "Invalid parameters", errorJa: "パラメータが不正です" },
        { status: 400 },
      );
    }

    console.log("🔌 [API] Creating OpenLdapService...");
    const ldapService = await OpenLdapService.createWithDatabaseConfig();
    console.log("✅ [API] OpenLdapService created");

    // 検索クエリがある場合は検索、なければ一覧取得
    if (search) {
      console.log("🔍 [API] Searching users with query:", search);
      const result = await ldapService.searchUsers(search);
      console.log("📊 [API] Search result:", result);
      if (!result.success) {
        console.log("❌ [API] Search failed:", result.error);
        return NextResponse.json(
          { error: result.error, errorJa: "LDAPユーザの検索に失敗しました" },
          { status: 500 },
        );
      }
      const users = result.users || [];
      console.log("✅ [API] Search successful, found", users.length, "users");
      return NextResponse.json({
        users,
        total: users.length,
        page: 1,
        totalPages: 1,
        pageSize: users.length,
      });
    }

    console.log("📋 [API] Listing all users...");
    const result = await ldapService.listUsers({
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    console.log("📊 [API] listUsers result:", result);

    if (!result.success) {
      console.log("❌ [API] listUsers failed:", result.error);
      return NextResponse.json(
        { error: result.error, errorJa: "LDAPユーザの取得に失敗しました" },
        { status: 500 },
      );
    }

    const users = result.users || [];
    const total = result.total || users.length;
    const totalPages = Math.ceil(total / pageSize);
    console.log(
      "✅ [API] Success! Returning",
      users.length,
      "users, total:",
      total,
    );

    return NextResponse.json({
      users,
      total,
      page,
      totalPages,
      pageSize,
    });
  } catch (error) {
    console.error("❌ [API] Exception:", error);
    // 接続エラーの場合は分かりやすいメッセージを返す
    const errorCode = (error as { code?: string })?.code;
    if (errorCode === "ECONNREFUSED") {
      console.log("🔌 [API] Connection refused error");
      return NextResponse.json(
        {
          error: "Cannot connect to LDAP server",
          errorJa:
            "LDAPサーバに接続できません。サーバが起動しているか確認してください。",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: "Failed to fetch LDAP users",
        errorJa: "LDAPユーザの取得に失敗しました",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/ldap-users
 * 新規LDAPユーザを作成
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized", errorJa: "権限がありません" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { uid, password, displayName, mail, employeeNumber, boxEmployeeId } =
      body;

    // バリデーション
    if (!uid || !password) {
      return NextResponse.json(
        {
          error: "uid and password are required",
          errorJa: "ユーザIDとパスワードは必須です",
        },
        { status: 400 },
      );
    }

    // uidの形式チェック（英数字とアンダースコア、ハイフンのみ）
    if (!/^[a-zA-Z0-9_-]+$/.test(uid)) {
      return NextResponse.json(
        {
          error: "Invalid uid format",
          errorJa:
            "ユーザIDの形式が不正です（英数字、アンダースコア、ハイフンのみ）",
        },
        { status: 400 },
      );
    }

    const ldapService = await OpenLdapService.createWithDatabaseConfig();

    // ユーザが既に存在するか確認
    const existingUser = await ldapService.getUser(uid);
    if (existingUser.success) {
      return NextResponse.json(
        {
          error: "User already exists",
          errorJa: "このユーザIDは既に使用されています",
        },
        { status: 409 },
      );
    }

    // ユーザ作成
    const result = await ldapService.createUser(uid, password, {
      displayName,
      email: mail,
      employeeNumber,
      boxEmployeeId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorJa: "ユーザの作成に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        userDN: result.userDN,
        message: "User created successfully",
        messageJa: "ユーザを作成しました",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating LDAP user:", error);
    return NextResponse.json(
      {
        error: "Failed to create LDAP user",
        errorJa: "LDAPユーザの作成に失敗しました",
      },
      { status: 500 },
    );
  }
}
