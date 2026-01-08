import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { upsertWeight, deleteWeight } from "@/lib/addon-modules/evaluation";

// 評価対象外の部門名
const EXCLUDED_DEPARTMENT_NAMES = ["役員・顧問"];

/**
 * 等級コードのソート順序を取得
 * "000" (アルバイト・パート・嘱託) は末尾に配置
 */
function getGradeCodeSortOrder(gradeCode: string): number {
  if (gradeCode === "000") return 9999; // 末尾に配置
  if (gradeCode === "ALL") return -1; // 先頭に配置
  if (gradeCode === "DEFAULT") return -2;
  // アルファベット+数字のコードは通常のASCII順
  return 0;
}

/**
 * 等級コードをカスタムソート
 */
function compareGradeCodes(a: string, b: string): number {
  const orderA = getGradeCodeSortOrder(a);
  const orderB = getGradeCodeSortOrder(b);

  if (orderA !== orderB) {
    return orderA - orderB;
  }
  // 同じ優先度の場合は通常の文字列比較
  return a.localeCompare(b);
}

interface PositionGradeCombination {
  positionCode: string;
  positionName: string;
  gradeCode: string;
  employeeCount: number;
}

/**
 * GET /api/evaluation/weights
 * 重み設定一覧を取得（社員数付き）
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const periodId = url.searchParams.get("periodId");
    const action = url.searchParams.get("action");
    const includeNames = url.searchParams.get("includeNames") === "true";

    // 未設定の役職×等級を検出
    if (action === "detect-combinations") {
      const result = await detectMissingCombinations(periodId);
      return NextResponse.json(result);
    }

    if (!periodId) {
      return NextResponse.json(
        { error: "periodId is required" },
        { status: 400 }
      );
    }

    const weights = await prisma.evaluationWeight.findMany({
      where: { periodId },
      orderBy: [{ positionCode: "asc" }, { gradeCode: "asc" }],
    });

    // 各役職×等級コードの社員数をカウント（社員名リストも取得可能）
    const weightsWithCount = await Promise.all(
      weights.map(async (weight) => {
        let employeeCount = 0;
        let employeeNames: string[] = [];

        if (weight.positionCode === "DEFAULT" && weight.gradeCode === "ALL") {
          // グローバルデフォルトの場合は、他の設定に該当しない社員数
          const configuredCombos = weights
            .filter((w) => !(w.positionCode === "DEFAULT" && w.gradeCode === "ALL"))
            .map((w) => ({ positionCode: w.positionCode, gradeCode: w.gradeCode }));

          // 設定済みの組み合わせに含まれない社員をカウント
          const allEmployees = await prisma.employee.findMany({
            where: {
              isActive: true,
              department: { name: { notIn: EXCLUDED_DEPARTMENT_NAMES } },
            },
            select: { positionCode: true, qualificationGradeCode: true, name: true },
          });

          const matchingEmployees = allEmployees.filter((e) => {
            const posCode = e.positionCode || "";
            const gradeCode = e.qualificationGradeCode || "";

            // この社員に適用される重みがあるかチェック
            const hasSpecificMatch = configuredCombos.some(
              (c) => c.positionCode === posCode && c.gradeCode === gradeCode
            );
            const hasPositionAllMatch = configuredCombos.some(
              (c) => c.positionCode === posCode && c.gradeCode === "ALL"
            );
            const hasGradeDefaultMatch = configuredCombos.some(
              (c) => c.positionCode === "DEFAULT" && c.gradeCode === gradeCode
            );

            return !hasSpecificMatch && !hasPositionAllMatch && !hasGradeDefaultMatch;
          });
          employeeCount = matchingEmployees.length;
          if (includeNames) {
            employeeNames = matchingEmployees.map((e) => e.name);
          }
        } else if (weight.gradeCode === "ALL") {
          // 役職の全等級共通の場合
          if (includeNames) {
            const employees = await prisma.employee.findMany({
              where: {
                isActive: true,
                department: { name: { notIn: EXCLUDED_DEPARTMENT_NAMES } },
                positionCode: weight.positionCode,
              },
              select: { name: true },
            });
            employeeCount = employees.length;
            employeeNames = employees.map((e) => e.name);
          } else {
            employeeCount = await prisma.employee.count({
              where: {
                isActive: true,
                department: { name: { notIn: EXCLUDED_DEPARTMENT_NAMES } },
                positionCode: weight.positionCode,
              },
            });
          }
        } else if (weight.positionCode === "DEFAULT") {
          // 等級の全役職共通の場合
          if (includeNames) {
            const employees = await prisma.employee.findMany({
              where: {
                isActive: true,
                department: { name: { notIn: EXCLUDED_DEPARTMENT_NAMES } },
                qualificationGradeCode: weight.gradeCode,
              },
              select: { name: true },
            });
            employeeCount = employees.length;
            employeeNames = employees.map((e) => e.name);
          } else {
            employeeCount = await prisma.employee.count({
              where: {
                isActive: true,
                department: { name: { notIn: EXCLUDED_DEPARTMENT_NAMES } },
                qualificationGradeCode: weight.gradeCode,
              },
            });
          }
        } else {
          // 特定の役職×等級
          if (includeNames) {
            const employees = await prisma.employee.findMany({
              where: {
                isActive: true,
                department: { name: { notIn: EXCLUDED_DEPARTMENT_NAMES } },
                positionCode: weight.positionCode,
                qualificationGradeCode: weight.gradeCode,
              },
              select: { name: true },
            });
            employeeCount = employees.length;
            employeeNames = employees.map((e) => e.name);
          } else {
            employeeCount = await prisma.employee.count({
              where: {
                isActive: true,
                department: { name: { notIn: EXCLUDED_DEPARTMENT_NAMES } },
                positionCode: weight.positionCode,
                qualificationGradeCode: weight.gradeCode,
              },
            });
          }
        }

        return {
          ...weight,
          employeeCount,
          ...(includeNames && { employeeNames }),
        };
      })
    );

    // 等級コードでカスタムソート（"000"を末尾に配置）
    const sortedWeights = weightsWithCount.sort((a, b) => {
      // まず役職コードで比較
      const posCompare = a.positionCode.localeCompare(b.positionCode);
      if (posCompare !== 0) return posCompare;
      // 同じ役職内では等級コードでカスタムソート
      return compareGradeCodes(a.gradeCode, b.gradeCode);
    });

    return NextResponse.json(sortedWeights);
  } catch (error) {
    console.error("Error fetching weights:", error);
    return NextResponse.json(
      { error: "Failed to fetch weights" },
      { status: 500 }
    );
  }
}

/**
 * 未設定の役職×等級の組み合わせを検出
 */
