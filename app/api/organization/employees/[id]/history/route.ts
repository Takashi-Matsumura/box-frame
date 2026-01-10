import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { changeTypeMapping } from "@/lib/history/types";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization/employees/[id]/history
 *
 * 社員のキャリア履歴を取得
 *
 * クエリパラメータ:
 * - limit: 取得件数（デフォルト: 50）
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // 社員の存在確認
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        name: true,
        nameKana: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // 履歴を取得（時系列昇順）
    const histories = await prisma.employeeHistory.findMany({
      where: { employeeId: id },
      orderBy: { validFrom: "asc" },
      take: limit,
    });

    // 変更ログも取得（フィールド単位の変更詳細）
    const changeLogs = await prisma.changeLog.findMany({
      where: {
        entityType: "Employee",
        entityId: id,
      },
      orderBy: { changedAt: "asc" },
      take: limit * 5, // 履歴1件に複数のフィールド変更があるため多めに取得
    });

    // 履歴をフォーマット
    const formattedHistories = histories.map((history) => {
      // この履歴に関連する変更ログを取得
      const relatedLogs = changeLogs.filter(
        (log) =>
          log.changedAt.getTime() >= history.validFrom.getTime() - 1000 &&
          log.changedAt.getTime() <= history.validFrom.getTime() + 1000,
      );

      return {
        id: history.id,
        validFrom: history.validFrom,
        validTo: history.validTo,
        changeType: history.changeType,
        changeTypeJa:
          changeTypeMapping[history.changeType] || history.changeType,
        changeReason: history.changeReason,
        // 所属情報
        department: history.departmentName,
        section: history.sectionName,
        course: history.courseName,
        // 役職情報
        position: history.position,
        positionCode: history.positionCode,
        // 資格等級
        qualificationGrade: history.qualificationGrade,
        qualificationGradeCode: history.qualificationGradeCode,
        // 雇用区分
        employmentType: history.employmentType,
        employmentTypeCode: history.employmentTypeCode,
        // 在籍状況
        isActive: history.isActive,
        // 変更詳細
        changes: relatedLogs.map((log) => ({
          fieldName: log.fieldName,
          oldValue: log.oldValue,
          newValue: log.newValue,
          description: log.changeDescription,
        })),
        // メタ情報
        changedBy: history.changedBy,
        changedAt: history.changedAt,
      };
    });

    return NextResponse.json({
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        nameKana: employee.nameKana,
      },
      histories: formattedHistories,
      total: histories.length,
    });
  } catch (error) {
    console.error("Error fetching employee history:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee history" },
      { status: 500 },
    );
  }
}
