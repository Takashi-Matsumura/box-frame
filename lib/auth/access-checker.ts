import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/**
 * ユーザが特定のメニューパスにアクセスする権限があるかチェックする
 *
 * 以下の条件のいずれかを満たす場合、アクセスを許可：
 * 1. ユーザのロールが指定されたrolesに含まれる
 * 2. ユーザが有効なアクセスキーを持ち、そのアクセスキーがmenuPathへのアクセスを許可している
 *
 * @param session - NextAuthのセッション
 * @param menuPath - アクセスしようとしているメニューのパス（例: "/analytics"）
 * @param roles - 許可するロールの配列（デフォルト: ["MANAGER", "ADMIN"]）
 * @returns アクセス権限がある場合true、ない場合false
 */
export async function checkAccess(
  session: Session | null,
  menuPath: string,
  roles: string[] = ["MANAGER", "ADMIN"],
): Promise<boolean> {
  if (!session?.user) {
    return false;
  }

  // 1. ロールチェック
  const userRole = session.user.role;
  if (roles.includes(userRole || "")) {
    return true;
  }

  // 2. アクセスキーチェック
  try {
    const userId = session.user.id;

    const userAccessKeys = await prisma.userAccessKey.findMany({
      where: {
        userId,
      },
      include: {
        accessKey: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // 有効なアクセスキーを確認
    for (const uak of userAccessKeys) {
      const ak = uak.accessKey;

      // アクセスキーが有効かチェック
      if (!ak.isActive || new Date(ak.expiresAt) < new Date()) {
        continue;
      }

      // 方法1: AccessKey.menuPaths (JSON) からチェック
      if (ak.menuPaths) {
        try {
          const menuPaths = JSON.parse(ak.menuPaths) as string[];
          if (menuPaths.includes(menuPath)) {
            return true;
          }
        } catch {
          // JSON パースエラーは無視
        }
      }

      // 方法2: AccessKeyPermission からチェック
      for (const akp of ak.permissions) {
        // 新しい粒度システム（Phase 2）
        if (akp.menuPath) {
          // menuPath が直接設定されている場合
          if (akp.menuPath === menuPath) {
            return true;
          }
          // モジュールレベルの権限の場合、配下の全メニューにアクセス可能
          if (akp.granularity === "module" && akp.moduleId) {
            // TODO: モジュールIDからメニューパスを検証するロジックを追加
            return true;
          }
        }
        // 後方互換性：旧 permission リレーション経由
        else if (akp.permission?.menuPath === menuPath) {
          return true;
        }
      }
    }
  } catch (error) {
    console.error(
      "[checkAccess] Error checking access key permissions:",
      error,
    );
    // エラーが発生してもロールチェックは済んでいるので、falseを返す
  }

  return false;
}
