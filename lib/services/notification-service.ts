import type {
  NotificationPriority,
  NotificationType,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  titleJa?: string;
  message: string;
  messageJa?: string;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelJa?: string;
  source?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

interface BroadcastNotificationInput
  extends Omit<CreateNotificationInput, "userId"> {
  userIds?: string[];
  role?: Role;
  broadcast?: boolean;
}

export class NotificationService {
  /**
   * 単一ユーザへの通知作成
   */
  static async create(input: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        priority: input.priority ?? "NORMAL",
        title: input.title,
        titleJa: input.titleJa,
        message: input.message,
        messageJa: input.messageJa,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        actionLabelJa: input.actionLabelJa,
        source: input.source,
        sourceId: input.sourceId,
        metadata: input.metadata
          ? JSON.parse(JSON.stringify(input.metadata))
          : undefined,
        expiresAt: input.expiresAt,
      },
    });
  }

  /**
   * 複数ユーザへの通知作成（ブロードキャスト）
   */
  static async broadcast(input: BroadcastNotificationInput) {
    let userIds: string[] = [];

    if (input.userIds) {
      userIds = input.userIds;
    } else if (input.role) {
      const users = await prisma.user.findMany({
        where: { role: input.role },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    } else if (input.broadcast) {
      const users = await prisma.user.findMany({
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    if (userIds.length === 0) return { count: 0 };

    const notifications = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: input.type,
        priority: input.priority ?? "NORMAL",
        title: input.title,
        titleJa: input.titleJa,
        message: input.message,
        messageJa: input.messageJa,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        actionLabelJa: input.actionLabelJa,
        source: input.source,
        sourceId: input.sourceId,
        metadata: input.metadata
          ? JSON.parse(JSON.stringify(input.metadata))
          : undefined,
        expiresAt: input.expiresAt,
      })),
    });

    return notifications;
  }

  /**
   * システム通知（全ユーザ向け）
   */
  static async systemNotify(options: {
    title: string;
    titleJa?: string;
    message: string;
    messageJa?: string;
    priority?: NotificationPriority;
    actionUrl?: string;
    actionLabel?: string;
    actionLabelJa?: string;
  }) {
    return NotificationService.broadcast({
      ...options,
      type: "SYSTEM",
      broadcast: true,
      source: "SYSTEM",
    });
  }

  /**
   * セキュリティ通知（特定ユーザ向け）
   */
  static async securityNotify(
    userId: string,
    options: {
      title: string;
      titleJa?: string;
      message: string;
      messageJa?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return NotificationService.create({
      ...options,
      userId,
      type: "SECURITY",
      priority: "HIGH",
      source: "SECURITY",
    });
  }

  /**
   * アクション通知（承認依頼等）
   */
  static async actionNotify(
    userId: string,
    options: {
      title: string;
      titleJa?: string;
      message: string;
      messageJa?: string;
      actionUrl: string;
      actionLabel: string;
      actionLabelJa?: string;
      source?: string;
      sourceId?: string;
    },
  ) {
    return NotificationService.create({
      ...options,
      userId,
      type: "ACTION",
      priority: "NORMAL",
    });
  }

  /**
   * 期限切れ通知の削除
   */
  static async cleanupExpired() {
    return prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * 古い既読通知の削除
   */
  static async cleanupOldRead(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
  }
}
