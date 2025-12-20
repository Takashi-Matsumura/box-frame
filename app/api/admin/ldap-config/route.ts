import type { LdapConfig } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/ldap-config
 *
 * LDAP設定を取得
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 設定を取得（最初の1件、なければデフォルト値を返す）
    const config = await prisma.ldapConfig.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!config) {
      // デフォルト設定を返す
      return NextResponse.json({
        id: "",
        isEnabled: false,
        serverUrl: "",
        baseDN: "",
        bindDN: "",
        bindPassword: "",
        searchFilter: "(uid={username})",
        timeout: 10000,
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching LDAP config:", error);
    return NextResponse.json(
      { error: "Failed to fetch LDAP config" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/ldap-config
 *
 * LDAP設定を更新
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      isEnabled,
      serverUrl,
      baseDN,
      bindDN,
      bindPassword,
      searchFilter,
      timeout,
    } = body;

    // バリデーション
    if (isEnabled && (!serverUrl || !baseDN)) {
      return NextResponse.json(
        { error: "Server URL and Base DN are required when LDAP is enabled" },
        { status: 400 },
      );
    }

    // 既存の設定を取得
    const existingConfig = await prisma.ldapConfig.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let config: LdapConfig;
    if (existingConfig) {
      // 更新
      config = await prisma.ldapConfig.update({
        where: { id: existingConfig.id },
        data: {
          isEnabled: Boolean(isEnabled),
          serverUrl: serverUrl || "",
          baseDN: baseDN || "",
          bindDN: bindDN || null,
          bindPassword: bindPassword || null,
          searchFilter: searchFilter || "(uid={username})",
          timeout: Number.parseInt(timeout, 10) || 10000,
          updatedBy: session.user.email || "unknown",
        },
      });
    } else {
      // 新規作成
      config = await prisma.ldapConfig.create({
        data: {
          isEnabled: Boolean(isEnabled),
          serverUrl: serverUrl || "",
          baseDN: baseDN || "",
          bindDN: bindDN || null,
          bindPassword: bindPassword || null,
          searchFilter: searchFilter || "(uid={username})",
          timeout: Number.parseInt(timeout, 10) || 10000,
          updatedBy: session.user.email || "unknown",
        },
      });
    }

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("Error updating LDAP config:", error);
    return NextResponse.json(
      { error: "Failed to update LDAP config" },
      { status: 500 },
    );
  }
}
