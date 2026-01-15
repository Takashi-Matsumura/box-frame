import { prisma } from "./prisma";

/**
 * アクセスキーによるアクセス権限情報
 */
export interface AccessKeyPermissions {
  menuPaths: string[];
  // menuPath -> tabIds のマッピング（タブレベルの権限がある場合）
  tabPermissions: Record<string, string[]>;
}

/**
 * Get menu paths and tab permissions that the user has access to via Access Keys
 * @param userId - The user ID
 * @returns AccessKeyPermissions object containing menu paths and tab permissions
 */
export async function getUserAccessKeyPermissions(
  userId: string,
): Promise<AccessKeyPermissions> {
  const result: AccessKeyPermissions = {
    menuPaths: [],
    tabPermissions: {},
  };

  try {
    // Get all active Access Keys registered by this user
    const userAccessKeys = await prisma.userAccessKey.findMany({
      where: {
        userId,
      },
      include: {
        accessKey: {
          include: {
            permissions: true, // AccessKeyPermission を含める
          },
        },
      },
    });

    for (const userAccessKey of userAccessKeys) {
      const { accessKey } = userAccessKey;

      // Skip if Access Key is not active
      if (!accessKey.isActive) continue;

      // Skip if Access Key has expired
      if (new Date(accessKey.expiresAt) < new Date()) continue;

      // Skip if Access Key is not for this user (safety check)
      if (accessKey.targetUserId && accessKey.targetUserId !== userId) {
        continue;
      }

      // 方法1: 後方互換性 - menuPaths JSON からパース
      if (accessKey.menuPaths) {
        try {
          const menuPaths = JSON.parse(accessKey.menuPaths) as string[];
          result.menuPaths.push(...menuPaths);
        } catch (error) {
          console.error("Error parsing menuPaths:", error);
        }
      }

      // 方法2: Phase 2 - AccessKeyPermission からメニューパス・タブを取得
      for (const permission of accessKey.permissions) {
        if (permission.menuPath) {
          result.menuPaths.push(permission.menuPath);

          // タブレベルの権限がある場合
          if (permission.granularity === "tab" && permission.tabId) {
            if (!result.tabPermissions[permission.menuPath]) {
              result.tabPermissions[permission.menuPath] = [];
            }
            result.tabPermissions[permission.menuPath].push(permission.tabId);
          }
        }
      }
    }

    // Remove duplicates
    result.menuPaths = [...new Set(result.menuPaths)];
    for (const menuPath in result.tabPermissions) {
      result.tabPermissions[menuPath] = [
        ...new Set(result.tabPermissions[menuPath]),
      ];
    }

    return result;
  } catch (error) {
    console.error("Error getting user access key permissions:", error);
    return result;
  }
}

/**
 * Get menu paths that the user has access to via Access Keys
 * @param userId - The user ID
 * @returns Array of menu paths the user can access
 */
export async function getUserAccessibleMenus(
  userId: string,
): Promise<string[]> {
  const permissions = await getUserAccessKeyPermissions(userId);
  return permissions.menuPaths;
}
