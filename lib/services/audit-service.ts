import { prisma } from "@/lib/prisma";

// 監査ログのカテゴリ
export type AuditCategory =
  | "AUTH"
  | "USER_MANAGEMENT"
  | "SYSTEM_SETTING"
  | "MODULE";

// 監査ログのアクション
export type AuditAction =
  // AUTH
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  // USER_MANAGEMENT
  | "USER_CREATE"
  | "USER_DELETE"
  | "USER_ROLE_CHANGE"
  | "PASSWORD_RESET"
  | "PASSWORD_CHANGE"
  | "TWO_FACTOR_ENABLE"
  | "TWO_FACTOR_DISABLE"
  // SYSTEM_SETTING
  | "OAUTH_TOGGLE"
  | "LDAP_CONFIG_CHANGE"
  | "AI_CONFIG_UPDATE"
  | "ANNOUNCEMENT_CREATE"
  | "ANNOUNCEMENT_UPDATE"
  | "ANNOUNCEMENT_DELETE"
  // MODULE
  | "MODULE_TOGGLE";

export interface AuditLogInput {
  action: AuditAction;
  category: AuditCategory;
  userId?: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface GetLogsOptions {
  category?: AuditCategory;
  action?: AuditAction;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditService {
  /**
   * 監査ログを記録
   */
  static async log(input: AuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: input.action,
          category: input.category,
          userId: input.userId,
          targetId: input.targetId,
          targetType: input.targetType,
          details: input.details ? JSON.stringify(input.details) : null,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      // 監査ログの記録失敗はメイン処理に影響させない
      console.error("[AuditService] Failed to create audit log:", error);
    }
  }

  /**
   * 監査ログを取得（ページネーション付き）
   */
  static async getLogs(options: GetLogsOptions = {}) {
    const {
      category,
      action,
      userId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = options;

    const where: {
      category?: string;
      action?: string;
      userId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (category) where.category = category;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * 古いログを削除（保持期間: デフォルト90日）
   */
  static async cleanupOldLogs(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}