async function detectMissingCombinations(periodId: string | null) {
  // 社員データから役職×等級の組み合わせを取得
  const employees = await prisma.employee.groupBy({
    by: ["positionCode", "position", "qualificationGradeCode"],
    where: {
      isActive: true,
      department: { name: { notIn: EXCLUDED_DEPARTMENT_NAMES } },
    },
    _count: { id: true },
    orderBy: [{ positionCode: "asc" }, { qualificationGradeCode: "asc" }],
  });

  // 役職ごとにグループ化
  const positionMap = new Map<string, {
    positionCode: string;
    positionName: string;
    grades: Array<{ gradeCode: string; employeeCount: number }>;
    totalEmployees: number;
  }>();

  for (const emp of employees) {
    const posCode = emp.positionCode || "UNKNOWN";
    const posName = emp.position || "不明";
    const gradeCode = emp.qualificationGradeCode || "UNKNOWN";
    const count = emp._count.id;

    if (!positionMap.has(posCode)) {
      positionMap.set(posCode, {
        positionCode: posCode,
        positionName: posName,
        grades: [],
        totalEmployees: 0,
      });
    }

    const posData = positionMap.get(posCode)!;
    posData.grades.push({ gradeCode, employeeCount: count });
    posData.totalEmployees += count;
  }

  const allCombinations: PositionGradeCombination[] = [];
  for (const emp of employees) {
    allCombinations.push({
      positionCode: emp.positionCode || "UNKNOWN",
      positionName: emp.position || "不明",
      gradeCode: emp.qualificationGradeCode || "UNKNOWN",
      employeeCount: emp._count.id,
    });
  }

  // 現在設定されている組み合わせを取得
  let configuredCombinations: Array<{ positionCode: string; gradeCode: string }> = [];
  if (periodId) {
    const weights = await prisma.evaluationWeight.findMany({
      where: { periodId },
      select: { positionCode: true, gradeCode: true },
    });
    configuredCombinations = weights.map((w) => ({
      positionCode: w.positionCode,
      gradeCode: w.gradeCode,
    }));
  }

  // 未設定の組み合わせを特定
  const missingCombinations = allCombinations.filter((combo) => {
    // 完全一致
    const hasExact = configuredCombinations.some(
      (c) => c.positionCode === combo.positionCode && c.gradeCode === combo.gradeCode
    );
    if (hasExact) return false;

    // 役職のALL設定
    const hasPositionAll = configuredCombinations.some(
      (c) => c.positionCode === combo.positionCode && c.gradeCode === "ALL"
    );
    if (hasPositionAll) return false;

    // DEFAULT等級設定
    const hasDefaultGrade = configuredCombinations.some(
      (c) => c.positionCode === "DEFAULT" && c.gradeCode === combo.gradeCode
    );
    if (hasDefaultGrade) return false;

    // グローバルデフォルト
    const hasGlobalDefault = configuredCombinations.some(
      (c) => c.positionCode === "DEFAULT" && c.gradeCode === "ALL"
    );
    if (hasGlobalDefault) return false;

    return true;
  });

  // 役職ごとの統計を配列に変換（各役職内の等級もカスタムソート）
  const positionStats = Array.from(positionMap.values())
    .map((pos) => ({
      ...pos,
      grades: pos.grades.sort((a, b) => compareGradeCodes(a.gradeCode, b.gradeCode)),
    }))
    .sort((a, b) => a.positionCode.localeCompare(b.positionCode));

  return {
    allCombinations,
    configuredCombinations,
    missingCombinations,
    positionStats,
    totalEmployees: employees.reduce((sum, e) => sum + e._count.id, 0),
  };
}

