import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEvaluatees } from "@/lib/addon-modules/evaluation";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/evaluation/evaluatees
 * 被評価者一覧を取得
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const periodId = url.searchParams.get("periodId");

    if (!periodId) {
      return NextResponse.json(
        { error: "periodId is required" },
        { status: 400 },
      );
    }

    // デバッグログ
    console.log(
      "[evaluatees] Session user:",
      session.user?.email,
      "Role:",
      session.user?.role,
    );

    // 対象外社員のIDを取得（periodIdが一致するか、全期間対象外の場合）
    const exclusions = await prisma.evaluationExclusion.findMany({
      where: {
        OR: [
          { periodId },
          { periodId: null }, // 全期間対象外
        ],
      },
      select: { employeeId: true },
    });
    const excludedEmployeeIds = exclusions.map((e) => e.employeeId);

    // ADMINの場合は全評価を取得（Employeeの紐付け不要）
    if (session.user?.role === "ADMIN") {
      console.log("[evaluatees] ADMIN user detected, fetching all evaluations");
      const evaluations = await prisma.evaluation.findMany({
        where: {
          periodId,
          // 対象外社員を除外
          employeeId: { notIn: excludedEmployeeIds },
        },
        include: {
          employee: {
            include: {
              department: true,
              section: true,
              course: true,
            },
          },
        },
      });

      // カスタムソート: 本部コード → 部コード → 課コード → 役職コード（000は最後） → 氏名
      const sortedEvaluations = evaluations.sort((a, b) => {
        const empA = a.employee;
        const empB = b.employee;

        // 1. 本部コード
        const deptCodeA = empA.department?.code || "zz";
        const deptCodeB = empB.department?.code || "zz";
        if (deptCodeA !== deptCodeB) return deptCodeA.localeCompare(deptCodeB);

        // 2. 部コード（nullは本部直属として先頭）
        const secCodeA = empA.section?.code || "";
        const secCodeB = empB.section?.code || "";
        if (!secCodeA && secCodeB) return -1;
        if (secCodeA && !secCodeB) return 1;
        if (secCodeA !== secCodeB) return secCodeA.localeCompare(secCodeB);

        // 3. 課コード（nullは部直属として先頭）
        const courseCodeA = empA.course?.code || "";
        const courseCodeB = empB.course?.code || "";
        if (!courseCodeA && courseCodeB) return -1;
        if (courseCodeA && !courseCodeB) return 1;
        if (courseCodeA !== courseCodeB)
          return courseCodeA.localeCompare(courseCodeB);

        // 4. 役職コード（000=一般は最後、それ以外は昇順）
        const posCodeA = empA.positionCode || "999";
        const posCodeB = empB.positionCode || "999";
        const isGeneralA = posCodeA === "000";
        const isGeneralB = posCodeB === "000";
        if (isGeneralA && !isGeneralB) return 1;
        if (!isGeneralA && isGeneralB) return -1;
        if (posCodeA !== posCodeB) return posCodeA.localeCompare(posCodeB);

        // 5. 氏名（フリガナ優先）
        const nameA = empA.nameKana || empA.name;
        const nameB = empB.nameKana || empB.name;
        return nameA.localeCompare(nameB, "ja");
      });

      return NextResponse.json(sortedEvaluations);
    }

    // 評価者のEmployeeを取得
    const evaluatorEmployee = await prisma.employee.findFirst({
      where: {
        email: session.user?.email,
        isActive: true,
      },
    });

    if (!evaluatorEmployee) {
      return NextResponse.json(
        { error: "Evaluator employee not found" },
        { status: 404 },
      );
    }

    // 被評価者IDリストを取得
    const evaluateeIds = await getEvaluatees(evaluatorEmployee.id, periodId);

    // 対象外社員を除外したIDリスト
    const filteredEvaluateeIds = evaluateeIds.filter(
      (id) => !excludedEmployeeIds.includes(id),
    );

    // 評価データを取得
    const evaluations = await prisma.evaluation.findMany({
      where: {
        periodId,
        employeeId: { in: filteredEvaluateeIds },
      },
      include: {
        employee: {
          include: {
            department: true,
            section: true,
            course: true,
          },
        },
      },
      orderBy: [
        { employee: { department: { name: "asc" } } },
        { employee: { section: { name: "asc" } } },
        { employee: { name: "asc" } },
      ],
    });

    // 進捗統計
    const stats = {
      total: evaluations.length,
      pending: evaluations.filter((e) => e.status === "PENDING").length,
      inProgress: evaluations.filter((e) => e.status === "IN_PROGRESS").length,
      completed: evaluations.filter((e) => e.status === "COMPLETED").length,
      confirmed: evaluations.filter((e) => e.status === "CONFIRMED").length,
    };

    return NextResponse.json({
      evaluations,
      stats,
    });
  } catch (error) {
    console.error("Error fetching evaluatees:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluatees" },
      { status: 500 },
    );
  }
}
