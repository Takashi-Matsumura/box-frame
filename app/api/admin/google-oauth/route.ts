import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SETTING_KEY = "google_oauth_enabled";

/**
 * GET /api/admin/google-oauth
 * Google OAuthの有効/無効状態を取得
 */
export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    // デフォルトは無効
    const enabled = setting?.value === "true";

    return NextResponse.json({ enabled });
  } catch (error) {
    console.error("Error fetching Google OAuth setting:", error);
    return NextResponse.json(
      { error: "Failed to fetch setting" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/google-oauth
 * Google OAuthの有効/無効を切り替え（ADMIN専用）
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { enabled } = await request.json();

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: String(enabled) },
      create: { key: SETTING_KEY, value: String(enabled) },
    });

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error("Error updating Google OAuth setting:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 },
    );
  }
}
