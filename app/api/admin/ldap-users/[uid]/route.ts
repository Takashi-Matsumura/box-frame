import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { OpenLdapService } from "@/lib/ldap/openldap-service";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/ldap-users/[uid]
 * LDAPユーザ詳細を取得
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ uid: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized", errorJa: "権限がありません" },
        { status: 401 },
      );
    }

    const { uid } = await context.params;

    const ldapService = await OpenLdapService.createWithDatabaseConfig();
    const result = await ldapService.getUser(uid);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorJa: "ユーザが見つかりません" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      user: result.user,
    });
  } catch (error) {
    console.error("Error fetching LDAP user:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch LDAP user",
        errorJa: "LDAPユーザの取得に失敗しました",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/ldap-users/[uid]
 * LDAPユーザを更新（属性更新またはパスワードリセット）
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized", errorJa: "権限がありません" },
        { status: 401 },
      );
    }

    const { uid } = await context.params;
    const body = await request.json();
    const { displayName, mail, password } = body;

    const ldapService = await OpenLdapService.createWithDatabaseConfig();

    // パスワードリセットの場合
    if (password) {
      const passwordResult = await ldapService.updateUserPassword(
        uid,
        password,
      );
      if (!passwordResult) {
        return NextResponse.json(
          {
            error: "Failed to update password",
            errorJa: "パスワードの更新に失敗しました",
          },
          { status: 500 },
        );
      }

      // パスワードリセットフラグを設定（次回ログイン時にパスワード変更を強制）
      await prisma.ldapUserMapping.updateMany({
        where: { ldapUsername: uid },
        data: { mustChangePassword: true },
      });
    }

    // 属性更新の場合
    const attributes: { displayName?: string; mail?: string } = {};
    if (displayName !== undefined) attributes.displayName = displayName;
    if (mail !== undefined) attributes.mail = mail;

    let employeeLinked = false;
    let employeeInfo: { name: string; employeeId: string | null } | null = null;

    if (Object.keys(attributes).length > 0) {
      // 1. OpenLDAPの属性を更新
      const updateResult = await ldapService.updateUser(uid, attributes);
      if (!updateResult.success) {
        return NextResponse.json(
          {
            error: updateResult.error,
            errorJa: "ユーザの更新に失敗しました",
          },
          { status: 500 },
        );
      }

      // 2. メールアドレスが変更された場合、Userテーブルも更新
      if (mail !== undefined) {
        // LdapUserMappingからUserを特定
        const mapping = await prisma.ldapUserMapping.findUnique({
          where: { ldapUsername: uid },
          include: { user: true },
        });

        if (mapping?.user) {
          // 新しいメールアドレスが既に他のユーザーに使用されていないか確認
          const existingUser = await prisma.user.findUnique({
            where: { email: mail },
          });

          if (existingUser && existingUser.id !== mapping.user.id) {
            return NextResponse.json(
              {
                error: "Email already in use",
                errorJa: "このメールアドレスは既に使用されています",
              },
              { status: 400 },
            );
          }

          // Userテーブルのメールアドレスを更新
          await prisma.user.update({
            where: { id: mapping.user.id },
            data: { email: mail },
          });

          // 3. 新しいメールでEmployeeテーブルを検索し、社員情報を取得
          const employee = await prisma.employee.findUnique({
            where: { email: mail },
            select: {
              id: true,
              name: true,
              employeeId: true,
            },
          });

          if (employee) {
            employeeLinked = true;
            employeeInfo = {
              name: employee.name,
              employeeId: employee.employeeId,
            };

            // Userテーブルの名前も更新
            await prisma.user.update({
              where: { id: mapping.user.id },
              data: { name: employee.name },
            });

            // OpenLDAPのdisplayNameも更新（displayNameが明示的に指定されていない場合）
            if (displayName === undefined) {
              await ldapService.updateUser(uid, { displayName: employee.name });
            }

            console.log(
              `[LDAP User Update] Linked to employee: ${employee.name} (${employee.employeeId})`,
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      messageJa: "ユーザを更新しました",
      employeeLinked,
      employeeInfo,
    });
  } catch (error) {
    console.error("Error updating LDAP user:", error);
    return NextResponse.json(
      {
        error: "Failed to update LDAP user",
        errorJa: "LDAPユーザの更新に失敗しました",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/ldap-users/[uid]
 * LDAPユーザを削除
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ uid: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized", errorJa: "権限がありません" },
        { status: 401 },
      );
    }

    const { uid } = await context.params;

    const ldapService = await OpenLdapService.createWithDatabaseConfig();
    const result = await ldapService.deleteUser(uid);

    if (!result.success) {
      const status = result.error === "User not found" ? 404 : 500;
      return NextResponse.json(
        {
          error: result.error,
          errorJa:
            result.error === "User not found"
              ? "ユーザが見つかりません"
              : "ユーザの削除に失敗しました",
        },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
      messageJa: "ユーザを削除しました",
    });
  } catch (error) {
    console.error("Error deleting LDAP user:", error);
    return NextResponse.json(
      {
        error: "Failed to delete LDAP user",
        errorJa: "LDAPユーザの削除に失敗しました",
      },
      { status: 500 },
    );
  }
}
