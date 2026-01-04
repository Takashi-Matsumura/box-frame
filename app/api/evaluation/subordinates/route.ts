import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 社員をコード順でソートするヘルパー関数
 * 本部コード → 部コード → 課コード → 役職コード → 氏名（ふりがな） の順
 * ※部・課に所属しない社員（本部直属など）は先頭に表示
 */
function sortEmployeesByCode<T extends {
  department?: { code: string | null } | null;
  section?: { code: string | null } | null;
  course?: { code: string | null } | null;
  positionCode?: string | null;
  nameKana?: string | null;
  name: string;
}>(employees: T[]): T[] {
  return employees.sort((a, b) => {
    // 1. 本部コード
    const deptCodeA = a.department?.code || "zz";
    const deptCodeB = b.department?.code || "zz";
    if (deptCodeA !== deptCodeB) {
      return deptCodeA.localeCompare(deptCodeB);
    }
    // 2. 部コード（null=本部直属は先頭に）
    const hasSectionA = !!a.section?.code;
    const hasSectionB = !!b.section?.code;
    if (!hasSectionA && hasSectionB) return -1;  // 本部直属を先に
    if (hasSectionA && !hasSectionB) return 1;
    const secCodeA = a.section?.code || "";
    const secCodeB = b.section?.code || "";
    if (secCodeA !== secCodeB) {
      return secCodeA.localeCompare(secCodeB);
    }
    // 3. 課コード（null=部直属は先頭に）
    const hasCourseA = !!a.course?.code;
    const hasCourseB = !!b.course?.code;
    if (!hasCourseA && hasCourseB) return -1;  // 部直属を先に
    if (hasCourseA && !hasCourseB) return 1;
    const courseCodeA = a.course?.code || "";
    const courseCodeB = b.course?.code || "";
    if (courseCodeA !== courseCodeB) {
      return courseCodeA.localeCompare(courseCodeB);
    }
    // 4. 役職コード（「000」一般社員は最後に、それ以外は昇順）
    const posCodeA = a.positionCode || "999";
    const posCodeB = b.positionCode || "999";
    const isGeneralA = posCodeA === "000";
    const isGeneralB = posCodeB === "000";
    if (isGeneralA && !isGeneralB) return 1;
    if (!isGeneralA && isGeneralB) return -1;
    if (posCodeA !== posCodeB) {
      return posCodeA.localeCompare(posCodeB);
    }
    // 5. 氏名（ふりがな優先、なければ漢字名）
    const nameA = a.nameKana || a.name;
    const nameB = b.nameKana || b.name;
    return nameA.localeCompare(nameB, "ja");
  });
}

/**
 * デフォルト評価者を決定するヘルパー関数
 * ルール:
 * - 課長の場合 → 部長が評価者
 * - 部長の場合 → 本部長が評価者
 * - 本部長の場合 → 自分自身（これ以上のレイヤーがないため）
 * - 一般社員の場合 → 課長 → 部長 → 本部長 の優先順位
 */
function getDefaultManager(
  employeeId: string,
  courseManager: { id: string; name: string; position: string | null } | null | undefined,
  sectionManager: { id: string; name: string; position: string | null } | null | undefined,
  departmentManager: { id: string; name: string; position: string | null } | null | undefined
): { id: string; name: string; position: string | null } | null {
  // 課長（課の責任者）の場合 → 部長が評価者
  if (courseManager && courseManager.id === employeeId) {
    // 部長がいればその人、いなければ本部長
    return sectionManager || departmentManager || null;
  }

  // 部長（部の責任者）の場合 → 本部長が評価者
  if (sectionManager && sectionManager.id === employeeId) {
    return departmentManager || null;
  }

  // 本部長（本部の責任者）の場合 → 自分自身（これ以上のレイヤーがない）
  if (departmentManager && departmentManager.id === employeeId) {
    return departmentManager;
  }

  // 一般社員の場合 → 課長 → 部長 → 本部長 の優先順位
  return courseManager || sectionManager || departmentManager || null;
}

// 評価対象外の部門名（役員・顧問は評価対象外）
const EXCLUDED_DEPARTMENT_NAMES = ["役員・顧問"];

