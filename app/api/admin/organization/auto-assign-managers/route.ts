import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EXECUTIVES_DEPARTMENT_NAME } from "@/lib/importers/organization/parser";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/organization/auto-assign-managers
 *
 * 役職に基づいて責任者を自動割り当て
 *
 * ロジック:
 * - 本部: 「本部長」「事業部長」「副本部長」「統括部長」を含む役職の社員を割り当て
 * - 部（Section）: 「部長」「室長」「支店長」を含む役職の社員を割り当て
 * - 課（Course）: 「課長」「グループ長」「リーダー」「チーフ」を含む役職の社員を割り当て
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, overwriteExisting = false } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // 役職キーワードの定義
    const departmentHeadKeywords = [
      "本部長",
      "事業部長",
      "副本部長",
      "統括部長",
    ];
    const sectionHeadKeywords = ["部長", "室長", "支店長"];
    const courseHeadKeywords = ["課長", "グループ長", "リーダー", "チーフ"];

    // 結果を追跡
    const results = {
      departmentsAssigned: 0,
      sectionsAssigned: 0,
      coursesAssigned: 0,
      departmentsSkipped: 0,
      sectionsSkipped: 0,
      coursesSkipped: 0,
    };

    // 組織のすべての部門を取得
    const departments = await prisma.department.findMany({
      where: {
        organizationId,
        name: { not: EXECUTIVES_DEPARTMENT_NAME },
      },
      include: {
        sections: {
          include: {
            courses: true,
          },
        },
      },
    });

    // 組織のすべての社員を取得（アクティブなもののみ）
    const employees = await prisma.employee.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        position: true,
        positionCode: true,
        departmentId: true,
        sectionId: true,
        courseId: true,
      },
    });

    // 役職コードでソート（小さい方が上位）
    const sortByPositionCode = (
      a: { positionCode: string | null },
      b: { positionCode: string | null },
    ) => {
      const codeA = a.positionCode || "999";
      const codeB = b.positionCode || "999";
      return codeA.localeCompare(codeB);
    };

    // キーワードにマッチするかチェック
    const matchesKeywords = (
      position: string | null,
      keywords: string[],
    ): boolean => {
      if (!position) return false;
      return keywords.some((keyword) => position.includes(keyword));
    };

    // 各部門を処理
    for (const dept of departments) {
      // 本部の責任者割り当て
      if (dept.managerId && !overwriteExisting) {
        results.departmentsSkipped++;
      } else {
        // その部門に所属する本部長クラスを探す
        const deptHeadCandidates = employees
          .filter(
            (emp) =>
              emp.departmentId === dept.id &&
              matchesKeywords(emp.position, departmentHeadKeywords),
          )
          .sort(sortByPositionCode);

        if (deptHeadCandidates.length > 0) {
          await prisma.department.update({
            where: { id: dept.id },
            data: { managerId: deptHeadCandidates[0].id },
          });
          results.departmentsAssigned++;
        } else {
          results.departmentsSkipped++;
        }
      }

      // 各部（Section）を処理
      for (const section of dept.sections) {
        if (section.managerId && !overwriteExisting) {
          results.sectionsSkipped++;
        } else {
          // その部に所属する部長クラスを探す
          let sectionHeadCandidates = employees
            .filter(
              (emp) =>
                emp.sectionId === section.id &&
                matchesKeywords(emp.position, sectionHeadKeywords),
            )
            .sort(sortByPositionCode);

          // 見つからない場合は、部門全体から探す
          if (sectionHeadCandidates.length === 0) {
            sectionHeadCandidates = employees
              .filter(
                (emp) =>
                  emp.departmentId === dept.id &&
                  emp.sectionId === section.id &&
                  matchesKeywords(emp.position, sectionHeadKeywords),
              )
              .sort(sortByPositionCode);
          }

          // まだ見つからない場合は、部の名前と役職名が一致するか確認
          if (sectionHeadCandidates.length === 0) {
            // 「営業部」の責任者として「営業部長」を探すなど
            sectionHeadCandidates = employees
              .filter(
                (emp) =>
                  emp.departmentId === dept.id &&
                  emp.position?.includes(section.name.replace(/部$/, "")) &&
                  matchesKeywords(emp.position, sectionHeadKeywords),
              )
              .sort(sortByPositionCode);
          }

          if (sectionHeadCandidates.length > 0) {
            await prisma.section.update({
              where: { id: section.id },
              data: { managerId: sectionHeadCandidates[0].id },
            });
            results.sectionsAssigned++;
          } else {
            results.sectionsSkipped++;
          }
        }

        // 各課（Course）を処理
        for (const course of section.courses) {
          if (course.managerId && !overwriteExisting) {
            results.coursesSkipped++;
          } else {
            // その課に所属する課長クラスを探す
            let courseHeadCandidates = employees
              .filter(
                (emp) =>
                  emp.courseId === course.id &&
                  matchesKeywords(emp.position, courseHeadKeywords),
              )
              .sort(sortByPositionCode);

            // 見つからない場合は、部全体から探す
            if (courseHeadCandidates.length === 0) {
              courseHeadCandidates = employees
                .filter(
                  (emp) =>
                    emp.sectionId === section.id &&
                    emp.courseId === course.id &&
                    matchesKeywords(emp.position, courseHeadKeywords),
                )
                .sort(sortByPositionCode);
            }

            // 課の名前と役職名が一致するか確認
            if (courseHeadCandidates.length === 0) {
              // 「営業1グループ」の責任者として「営業1グループ長」を探すなど
              const courseBaseName = course.name
                .replace(/課$/, "")
                .replace(/グループ$/, "")
                .replace(/チーム$/, "");
              courseHeadCandidates = employees
                .filter(
                  (emp) =>
                    emp.sectionId === section.id &&
                    emp.position?.includes(courseBaseName) &&
                    matchesKeywords(emp.position, courseHeadKeywords),
                )
                .sort(sortByPositionCode);
            }

            if (courseHeadCandidates.length > 0) {
              await prisma.course.update({
                where: { id: course.id },
                data: { managerId: courseHeadCandidates[0].id },
              });
              results.coursesAssigned++;
            } else {
              results.coursesSkipped++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error auto-assigning managers:", error);
    return NextResponse.json(
      { error: "Failed to auto-assign managers" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/organization/auto-assign-managers
 *
 * 自動割り当てのプレビュー（何が割り当てられるか確認）
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // 役職キーワードの定義
    const departmentHeadKeywords = [
      "本部長",
      "事業部長",
      "副本部長",
      "統括部長",
    ];
    const sectionHeadKeywords = ["部長", "室長", "支店長"];
    const courseHeadKeywords = ["課長", "グループ長", "リーダー", "チーフ"];

    // 現在の状態を集計
    const departments = await prisma.department.findMany({
      where: {
        organizationId,
        name: { not: EXECUTIVES_DEPARTMENT_NAME },
      },
      include: {
        manager: { select: { id: true, name: true, position: true } },
        sections: {
          include: {
            manager: { select: { id: true, name: true, position: true } },
            courses: {
              include: {
                manager: { select: { id: true, name: true, position: true } },
              },
            },
          },
        },
      },
    });

    // 組織のすべての社員を取得
    const employees = await prisma.employee.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        position: true,
        positionCode: true,
        departmentId: true,
        sectionId: true,
        courseId: true,
      },
    });

    const sortByPositionCode = (
      a: { positionCode: string | null },
      b: { positionCode: string | null },
    ) => {
      const codeA = a.positionCode || "999";
      const codeB = b.positionCode || "999";
      return codeA.localeCompare(codeB);
    };

    const matchesKeywords = (
      position: string | null,
      keywords: string[],
    ): boolean => {
      if (!position) return false;
      return keywords.some((keyword) => position.includes(keyword));
    };

    // 統計情報
    let totalDepartments = 0;
    let departmentsWithManager = 0;
    let departmentsCanAssign = 0;
    let totalSections = 0;
    let sectionsWithManager = 0;
    let sectionsCanAssign = 0;
    let totalCourses = 0;
    let coursesWithManager = 0;
    let coursesCanAssign = 0;

    // プレビューデータ
    const preview: {
      type: "department" | "section" | "course";
      name: string;
      currentManager: string | null;
      suggestedManager: { name: string; position: string } | null;
    }[] = [];

    for (const dept of departments) {
      totalDepartments++;

      if (dept.manager) {
        departmentsWithManager++;
      }

      // 候補を探す
      const deptHeadCandidates = employees
        .filter(
          (emp) =>
            emp.departmentId === dept.id &&
            matchesKeywords(emp.position, departmentHeadKeywords),
        )
        .sort(sortByPositionCode);

      if (deptHeadCandidates.length > 0 && !dept.manager) {
        departmentsCanAssign++;
        preview.push({
          type: "department",
          name: dept.name,
          currentManager: null,
          suggestedManager: {
            name: deptHeadCandidates[0].name,
            position: deptHeadCandidates[0].position || "",
          },
        });
      }

      for (const section of dept.sections) {
        totalSections++;

        if (section.manager) {
          sectionsWithManager++;
        }

        let sectionHeadCandidates = employees
          .filter(
            (emp) =>
              emp.sectionId === section.id &&
              matchesKeywords(emp.position, sectionHeadKeywords),
          )
          .sort(sortByPositionCode);

        if (sectionHeadCandidates.length === 0) {
          const sectionBaseName = section.name.replace(/部$/, "");
          sectionHeadCandidates = employees
            .filter(
              (emp) =>
                emp.departmentId === dept.id &&
                emp.position?.includes(sectionBaseName) &&
                matchesKeywords(emp.position, sectionHeadKeywords),
            )
            .sort(sortByPositionCode);
        }

        if (sectionHeadCandidates.length > 0 && !section.manager) {
          sectionsCanAssign++;
          preview.push({
            type: "section",
            name: `${dept.name} > ${section.name}`,
            currentManager: null,
            suggestedManager: {
              name: sectionHeadCandidates[0].name,
              position: sectionHeadCandidates[0].position || "",
            },
          });
        }

        for (const course of section.courses) {
          totalCourses++;

          if (course.manager) {
            coursesWithManager++;
          }

          let courseHeadCandidates = employees
            .filter(
              (emp) =>
                emp.courseId === course.id &&
                matchesKeywords(emp.position, courseHeadKeywords),
            )
            .sort(sortByPositionCode);

          if (courseHeadCandidates.length === 0) {
            const courseBaseName = course.name
              .replace(/課$/, "")
              .replace(/グループ$/, "")
              .replace(/チーム$/, "");
            courseHeadCandidates = employees
              .filter(
                (emp) =>
                  emp.sectionId === section.id &&
                  emp.position?.includes(courseBaseName) &&
                  matchesKeywords(emp.position, courseHeadKeywords),
              )
              .sort(sortByPositionCode);
          }

          if (courseHeadCandidates.length > 0 && !course.manager) {
            coursesCanAssign++;
            preview.push({
              type: "course",
              name: `${dept.name} > ${section.name} > ${course.name}`,
              currentManager: null,
              suggestedManager: {
                name: courseHeadCandidates[0].name,
                position: courseHeadCandidates[0].position || "",
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      statistics: {
        departments: {
          total: totalDepartments,
          withManager: departmentsWithManager,
          canAssign: departmentsCanAssign,
        },
        sections: {
          total: totalSections,
          withManager: sectionsWithManager,
          canAssign: sectionsCanAssign,
        },
        courses: {
          total: totalCourses,
          withManager: coursesWithManager,
          canAssign: coursesCanAssign,
        },
      },
      preview: preview.slice(0, 20), // 最初の20件のみ返す
      totalPreview: preview.length,
    });
  } catch (error) {
    console.error("Error getting auto-assign preview:", error);
    return NextResponse.json(
      { error: "Failed to get auto-assign preview" },
      { status: 500 },
    );
  }
}
