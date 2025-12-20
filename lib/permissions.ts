import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Check if a user has a specific permission through registered Access keys
 */
export async function hasPermission(
  userId: string,
  permissionName: string,
): Promise<boolean> {
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

  // Check if any of the user's registered Access keys grant the permission
  for (const userAccessKey of userAccessKeys) {
    const { accessKey } = userAccessKey;

    // Skip if Access key is not active
    if (!accessKey.isActive) continue;

    // Skip if Access key has expired
    if (new Date(accessKey.expiresAt) < new Date()) continue;

    // Check if this Access key has the required permission
    const hasRequiredPermission = accessKey.permissions.some(
      (accessKeyPermission) =>
        accessKeyPermission.permission.name === permissionName,
    );

    if (hasRequiredPermission) {
      return true;
    }
  }

  return false;
}

/**
 * Get all permissions a user has through registered Access keys
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
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

  const permissionSet = new Set<string>();

  for (const userAccessKey of userAccessKeys) {
    const { accessKey } = userAccessKey;

    // Skip if Access key is not active or expired
    if (!accessKey.isActive || new Date(accessKey.expiresAt) < new Date()) {
      continue;
    }

    // Add all permissions from this Access key
    for (const accessKeyPermission of accessKey.permissions) {
      permissionSet.add(accessKeyPermission.permission.name);
    }
  }

  return Array.from(permissionSet);
}

/**
 * Get all permissions details for a user
 */
export async function getUserPermissionDetails(userId: string) {
  const permissions = await prisma.permission.findMany({
    orderBy: {
      displayName: "asc",
    },
  });

  const userPermissions = await getUserPermissions(userId);

  return permissions.map((permission) => ({
    ...permission,
    hasAccess: userPermissions.includes(permission.name),
  }));
}