/**
 * GET /api/evaluation/subordinates
 * 現在のマネージャーの部下一覧を取得
 * UserとEmployeeは直接リレーションがないため、emailで関連付け
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

    // ADMINの場合は全社員を返す（評価対象外部門を除く）
    if (session.user.role === "ADMIN") {
      const allEmployees = await prisma.employee.findMany({
        where: {
          isActive: true,
          department: {
            name: { notIn: EXCLUDED_DEPARTMENT_NAMES },
          },
        },
        include: {
          department: {
            select: {
              name: true,
              code: true,
              manager: { select: { id: true, name: true, position: true } },
            },
          },
          section: {
            select: {
              id: true,
              name: true,
              code: true,
              manager: { select: { id: true, name: true, position: true } },
            },
          },
          course: {
            select: {
              id: true,
              name: true,
              code: true,
              manager: { select: { id: true, name: true, position: true } },
            },
          },
        },
      });

      // 本部コード → 部コード → 課コード → 氏名 の順でソート
      const sortedEmployees = sortEmployeesByCode(allEmployees);

      const result = sortedEmployees.map((emp) => {
        // デフォルト評価者（上長）を決定
        const defaultManager = getDefaultManager(
          emp.id,
          emp.course?.manager,
          emp.section?.manager,
          emp.department?.manager
        );

        return {
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.name,
          position: emp.position,
          positionCode: emp.positionCode,
          departmentId: emp.departmentId,
          sectionId: emp.sectionId,
          departmentCode: emp.department?.code || null,
          departmentName: emp.department?.name || null,
          sectionCode: emp.section?.code || null,
          sectionName: emp.section?.name || null,
          courseCode: emp.course?.code || null,
          courseName: emp.course?.name || null,
          defaultManager,
        };
      });

      return NextResponse.json(result);
    }

    // マネージャーの場合、メールアドレスで社員を特定
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json([]);
    }

    const currentEmployee = await prisma.employee.findUnique({
      where: { email: userEmail },
      include: {
        department: true,
        section: true,
        course: true,
      },
    });

    if (!currentEmployee) {
      // 社員が見つからない場合は全社員を返す（デモ用、評価対象外部門を除く）
      const allEmployees = await prisma.employee.findMany({
        where: {
          isActive: true,
          department: {
            name: { notIn: EXCLUDED_DEPARTMENT_NAMES },
          },
        },
        include: {
          department: {
            select: {
              name: true,
              code: true,
              manager: { select: { id: true, name: true, position: true } },
            },
          },
          section: {
            select: {
              id: true,
              name: true,
              code: true,
              manager: { select: { id: true, name: true, position: true } },
            },
          },
          course: {
            select: {
              id: true,
              name: true,
              code: true,
              manager: { select: { id: true, name: true, position: true } },
            },
          },
        },
      });

      const sortedEmployees = sortEmployeesByCode(allEmployees);

      const result = sortedEmployees.map((emp) => {
        const defaultManager = getDefaultManager(
          emp.id,
          emp.course?.manager,
          emp.section?.manager,
          emp.department?.manager
        );

        return {
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.name,
          position: emp.position,
          positionCode: emp.positionCode,
          departmentId: emp.departmentId,
          sectionId: emp.sectionId,
          departmentCode: emp.department?.code || null,
          departmentName: emp.department?.name || null,
          sectionCode: emp.section?.code || null,
          sectionName: emp.section?.name || null,
          courseCode: emp.course?.code || null,
          courseName: emp.course?.name || null,
          defaultManager,
        };
      });

      return NextResponse.json(result);
    }

    // 同じ部門内の社員を取得（評価対象外部門を除く）
    const subordinates = await prisma.employee.findMany({
      where: {
        isActive: true,
        id: { not: currentEmployee.id },
        department: {
          name: { notIn: EXCLUDED_DEPARTMENT_NAMES },
        },
        OR: [
          { departmentId: currentEmployee.departmentId },
          { sectionId: currentEmployee.sectionId },
        ],
      },
      include: {
        department: {
          select: {
            name: true,
            code: true,
            manager: { select: { id: true, name: true, position: true } },
          },
        },
        section: {
          select: {
            id: true,
            name: true,
            code: true,
            manager: { select: { id: true, name: true, position: true } },
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            manager: { select: { id: true, name: true, position: true } },
          },
        },
      },
    });

    // 本部コード → 部コード → 課コード → 氏名 の順でソート
    const sortedSubordinates = sortEmployeesByCode(subordinates);

    const result = sortedSubordinates.map((emp) => {
      const defaultManager = getDefaultManager(
        emp.id,
        emp.course?.manager,
        emp.section?.manager,
        emp.department?.manager
      );

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        position: emp.position,
        positionCode: emp.positionCode,
        departmentId: emp.departmentId,
        sectionId: emp.sectionId,
        departmentCode: emp.department?.code || null,
        departmentName: emp.department?.name || null,
        sectionCode: emp.section?.code || null,
        sectionName: emp.section?.name || null,
        courseCode: emp.course?.code || null,
        courseName: emp.course?.name || null,
        defaultManager,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch subordinates:", error);
    return NextResponse.json(
      { error: "Failed to fetch subordinates" },
      { status: 500 }
    );
  }
}
