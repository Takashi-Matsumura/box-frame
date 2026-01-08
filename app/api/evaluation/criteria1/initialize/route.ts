import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 組織図データからCriteria1テーブルを初期化
 * 指定された評価期間に対して、全社・本部・部・課のレコードを作成
 */
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
    const { periodId } = body;

    if (!periodId) {
      return NextResponse.json(
        { error: "periodId is required" },
        { status: 400 }
      );
    }

    // 評価期間の存在確認
    const period = await prisma.evaluationPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      return NextResponse.json(
        { error: "Evaluation period not found" },
        { status: 404 }
      );
    }

    // 組織データを取得
    const [departments, sections, courses] = await Promise.all([
      prisma.department.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.section.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.course.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const createdBy = session.user.email || "system";
    const results = {
      company: 0,
      departments: 0,
      sections: 0,
      courses: 0,
      total: 0,
    };

    // トランザクションで一括作成
    await prisma.$transaction(async (tx) => {
      // 全社レベル（固定で1つ）
      const companyId = "COMPANY_ROOT"; // 固定ID
      const companyExisting = await tx.criteria1Result.findUnique({
        where: {
          periodId_organizationLevel_organizationId: {
            periodId: periodId,
            organizationLevel: "COMPANY",
            organizationId: companyId,
          },
        },
      });

      if (!companyExisting) {
        await tx.criteria1Result.create({
          data: {
            periodId: periodId,
            organizationLevel: "COMPANY",
            organizationId: companyId,
            organizationName: "全社",
            createdBy,
          },
        });
        results.company++;
      }

      // 本部（Department）レベル
      for (const dept of departments) {
        const existing = await tx.criteria1Result.findUnique({
          where: {
            periodId_organizationLevel_organizationId: {
              periodId: periodId,
              organizationLevel: "DEPARTMENT",
              organizationId: dept.id,
            },
          },
        });

        if (!existing) {
          await tx.criteria1Result.create({
            data: {
              periodId: periodId,
              organizationLevel: "DEPARTMENT",
              organizationId: dept.id,
              organizationName: dept.name,
              createdBy,
            },
          });
          results.departments++;
        }
      }

      // 部（Section）レベル
      for (const section of sections) {
        const existing = await tx.criteria1Result.findUnique({
          where: {
            periodId_organizationLevel_organizationId: {
              periodId: periodId,
              organizationLevel: "SECTION",
              organizationId: section.id,
            },
          },
        });

        if (!existing) {
          await tx.criteria1Result.create({
            data: {
              periodId: periodId,
              organizationLevel: "SECTION",
              organizationId: section.id,
              organizationName: section.name,
              createdBy,
            },
          });
          results.sections++;
        }
      }

      // 課（Course）レベル
      for (const course of courses) {
        const existing = await tx.criteria1Result.findUnique({
          where: {
            periodId_organizationLevel_organizationId: {
              periodId: periodId,
              organizationLevel: "COURSE",
              organizationId: course.id,
            },
          },
        });

        if (!existing) {
          await tx.criteria1Result.create({
            data: {
              periodId: periodId,
              organizationLevel: "COURSE",
              organizationId: course.id,
              organizationName: course.name,
              createdBy,
            },
          });
          results.courses++;
        }
      }
    });

    results.total =
      results.company +
      results.departments +
      results.sections +
      results.courses;

    return NextResponse.json({
      success: true,
      message: `初期化完了: 全社${results.company}件、本部${results.departments}件、部${results.sections}件、課${results.courses}件（合計${results.total}件）`,
      results,
    });
  } catch (error: unknown) {
    console.error("Failed to initialize criteria1 data:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to initialize criteria1 data",
        details: message,
      },
      { status: 500 }
    );
  }
}
