import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 結果評価（Criteria1）データの取得・作成・更新・削除
 */

// GET: Criteria1データ一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const periodId = searchParams.get("periodId");

    if (!periodId) {
      return NextResponse.json(
        { error: "periodId is required" },
        { status: 400 }
      );
    }

    // Criteria1データを取得
    const criteria1Results = await prisma.criteria1Result.findMany({
      where: {
        periodId,
        isActive: true,
      },
      select: {
        id: true,
        periodId: true,
        organizationLevel: true,
        organizationId: true,
        organizationName: true,
        targetProfit: true,
        actualProfit: true,
        achievementRate: true,
        departmentType: true,
        linkedOrganizationLevel: true,
        linkedOrganizationId: true,
        linkedOrganizationName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        period: {
          select: {
            year: true,
            term: true,
          },
        },
      },
    });

    // 各組織の人数と管理者情報、社員リスト、組織コードを取得
    const enrichedResults = await Promise.all(
      criteria1Results.map(async (result) => {
        let employeeCount = 0;
        let managerName = null;
        let employees: {
          id: string;
          name: string;
          position: string | null;
          qualificationGradeCode: string | null;
        }[] = [];
        let organizationCode: string | null = null;

        if (result.organizationLevel === "COMPANY") {
          // 全社レベル: 全社員をカウント
          const allEmployees = await prisma.employee.findMany({
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              position: true,
              qualificationGradeCode: true,
            },
            orderBy: { name: "asc" },
          });
          employeeCount = allEmployees.length;
          employees = allEmployees;
          organizationCode = "00"; // 最優先ソート用
        } else if (result.organizationLevel === "DEPARTMENT") {
          const dept = await prisma.department.findUnique({
            where: { id: result.organizationId },
            include: {
              // 「引き算」ロジック: 部にも課にも所属していない社員のみ
              employees: {
                where: {
                  sectionId: null,
                  courseId: null,
                  isActive: true,
                },
                select: {
                  id: true,
                  name: true,
                  position: true,
                  qualificationGradeCode: true,
                },
                orderBy: { name: "asc" },
              },
              manager: { select: { name: true } },
            },
          });
          if (dept) {
            employeeCount = dept.employees.length;
            managerName = dept.manager?.name || null;
            employees = dept.employees;
            organizationCode = dept.code;
          }
        } else if (result.organizationLevel === "SECTION") {
          const section = await prisma.section.findUnique({
            where: { id: result.organizationId },
            include: {
              // 「引き算」ロジック: 課に所属していない社員のみ
              employees: {
                where: {
                  courseId: null,
                  isActive: true,
                },
                select: {
                  id: true,
                  name: true,
                  position: true,
                  qualificationGradeCode: true,
                },
                orderBy: { name: "asc" },
              },
              manager: { select: { name: true } },
            },
          });
          if (section) {
            employeeCount = section.employees.length;
            managerName = section.manager?.name || null;
            employees = section.employees;
            organizationCode = section.code;
          }
        } else if (result.organizationLevel === "COURSE") {
          const course = await prisma.course.findUnique({
            where: { id: result.organizationId },
            include: {
              // 課レベル: すべての社員をカウント
              employees: {
                where: { isActive: true },
                select: {
                  id: true,
                  name: true,
                  position: true,
                  qualificationGradeCode: true,
                },
                orderBy: { name: "asc" },
              },
              manager: { select: { name: true } },
            },
          });
          if (course) {
            employeeCount = course.employees.length;
            managerName = course.manager?.name || null;
            employees = course.employees;
            organizationCode = course.code;
          }
        }

        // 組織コードを7桁に正規化してソート用の数値を生成
        const code = organizationCode || "";
        let sortCode = code;
        if (code.length === 2) {
          // 本部: 01 -> 0100000
          sortCode = `${code}00000`;
        } else if (code.length === 4) {
          // 部: 0101 -> 0101000
          sortCode = `${code}000`;
        }
        // 課は7桁なのでそのまま
        const sortNumber = parseInt(sortCode, 10) || 0;

        // 階層別の組織名とコードを取得
        let departmentName = null;
        let sectionName = null;
        let courseName = null;
        let departmentCode = "";
        let sectionCode = "";
        let courseCode = "";

        if (result.organizationLevel === "COMPANY") {
          // 全社レベルの場合は組織名を設定しない（コードは00で最優先）
          departmentCode = "00";
        } else if (result.organizationLevel === "DEPARTMENT") {
          const dept = await prisma.department.findUnique({
            where: { id: result.organizationId },
            select: { name: true, code: true },
          });
          departmentName = dept?.name || null;
          departmentCode = dept?.code || "99";
        } else if (result.organizationLevel === "SECTION") {
          const section = await prisma.section.findUnique({
            where: { id: result.organizationId },
            include: {
              department: { select: { name: true, code: true } },
            },
          });
          if (section) {
            departmentName = section.department.name;
            sectionName = section.name;
            departmentCode = section.department.code || "99";
            sectionCode = section.code || "9999";
          }
        } else if (result.organizationLevel === "COURSE") {
          const course = await prisma.course.findUnique({
            where: { id: result.organizationId },
            include: {
              section: {
                include: {
                  department: { select: { name: true, code: true } },
                },
              },
            },
          });
          if (course) {
            departmentName = course.section.department.name;
            sectionName = course.section.name;
            courseName = course.name;
            departmentCode = course.section.department.code || "99";
            sectionCode = course.section.code || "9999";
            courseCode = course.code || "9999999";
          }
        }

        return {
          ...result,
          employeeCount,
          managerName,
          employees,
          organizationCode,
          sortNumber,
          departmentName,
          sectionName,
          courseName,
          departmentCode,
          sectionCode,
          courseCode,
        };
      })
    );

    // 本部コード→部コード→課コードの順でソート
    const sortedResults = enrichedResults.sort((a, b) => {
      // 1. 本部コードで比較
      const deptCompare = a.departmentCode.localeCompare(b.departmentCode);
      if (deptCompare !== 0) return deptCompare;

      // 2. 部コードで比較
      const sectionCompare = a.sectionCode.localeCompare(b.sectionCode);
      if (sectionCompare !== 0) return sectionCompare;

      // 3. 課コードで比較
      return a.courseCode.localeCompare(b.courseCode);
    });

    return NextResponse.json(sortedResults);
  } catch (error) {
    console.error("Failed to fetch criteria1 results:", error);
    return NextResponse.json(
      { error: "Failed to fetch criteria1 results" },
      { status: 500 }
    );
  }
}

