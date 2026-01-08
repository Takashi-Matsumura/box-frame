import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 評価対象外の部門名
const EXCLUDED_DEPARTMENT_NAMES = ["役員・顧問"];

/**
 * GET /api/evaluation/available-evaluators
 * カスタム評価者として選択可能な社員一覧を取得
 * 役職に「長」「マネージャー」「リーダー」などが含まれる社員を抽出
 * 各組織の責任者（本部長・部長・課長）情報も含める
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Manager以上のロールが必要
    const allowedRoles = ["MANAGER", "EXECUTIVE", "ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 組織の責任者情報を取得
    const [departments, sections, courses] = await Promise.all([
      prisma.department.findMany({
        where: { managerId: { not: null } },
        select: { managerId: true },
      }),
      prisma.section.findMany({
        where: { managerId: { not: null } },
        select: { managerId: true },
      }),
      prisma.course.findMany({
        where: { managerId: { not: null } },
        select: { managerId: true },
      }),
    ]);

    // 責任者IDのセットを作成
    const departmentManagerIds = new Set(departments.map((d) => d.managerId!));
    const sectionManagerIds = new Set(sections.map((s) => s.managerId!));
    const courseManagerIds = new Set(courses.map((c) => c.managerId!));

    // 全責任者IDのセット（役員でも責任者なら含める）
    const allManagerIds = new Set([
      ...departmentManagerIds,
      ...sectionManagerIds,
      ...courseManagerIds,
    ]);

    // 評価者候補として以下を取得:
    // 1. 役職に管理職を示すキーワードを含む社員
    // 2. 組織の責任者として登録されている社員（役員でも本部長等を兼務している場合）
    const evaluators = await prisma.employee.findMany({
      where: {
        isActive: true,
        OR: [
          // 管理職キーワードを含む社員（役員・顧問部門を除く）
          {
            department: {
              name: { notIn: EXCLUDED_DEPARTMENT_NAMES },
            },
            OR: [
              { position: { contains: "長" } },
              { position: { contains: "マネージャー" } },
              { position: { contains: "リーダー" } },
              { position: { contains: "Manager" } },
              { position: { contains: "Leader" } },
              { position: { contains: "Chief" } },
              { position: { contains: "Director" } },
              { position: { contains: "Head" } },
            ],
          },
          // 組織の責任者として登録されている社員（役員でも含める）
          {
            id: { in: Array.from(allManagerIds) },
          },
        ],
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true } },
        course: { select: { id: true, name: true, code: true } },
      },
      orderBy: [
        { department: { code: "asc" } },
        { section: { code: "asc" } },
        { course: { code: "asc" } },
        { positionCode: "asc" },
      ],
    });

    // 評価者候補が少ない場合は全社員を返す
    let employees = evaluators;
    if (evaluators.length < 5) {
      employees = await prisma.employee.findMany({
        where: {
          isActive: true,
          department: {
            name: { notIn: EXCLUDED_DEPARTMENT_NAMES },
          },
        },
        include: {
          department: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true, code: true } },
          course: { select: { id: true, name: true, code: true } },
        },
        orderBy: [
          { department: { code: "asc" } },
          { section: { code: "asc" } },
          { course: { code: "asc" } },
          { positionCode: "asc" },
        ],
      });
    }

    const result = employees.map((emp) => ({
      id: emp.id,
      employeeId: emp.employeeId,
      name: emp.name,
      position: emp.position,
      positionCode: emp.positionCode,
      departmentId: emp.departmentId,
      departmentName: emp.department?.name || null,
      sectionId: emp.sectionId,
      sectionName: emp.section?.name || null,
      courseId: emp.courseId,
      courseName: emp.course?.name || null,
      // 責任者フラグ
      isDepartmentManager: departmentManagerIds.has(emp.id),
      isSectionManager: sectionManagerIds.has(emp.id),
      isCourseManager: courseManagerIds.has(emp.id),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch available evaluators:", error);
    return NextResponse.json(
      { error: "Failed to fetch available evaluators" },
      { status: 500 }
    );
  }
}
