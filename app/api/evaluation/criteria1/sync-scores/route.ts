import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getWeightsForPositionGrade } from "@/lib/addon-modules/evaluation";

/**
 * Criteria1の達成率を評価スコア（score1）に自動反映
 */

// POST: 評価スコアへの自動反映を実行
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

    // Criteria1データを全て取得
    const criteria1Results = await prisma.criteria1Result.findMany({
      where: {
        periodId: periodId,
        isActive: true,
      },
    });

    // 組織ID → 達成率のマップを作成
    const achievementRateMap = new Map<string, number>();
    for (const result of criteria1Results) {
      if (result.achievementRate !== null) {
        achievementRateMap.set(result.organizationId, result.achievementRate);
      }
    }

    // 評価対象外の社員IDを取得
    const exclusions = await prisma.evaluationExclusion.findMany({
      where: {
        OR: [{ periodId: periodId }, { periodId: null }],
      },
      select: { employeeId: true },
    });
    const excludedEmployeeIds = new Set(exclusions.map((e) => e.employeeId));

    // 全社員を取得
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        departmentId: true,
        sectionId: true,
        courseId: true,
        positionCode: true,
        qualificationGradeCode: true,
      },
    });

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 各社員の評価レコードを更新
    for (const employee of employees) {
      // 評価対象外の社員はスキップ
      if (excludedEmployeeIds.has(employee.id)) {
        skippedCount++;
        continue;
      }

      try {
        // 社員が所属する最小組織を特定（課 > 部 > 本部の順）
        let organizationId: string | null = null;
        if (employee.courseId) {
          organizationId = employee.courseId;
        } else if (employee.sectionId) {
          organizationId = employee.sectionId;
        } else {
          organizationId = employee.departmentId;
        }

        // 達成率を取得
        const achievementRate = achievementRateMap.get(organizationId);

        if (achievementRate === undefined) {
          // 達成率が設定されていない組織はスキップ
          skippedCount++;
          continue;
        }

        // 達成率からscore1を計算（100% = 3.0のスケール）
        // 達成率100% → 3.0、達成率80% → 2.4、達成率120% → 3.6
        const score1 = Math.min(Math.max((achievementRate / 100) * 3.0, 1.0), 5.0);

        // 評価レコードを探す
        const existingEvaluation = await prisma.evaluation.findUnique({
          where: {
            periodId_employeeId: {
              periodId: periodId,
              employeeId: employee.id,
            },
          },
        });

        if (existingEvaluation) {
          // 重みを取得
          const weights = await getWeightsForPositionGrade(
            periodId,
            employee.positionCode,
            existingEvaluation.gradeCode
          );

          // 加重スコアを計算
          const weightedScore1 = (score1 * weights.resultsWeight) / 100;
          const weightedScore2 = existingEvaluation.weightedScore2 || 0;
          const weightedScore3 = existingEvaluation.weightedScore3 || 0;
          const finalScore = weightedScore1 + weightedScore2 + weightedScore3;

          // 最終グレードを計算
          let finalGrade = "D";
          if (finalScore >= 4.5) finalGrade = "S";
          else if (finalScore >= 3.5) finalGrade = "A";
          else if (finalScore >= 2.5) finalGrade = "B";
          else if (finalScore >= 1.5) finalGrade = "C";

          // 既存の評価レコードを更新
          await prisma.evaluation.update({
            where: { id: existingEvaluation.id },
            data: {
              score1,
              weightedScore1,
              finalScore,
              finalGrade,
              score1Comment: `達成率 ${achievementRate.toFixed(1)}% から自動計算`,
            },
          });
          updatedCount++;
        } else {
          // 評価レコードが存在しない場合はスキップ
          skippedCount++;
        }
      } catch (error) {
        console.error(
          `Failed to update evaluation for employee ${employee.id}:`,
          error
        );
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `評価スコアの自動反映が完了しました`,
      statistics: {
        totalEmployees: employees.length,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
    });
  } catch (error) {
    console.error("Failed to sync scores:", error);
    return NextResponse.json(
      { error: "Failed to sync scores" },
      { status: 500 }
    );
  }
}
