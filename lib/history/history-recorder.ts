/**
 * 履歴記録サービス
 * 変更履歴をデータベースに記録
 */

import { prisma } from "@/lib/prisma";
import type { ChangeType, Prisma } from "@prisma/client";
import type {
  EntityType,
  ChangeLogEntry,
  FieldChange,
  RecordHistoryOptions,
} from "./types";

/**
 * 履歴記録クラス
 */
export class HistoryRecorder {
  /**
   * 変更ログを記録
   */
  static async recordChangeLog(
    entry: ChangeLogEntry
  ): Promise<void> {
    await prisma.changeLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        changeType: entry.changeType,
        fieldName: entry.fieldName,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        changeDescription: entry.changeDescription,
        batchId: entry.batchId,
        changedBy: entry.changedBy,
      },
    });
  }

  /**
   * 複数の変更ログを一括記録
   */
  static async recordChangeLogs(
    entries: ChangeLogEntry[]
  ): Promise<void> {
    if (entries.length === 0) return;

    await prisma.changeLog.createMany({
      data: entries.map((entry) => ({
        entityType: entry.entityType,
        entityId: entry.entityId,
        changeType: entry.changeType,
        fieldName: entry.fieldName,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        changeDescription: entry.changeDescription,
        batchId: entry.batchId,
        changedBy: entry.changedBy,
      })),
    });
  }

  /**
   * フィールド変更を変更ログエントリに変換
   */
  static createChangeLogEntries(
    entityType: EntityType,
    entityId: string,
    changes: FieldChange[],
    changeType: ChangeType,
    options: RecordHistoryOptions
  ): ChangeLogEntry[] {
    return changes.map((change) => ({
      entityType,
      entityId,
      changeType,
      fieldName: change.fieldName,
      oldValue: change.oldValue || undefined,
      newValue: change.newValue || undefined,
      changeDescription: `${change.fieldNameJa}: ${change.oldValue || "(なし)"} → ${change.newValue || "(なし)"}`,
      batchId: options.batchId,
      changedBy: options.changedBy,
    }));
  }

  /**
   * バッチIDを生成
   */
  static generateBatchId(): string {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "");
    const random = Math.random().toString(36).substring(2, 8);
    return `BATCH-${timestamp}-${random}`;
  }

  /**
   * バッチの変更ログを取得
   */
  static async getChangeLogsByBatchId(batchId: string) {
    return prisma.changeLog.findMany({
      where: { batchId },
      orderBy: { changedAt: "asc" },
    });
  }

  /**
   * エンティティの変更履歴を取得
   */
  static async getEntityHistory(
    entityType: EntityType,
    entityId: string,
    limit = 50
  ) {
    return prisma.changeLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { changedAt: "desc" },
      take: limit,
    });
  }

  /**
   * 社員の所属履歴を取得
   */
  static async getEmployeeHistories(
    employeeId: string,
    limit = 50
  ) {
    return prisma.employeeHistory.findMany({
      where: { employeeId },
      orderBy: { validFrom: "desc" },
      take: limit,
    });
  }

  /**
   * 組織の履歴を取得
   */
  static async getOrganizationHistories(
    organizationId: string,
    limit = 50
  ) {
    return prisma.organizationHistory.findMany({
      where: { organizationId },
      orderBy: { validFrom: "desc" },
      take: limit,
    });
  }

  /**
   * 期間指定で変更ログを取得
   */
  static async getChangeLogsByDateRange(
    startDate: Date,
    endDate: Date,
    entityType?: EntityType
  ) {
    return prisma.changeLog.findMany({
      where: {
        changedAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(entityType && { entityType }),
      },
      orderBy: { changedAt: "desc" },
    });
  }

  /**
   * 変更タイプ別に変更ログを取得
   */
  static async getChangeLogsByType(
    changeType: ChangeType,
    limit = 100
  ) {
    return prisma.changeLog.findMany({
      where: { changeType },
      orderBy: { changedAt: "desc" },
      take: limit,
    });
  }

  /**
   * 最近の変更ログを取得
   */
  static async getRecentChangeLogs(limit = 50) {
    return prisma.changeLog.findMany({
      orderBy: { changedAt: "desc" },
      take: limit,
    });
  }

  /**
   * 変更統計を取得
   */
  static async getChangeStatistics(startDate?: Date, endDate?: Date) {
    const where: Prisma.ChangeLogWhereInput = {};
    if (startDate || endDate) {
      where.changedAt = {};
      if (startDate) where.changedAt.gte = startDate;
      if (endDate) where.changedAt.lte = endDate;
    }

    const [
      totalChanges,
      changesByType,
      changesByEntity,
    ] = await Promise.all([
      prisma.changeLog.count({ where }),
      prisma.changeLog.groupBy({
        by: ["changeType"],
        where,
        _count: true,
      }),
      prisma.changeLog.groupBy({
        by: ["entityType"],
        where,
        _count: true,
      }),
    ]);

    return {
      totalChanges,
      changesByType: changesByType.reduce(
        (acc, item) => {
          acc[item.changeType] = item._count;
          return acc;
        },
        {} as Record<ChangeType, number>
      ),
      changesByEntity: changesByEntity.reduce(
        (acc, item) => {
          acc[item.entityType] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }
}
