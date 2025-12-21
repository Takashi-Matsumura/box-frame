import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LANGUAGE_COOKIE_NAME } from "@/lib/i18n/get-language";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { language } = await request.json();

    if (!language || !["en", "ja"].includes(language)) {
      return NextResponse.json(
        { error: "Invalid language. Must be 'en' or 'ja'" },
        { status: 400 },
      );
    }

    // emailでユーザを検索・更新（IDではなくemailを使用）
    if (!session.user.email) {
      console.error("[Language API] User email not found in session:", session);
      return NextResponse.json(
        { error: "User email not found in session" },
        { status: 400 },
      );
    }

    console.log(
      "[Language API] Updating language for user:",
      session.user.email,
    );

    // まずユーザが存在するか確認
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.error(
        "[Language API] User not found in database:",
        session.user.email,
      );
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 },
      );
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: { language },
    });

    console.log(
      "[Language API] Language updated successfully for:",
      session.user.email,
    );

    // レスポンスにCookieを設定（ログアウト後も言語設定を維持）
    const response = NextResponse.json({ success: true, language });
    response.cookies.set(LANGUAGE_COOKIE_NAME, language, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1年間
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Error updating language preference:", error);
    return NextResponse.json(
      { error: "Failed to update language preference" },
      { status: 500 },
    );
  }
}
