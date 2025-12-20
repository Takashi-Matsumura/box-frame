import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/brave-api-key
 * ユーザのBrave API Keyを取得
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { braveApiKey: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      braveApiKey: user.braveApiKey || null,
      hasKey: !!user.braveApiKey,
    });
  } catch (error) {
    console.error("[GET /api/user/brave-api-key] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/user/brave-api-key
 * ユーザのBrave API Keyを保存・更新
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { braveApiKey } = body;

    // APIキーのバリデーション（空文字列の場合はnullに設定）
    const apiKeyValue = braveApiKey?.trim() || null;

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: { braveApiKey: apiKeyValue },
      select: { braveApiKey: true },
    });

    return NextResponse.json({
      success: true,
      braveApiKey: user.braveApiKey,
      hasKey: !!user.braveApiKey,
    });
  } catch (error) {
    console.error("[PUT /api/user/brave-api-key] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/user/brave-api-key
 * ユーザのBrave API Keyを削除
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: { braveApiKey: null },
    });

    return NextResponse.json({
      success: true,
      message: "Brave API Key deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE /api/user/brave-api-key] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