// POST: Criteria1データの作成・更新
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 管理者権限チェック
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      periodId,
      organizationLevel,
      organizationId,
      organizationName,
      targetProfit,
      actualProfit,
      departmentType,
      linkedOrganizationLevel,
      linkedOrganizationId,
      linkedOrganizationName,
    } = body;

    // 達成率を計算
    let achievementRate = null;
    if (departmentType === "DIRECT") {
      // 直接部門: 目標と実績から達成率を計算
      if (targetProfit && actualProfit && targetProfit > 0) {
        achievementRate = (actualProfit / targetProfit) * 100;
      }
    } else if (departmentType === "INDIRECT" && linkedOrganizationId) {
      // 間接部門: 紐付けた直接部門の達成率を取得
      const linkedOrg = await prisma.criteria1Result.findFirst({
        where: {
          periodId,
          organizationLevel: linkedOrganizationLevel,
          organizationId: linkedOrganizationId,
          isActive: true,
        },
        select: {
          achievementRate: true,
        },
      });
      achievementRate = linkedOrg?.achievementRate || null;
    }

    if (id) {
      // 更新
      const updated = await prisma.criteria1Result.update({
        where: { id },
        data: {
          targetProfit,
          actualProfit,
          achievementRate,
          departmentType,
          linkedOrganizationLevel,
          linkedOrganizationId,
          linkedOrganizationName,
          updatedBy: session.user.email || undefined,
        },
      });

      return NextResponse.json(updated);
    } else {
      // 新規作成
      const created = await prisma.criteria1Result.create({
        data: {
          periodId,
          organizationLevel,
          organizationId,
          organizationName,
          targetProfit,
          actualProfit,
          achievementRate,
          departmentType,
          linkedOrganizationLevel,
          linkedOrganizationId,
          linkedOrganizationName,
          createdBy: session.user.email || undefined,
        },
      });

      return NextResponse.json(created);
    }
  } catch (error: unknown) {
    console.error("Failed to save criteria1 result:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to save criteria1 result",
        details: message,
      },
      { status: 500 }
    );
  }
}

// DELETE: Criteria1データの削除（論理削除）
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 管理者権限チェック
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // 論理削除
    await prisma.criteria1Result.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: session.user.email || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete criteria1 result:", error);
    return NextResponse.json(
      { error: "Failed to delete criteria1 result" },
      { status: 500 }
    );
  }
}
