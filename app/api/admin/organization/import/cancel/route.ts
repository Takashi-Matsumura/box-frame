import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/organization/import/cancel
 *
 * 最新のインポートをキャンセル（ロールバック）
 * - 保留中のインポート（pendingSnapshotAfterImport）を確認
 * - batchIdを使って変更をロールバック
 * - EmployeeHistoryとChangeLogの該当レコードを削除
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 保留中のインポート情報を取得
    const pendingSetting = await prisma.systemSetting.findUnique({
      where: { key: "pendingSnapshotAfterImport" },
    });

    if (!pendingSetting) {
      return NextResponse.json(
        { error: "No pending import found" },
        { status: 400 },
      );
    }

    const pendingData = JSON.parse(pendingSetting.value);

    if (!pendingData.pending || !pendingData.batchId) {
      return NextResponse.json(
        { error: "No pending import to cancel" },
        { status: 400 },
      );
    }

    const { batchId } = pendingData;

    const result = await prisma.$transaction(async (tx) => {
      // 1. このbatchIdの変更ログを取得
      const changeLogs = await tx.changeLog.findMany({
        where: { batchId },
        orderBy: { changedAt: "desc" }, // 最新の変更から逆順に処理
      });

      // 変更対象の社員IDを収集（重複排除）
      const employeeIds = [...new Set(changeLogs.map((log) => log.entityId))];

      let restoredCount = 0;
      let deletedNewEmployees = 0;
      let reactivatedCount = 0;

      for (const employeeId of employeeIds) {
        // 社員の変更ログを取得
        const employeeLogs = changeLogs.filter(
          (log) => log.entityId === employeeId,
        );

        // 最初の変更タイプを確認
        const firstChangeType =
          employeeLogs[employeeLogs.length - 1]?.changeType;

        if (firstChangeType === "CREATE") {
          // 新規作成された社員は削除
          // まず関連するEmployeeHistoryを削除
          await tx.employeeHistory.deleteMany({
            where: { employeeId },
          });

          // 社員を削除
          await tx.employee.delete({
            where: { id: employeeId },
          });

          deletedNewEmployees++;
        } else if (firstChangeType === "RETIREMENT") {
          // 退職処理された社員を復活
          await tx.employee.update({
            where: { id: employeeId },
            data: { isActive: true },
          });

          // このバッチで作成された履歴を削除
          await tx.employeeHistory.deleteMany({
            where: {
              employeeId,
              changedBy: pendingData.importedBy,
              changedAt: {
                gte: new Date(pendingData.importedAt),
              },
            },
          });

          // 直前の履歴のvalidToをnullに戻す
          const latestHistory = await tx.employeeHistory.findFirst({
            where: { employeeId },
            orderBy: { validFrom: "desc" },
          });

          if (latestHistory) {
            await tx.employeeHistory.update({
              where: { id: latestHistory.id },
              data: { validTo: null },
            });
          }

          reactivatedCount++;
        } else {
          // 更新・異動・昇進などの場合は、直前の状態に戻す
          // このバッチで作成されたEmployeeHistoryを取得
          const batchHistories = await tx.employeeHistory.findMany({
            where: {
              employeeId,
              changedBy: pendingData.importedBy,
              changedAt: {
                gte: new Date(pendingData.importedAt),
              },
            },
            orderBy: { validFrom: "desc" },
          });

          if (batchHistories.length > 0) {
            // このバッチで作成された履歴を削除
            await tx.employeeHistory.deleteMany({
              where: {
                id: { in: batchHistories.map((h) => h.id) },
              },
            });

            // 直前の履歴を取得
            const previousHistory = await tx.employeeHistory.findFirst({
              where: { employeeId },
              orderBy: { validFrom: "desc" },
            });

            if (previousHistory) {
              // validToをnullに戻す
              await tx.employeeHistory.update({
                where: { id: previousHistory.id },
                data: { validTo: null },
              });

              // 社員データを直前の状態に戻す
              // 部門・セクション・コースのIDを取得
              const department = previousHistory.departmentId
                ? await tx.department.findUnique({
                    where: { id: previousHistory.departmentId },
                  })
                : null;
              const section = previousHistory.sectionId
                ? await tx.section.findUnique({
                    where: { id: previousHistory.sectionId },
                  })
                : null;
              const course = previousHistory.courseId
                ? await tx.course.findUnique({
                    where: { id: previousHistory.courseId },
                  })
                : null;

              await tx.employee.update({
                where: { id: employeeId },
                data: {
                  name: previousHistory.name,
                  nameKana: previousHistory.nameKana || undefined,
                  email: previousHistory.email || undefined,
                  phone: previousHistory.phone || undefined,
                  position: previousHistory.position || undefined,
                  positionCode: previousHistory.positionCode || undefined,
                  qualificationGrade:
                    previousHistory.qualificationGrade || undefined,
                  qualificationGradeCode:
                    previousHistory.qualificationGradeCode || undefined,
                  employmentType: previousHistory.employmentType || undefined,
                  employmentTypeCode:
                    previousHistory.employmentTypeCode || undefined,
                  departmentCode: previousHistory.departmentCode || undefined,
                  isActive: previousHistory.isActive,
                  departmentId: previousHistory.departmentId || undefined,
                  sectionId: previousHistory.sectionId || undefined,
                  courseId: previousHistory.courseId || undefined,
                },
              });

              restoredCount++;
            }
          }
        }
      }

      // 2. 変更ログを削除
      await tx.changeLog.deleteMany({
        where: { batchId },
      });

      // 3. 保留中フラグをクリア
      await tx.systemSetting.update({
        where: { key: "pendingSnapshotAfterImport" },
        data: {
          value: JSON.stringify({
            pending: false,
            cancelledAt: new Date().toISOString(),
            cancelledBy: session.user?.id || "admin",
            originalBatchId: batchId,
          }),
        },
      });

      // 4. 組織のステータスをDRAFTにリセット
      const org = await tx.organization.findFirst({
        where: { name: "Default Organization" },
      });

      if (org) {
        await tx.organization.update({
          where: { id: org.id },
          data: {
            status: "DRAFT",
            publishAt: null,
            publishedAt: null,
          },
        });
      }

      return {
        batchId,
        changeLogsDeleted: changeLogs.length,
        employeesAffected: employeeIds.length,
        newEmployeesDeleted: deletedNewEmployees,
        employeesRestored: restoredCount,
        employeesReactivated: reactivatedCount,
      };
    });

    return NextResponse.json({
      success: true,
      message: "インポートをキャンセルしました",
      data: result,
    });
  } catch (error) {
    console.error("Error cancelling import:", error);
    return NextResponse.json(
      { error: "Failed to cancel import" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/organization/import/cancel
 *
 * キャンセル可能なインポートがあるか確認
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 保留中のインポート情報を取得
    const pendingSetting = await prisma.systemSetting.findUnique({
      where: { key: "pendingSnapshotAfterImport" },
    });

    if (!pendingSetting) {
      return NextResponse.json({
        canCancel: false,
        message: "No import history found",
      });
    }

    const pendingData = JSON.parse(pendingSetting.value);

    if (!pendingData.pending || !pendingData.batchId) {
      return NextResponse.json({
        canCancel: false,
        message: "No pending import to cancel",
        lastImport: pendingData.cancelledAt
          ? {
              cancelledAt: pendingData.cancelledAt,
              cancelledBy: pendingData.cancelledBy,
            }
          : null,
      });
    }

    // 変更ログの件数を取得
    const changeLogCount = await prisma.changeLog.count({
      where: { batchId: pendingData.batchId },
    });

    return NextResponse.json({
      canCancel: true,
      batchId: pendingData.batchId,
      importedAt: pendingData.importedAt,
      importedBy: pendingData.importedBy,
      changeLogCount,
    });
  } catch (error) {
    console.error("Error checking cancel status:", error);
    return NextResponse.json(
      { error: "Failed to check cancel status" },
      { status: 500 },
    );
  }
}
