import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { OpenLdapService } from "@/lib/ldap/openldap-service";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";

/**
 * POST /api/auth/change-password
 * ログイン中のユーザが自分のパスワードを変更
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", errorJa: "ログインが必要です" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword) {
      return NextResponse.json(
        {
          error: "New password is required",
          errorJa: "新しいパスワードを入力してください",
        },
        { status: 400 },
      );
    }

    // パスワードの長さチェック
    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          error: "Password must be at least 8 characters",
          errorJa: "パスワードは8文字以上必要です",
        },
        { status: 400 },
      );
    }

    // ユーザのLDAPマッピングを取得
    const mapping = await prisma.ldapUserMapping.findUnique({
      where: { userId: session.user.id },
    });

    if (!mapping) {
      return NextResponse.json(
        {
          error: "LDAP mapping not found",
          errorJa: "LDAPアカウントが見つかりません",
        },
        { status: 404 },
      );
    }

    const ldapService = await OpenLdapService.createWithDatabaseConfig();

    // パスワードリセットフラグがONの場合は現在のパスワード確認をスキップ
    // それ以外の場合は現在のパスワードを確認
    if (!mapping.mustChangePassword) {
      if (!currentPassword) {
        return NextResponse.json(
          {
            error: "Current password is required",
            errorJa: "現在のパスワードを入力してください",
          },
          { status: 400 },
        );
      }

      // 現在のパスワードを確認
      const authResult = await ldapService.authenticate(
        mapping.ldapUsername,
        currentPassword,
      );
      if (!authResult.success) {
        return NextResponse.json(
          {
            error: "Current password is incorrect",
            errorJa: "現在のパスワードが正しくありません",
          },
          { status: 400 },
        );
      }
    }

    // パスワードを更新
    const updateResult = await ldapService.updateUserPassword(
      mapping.ldapUsername,
      newPassword,
    );
    if (!updateResult) {
      return NextResponse.json(
        {
          error: "Failed to update password",
          errorJa: "パスワードの更新に失敗しました",
        },
        { status: 500 },
      );
    }

    // パスワード変更フラグをクリア
    await prisma.ldapUserMapping.update({
      where: { id: mapping.id },
      data: { mustChangePassword: false },
    });

    // パスワード変更通知を発行
    await NotificationService.securityNotify(session.user.id, {
      title: "Password changed",
      titleJa: "パスワードが変更されました",
      message:
        "Your password has been changed successfully. If you did not make this change, please contact your administrator immediately.",
      messageJa:
        "パスワードが正常に変更されました。この変更に心当たりがない場合は、すぐに管理者に連絡してください。",
    }).catch((err) => {
      console.error("[Password] Failed to create notification:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
      messageJa: "パスワードを変更しました",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      {
        error: "Failed to change password",
        errorJa: "パスワードの変更に失敗しました",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/auth/change-password
 * パスワード変更が必要かどうかを確認
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", errorJa: "ログインが必要です" },
        { status: 401 },
      );
    }

    const mapping = await prisma.ldapUserMapping.findUnique({
      where: { userId: session.user.id },
      select: { mustChangePassword: true },
    });

    return NextResponse.json({
      mustChangePassword: mapping?.mustChangePassword ?? false,
    });
  } catch (error) {
    console.error("Error checking password status:", error);
    return NextResponse.json({ mustChangePassword: false });
  }
}
