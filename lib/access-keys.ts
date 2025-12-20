import { prisma } from "./prisma";

/**
 * Get menu paths that the user has access to via Access Keys
 * @param userId - The user ID
 * @returns Array of menu paths the user can access
 */
export async function getUserAccessibleMenus(
  userId: string,
): Promise<string[]> {
  try {
    // Get all active Access Keys registered by this user
    const userAccessKeys = await prisma.userAccessKey.findMany({
      where: {
        userId,
      },
      include: {
        accessKey: true,
      },
    });

    const accessibleMenus: string[] = [];

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

      // Parse menuPaths from JSON string
      try {
        const menuPaths = JSON.parse(accessKey.menuPaths) as string[];
        accessibleMenus.push(...menuPaths);
      } catch (error) {
        console.error("Error parsing menuPaths:", error);
      }
    }

    // Return unique menu paths
    return [...new Set(accessibleMenus)];
  } catch (error) {
    console.error("Error getting user accessible menus:", error);
    return [];
  }
}