/**
 * POST /api/evaluation/weights
 * 重み設定を作成・更新
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

    const body = await request.json();
    const {
      action,
      periodId,
      positionCode,
      positionName,
      gradeCode,
      resultsWeight,
      processWeight,
      growthWeight,
      combinations, // 一括追加用
    } = body;

    // 一括追加アクション
    if (action === "add-missing") {
      if (!periodId || !combinations || !Array.isArray(combinations)) {
        return NextResponse.json(
          { error: "periodId and combinations array are required" },
          { status: 400 }
        );
      }

      // デフォルト値で一括作成
      const results = [];
      for (const combo of combinations) {
        await prisma.evaluationWeight.upsert({
          where: {
            periodId_positionCode_gradeCode: {
              periodId,
              positionCode: combo.positionCode,
              gradeCode: combo.gradeCode,
            },
          },
          update: {},
          create: {
            periodId,
            positionCode: combo.positionCode,
            positionName: combo.positionName,
            gradeCode: combo.gradeCode,
            resultsWeight: 30,
            processWeight: 40,
            growthWeight: 30,
          },
        });
        results.push(combo);
      }

      return NextResponse.json({ added: results });
    }

    // 役職の全等級共通設定を追加
    if (action === "add-position-all") {
      if (!periodId || !positionCode) {
        return NextResponse.json(
          { error: "periodId and positionCode are required" },
          { status: 400 }
        );
      }

      await prisma.evaluationWeight.upsert({
        where: {
          periodId_positionCode_gradeCode: { periodId, positionCode, gradeCode: "ALL" },
        },
        update: {
          positionName,
          resultsWeight: resultsWeight ?? 30,
          processWeight: processWeight ?? 40,
          growthWeight: growthWeight ?? 30,
        },
        create: {
          periodId,
          positionCode,
          positionName,
          gradeCode: "ALL",
          resultsWeight: resultsWeight ?? 30,
          processWeight: processWeight ?? 40,
          growthWeight: growthWeight ?? 30,
        },
      });

      return NextResponse.json({ success: true });
    }

    // 削除アクション
    if (action === "delete") {
      if (!periodId || !positionCode || !gradeCode) {
        return NextResponse.json(
          { error: "periodId, positionCode, and gradeCode are required" },
          { status: 400 }
        );
      }

      await deleteWeight(periodId, positionCode, gradeCode);

      return NextResponse.json({ deleted: { positionCode, gradeCode } });
    }

    // 一括更新アクション（グループ内の全重みを同じ値に更新）
    if (action === "bulk-update") {
      const { weights } = body;
      if (!periodId || !weights || !Array.isArray(weights)) {
        return NextResponse.json(
          { error: "periodId and weights array are required" },
          { status: 400 }
        );
      }

      // 全ての重みの合計が100%であることを確認
      for (const w of weights) {
        const total = w.resultsWeight + w.processWeight + w.growthWeight;
        if (total !== 100) {
          return NextResponse.json(
            { error: `Weight total must be 100%, got ${total}%` },
            { status: 400 }
          );
        }
      }

      // トランザクションで一括更新
      const results = await prisma.$transaction(
        weights.map((w: {
          positionCode: string;
          positionName: string | null;
          gradeCode: string;
          resultsWeight: number;
          processWeight: number;
          growthWeight: number;
        }) =>
          prisma.evaluationWeight.update({
            where: {
              periodId_positionCode_gradeCode: {
                periodId,
                positionCode: w.positionCode,
                gradeCode: w.gradeCode,
              },
            },
            data: {
              resultsWeight: w.resultsWeight,
              processWeight: w.processWeight,
              growthWeight: w.growthWeight,
            },
          })
        )
      );

      return NextResponse.json({ updated: results.length });
    }

    // 通常の作成・更新
    if (!periodId || !positionCode || !gradeCode) {
      return NextResponse.json(
        { error: "periodId, positionCode, and gradeCode are required" },
        { status: 400 }
      );
    }

    // 合計が100%になることを確認
    const total = resultsWeight + processWeight + growthWeight;
    if (total !== 100) {
      return NextResponse.json(
        { error: `Weight total must be 100%, got ${total}%` },
        { status: 400 }
      );
    }

    await upsertWeight(periodId, positionCode, gradeCode, {
      resultsWeight,
      processWeight,
      growthWeight,
    }, positionName);

    const weight = await prisma.evaluationWeight.findUnique({
      where: {
        periodId_positionCode_gradeCode: { periodId, positionCode, gradeCode },
      },
    });

    return NextResponse.json(weight);
  } catch (error) {
    console.error("Error updating weight:", error);
    return NextResponse.json(
      { error: "Failed to update weight" },
      { status: 500 }
    );
  }
}
