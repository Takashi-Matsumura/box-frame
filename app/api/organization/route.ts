import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization
 *
 * 組織構造（ツリー用）を取得
 * 本部 → 部 → 課の階層構造と各レベルの社員数を返す
 *
 * 優先順位:
 * 1. PUBLISHED状態の組織
 * 2. SCHEDULED状態の組織（公開日が過ぎている場合は自動的にPUBLISHEDに更新）
 * 3. 最初の組織（後方互換性のため）
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // まずPUBLISHED状態の組織を探す
    let organization = await prisma.organization.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    });

    // SCHEDULEDで公開日が過ぎている組織があれば自動的にPUBLISHEDに更新
    if (!organization) {
      const scheduledOrg = await prisma.organization.findFirst({
        where: {
          status: "SCHEDULED",
          publishAt: { lte: new Date() },
        },
        orderBy: { publishAt: "asc" },
      });

      if (scheduledOrg) {
        // 既存のPUBLISHED組織をアーカイブ
        await prisma.organization.updateMany({
          where: { status: "PUBLISHED" },
          data: { status: "ARCHIVED" },
        });

        // この組織をPUBLISHEDに更新
        organization = await prisma.organization.update({
          where: { id: scheduledOrg.id },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
          },
        });
      }
    }

    // まだ組織が見つからない場合は、最初の組織を使用（後方互換性）
    if (!organization) {
      organization = await prisma.organization.findFirst({
        orderBy: { createdAt: "asc" },
      });
    }

    if (!organization) {
      return NextResponse.json({
        organization: null,
        departments: [],
      });
    }

    // 本部一覧を取得（社員数、部、課を含む）
    // 本部・部・課: 所属コード順（昇順）でソート
    const departments = await prisma.department.findMany({
      where: { organizationId: organization.id },
      orderBy: [{ code: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      include: {
        _count: {
          select: { employees: { where: { isActive: true } } },
        },
        manager: {
          select: { id: true, name: true, position: true },
        },
        sections: {
          orderBy: [{ code: { sort: "asc", nulls: "last" } }, { name: "asc" }],
          include: {
            _count: {
              select: { employees: { where: { isActive: true } } },
            },
            manager: {
              select: { id: true, name: true, position: true },
            },
            courses: {
              orderBy: [
                { code: { sort: "asc", nulls: "last" } },
                { name: "asc" },
              ],
              include: {
                _count: {
                  select: { employees: { where: { isActive: true } } },
                },
                manager: {
                  select: { id: true, name: true, position: true },
                },
              },
            },
          },
        },
      },
    });

    // レスポンス用に整形
    const formattedDepartments = departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      employeeCount: dept._count.employees,
      manager: dept.manager,
      sections: dept.sections.map((sect) => ({
        id: sect.id,
        name: sect.name,
        code: sect.code,
        employeeCount: sect._count.employees,
        manager: sect.manager,
        courses: sect.courses.map((course) => ({
          id: course.id,
          name: course.name,
          code: course.code,
          employeeCount: course._count.employees,
          manager: course.manager,
        })),
      })),
    }));

    // 全体の社員数を計算
    const totalEmployees = await prisma.employee.count({
      where: {
        organizationId: organization.id,
        isActive: true,
      },
    });

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        employeeCount: totalEmployees,
      },
      departments: formattedDepartments,
    });
  } catch (error) {
    console.error("Error fetching organization structure:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization structure" },
      { status: 500 },
    );
  }
}
