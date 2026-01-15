import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { HistoryRecorder } from "@/lib/history";
import { processEmployeeDataWithDeduplication } from "@/lib/importers/organization/parser";
import type { CSVEmployeeRow } from "@/lib/importers/organization/types";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/organization/import
 *
 * インポート実行
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { data, organizationId, options } = body as {
      data: CSVEmployeeRow[];
      organizationId: string;
      options?: {
        markMissingAsRetired?: boolean;
        skipDuplicateCheck?: boolean;
      };
    };

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 },
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // 組織の存在確認
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // CSVデータを処理（役員・顧問の重複除去を含む）
    const { employees: processedData, excludedDuplicates } =
      processEmployeeDataWithDeduplication(data);

    // バッチIDを生成
    const batchId = HistoryRecorder.generateBatchId();
    const changedBy = session.user.id || "system";
    const now = new Date();

    // 統計情報
    const statistics = {
      totalRecords: processedData.length,
      created: 0,
      updated: 0,
      transferred: 0,
      retired: 0,
      excludedDuplicates: excludedDuplicates.length,
      errors: 0,
    };

    // 組織構造のキャッシュ（パフォーマンス最適化）
    const departmentCache = new Map<
      string,
      { id: string; name: string; code: string | null }
    >();
    const sectionCache = new Map<
      string,
      { id: string; name: string; code: string | null }
    >();
    const courseCache = new Map<
      string,
      { id: string; name: string; code: string | null }
    >();

    // トランザクションでインポート実行（タイムアウト延長: 5分）
    await prisma.$transaction(
      async (tx) => {
        const importedIds = new Set<string>();

        for (const processed of processedData) {
          try {
            // 本部（Department）を取得または作成（キャッシュ利用）
            const deptKey = processed.department;
            let department = departmentCache.get(deptKey);

            if (!department) {
              let dbDept = await tx.department.findFirst({
                where: {
                  organizationId,
                  name: processed.department,
                },
              });

              if (!dbDept) {
                dbDept = await tx.department.create({
                  data: {
                    name: processed.department,
                    code: processed.departmentCode, // 本部コード（1-2桁目）
                    organizationId,
                  },
                });
              } else if (
                processed.departmentCode &&
                dbDept.code !== processed.departmentCode
              ) {
                // 既存部門のコードを更新
                dbDept = await tx.department.update({
                  where: { id: dbDept.id },
                  data: { code: processed.departmentCode },
                });
              }
              department = {
                id: dbDept.id,
                name: dbDept.name,
                code: dbDept.code,
              };
              departmentCache.set(deptKey, department);
            }

            // 部（Section）を取得または作成（キャッシュ利用）
            let section: {
              id: string;
              name: string;
              code: string | null;
            } | null = null;
            if (processed.section) {
              const sectKey = `${department.id}:${processed.section}`;
              section = sectionCache.get(sectKey) || null;

              if (!section) {
                let dbSect = await tx.section.findFirst({
                  where: {
                    departmentId: department.id,
                    name: processed.section,
                  },
                });

                if (!dbSect) {
                  dbSect = await tx.section.create({
                    data: {
                      name: processed.section,
                      code: processed.sectionCode, // 部コード（3-4桁目）
                      departmentId: department.id,
                    },
                  });
                } else if (
                  processed.sectionCode &&
                  dbSect.code !== processed.sectionCode
                ) {
                  // 既存セクションのコードを更新
                  dbSect = await tx.section.update({
                    where: { id: dbSect.id },
                    data: { code: processed.sectionCode },
                  });
                }
                section = {
                  id: dbSect.id,
                  name: dbSect.name,
                  code: dbSect.code,
                };
                sectionCache.set(sectKey, section);
              }
            }

            // 課（Course）を取得または作成（キャッシュ利用）
            let course: {
              id: string;
              name: string;
              code: string | null;
            } | null = null;
            if (processed.course && section) {
              const courseKey = `${section.id}:${processed.course}`;
              course = courseCache.get(courseKey) || null;

              if (!course) {
                let dbCourse = await tx.course.findFirst({
                  where: {
                    sectionId: section.id,
                    name: processed.course,
                  },
                });

                if (!dbCourse) {
                  dbCourse = await tx.course.create({
                    data: {
                      name: processed.course,
                      code: processed.courseCode, // 課コード（5-7桁目）
                      sectionId: section.id,
                    },
                  });
                } else if (
                  processed.courseCode &&
                  dbCourse.code !== processed.courseCode
                ) {
                  // 既存コースのコードを更新
                  dbCourse = await tx.course.update({
                    where: { id: dbCourse.id },
                    data: { code: processed.courseCode },
                  });
                }
                course = {
                  id: dbCourse.id,
                  name: dbCourse.name,
                  code: dbCourse.code,
                };
                courseCache.set(courseKey, course);
              }
            }

            // 既存社員を検索
            const existing = await tx.employee.findUnique({
              where: { employeeId: processed.employeeId },
              include: { department: true, section: true, course: true },
            });

            if (existing) {
              // 既存社員を更新
              const oldDepartmentId = existing.departmentId;
              const isTransfer = oldDepartmentId !== department.id;

              // メール重複チェック（別の社員が同じメールを使用していないか）
              let emailToUse: string | null = processed.email || null;
              if (emailToUse && emailToUse !== existing.email) {
                const emailConflict = await tx.employee.findFirst({
                  where: {
                    email: emailToUse,
                    id: { not: existing.id },
                  },
                });
                if (emailConflict) {
                  console.log(
                    `Email conflict on update: ${emailToUse} already used by ${emailConflict.employeeId}, keeping original for ${processed.employeeId}`,
                  );
                  emailToUse = existing.email; // 元のメールを維持
                }
              }

              // 前の履歴のvalidToを更新
              await tx.employeeHistory.updateMany({
                where: {
                  employeeId: existing.id,
                  validTo: null,
                },
                data: {
                  validTo: now,
                },
              });

              await tx.employee.update({
                where: { id: existing.id },
                data: {
                  name: processed.name,
                  nameKana: processed.nameKana,
                  email: emailToUse,
                  phone: processed.phone,
                  position: processed.position,
                  positionCode: processed.positionCode,
                  departmentId: department.id,
                  sectionId: section?.id || null,
                  courseId: course?.id || null,
                  departmentCode: processed.affiliationCode, // 7桁の所属コード
                  qualificationGrade: processed.qualificationGrade,
                  qualificationGradeCode: processed.qualificationGradeCode,
                  employmentType: processed.employmentType,
                  employmentTypeCode: processed.employmentTypeCode,
                  joinDate: processed.joinDate,
                  birthDate: processed.birthDate,
                  isActive: true,
                },
              });

              // 履歴スナップショットを作成
              await tx.employeeHistory.create({
                data: {
                  employeeId: existing.id,
                  validFrom: now,
                  name: processed.name,
                  nameKana: processed.nameKana,
                  email: emailToUse || "",
                  phone: processed.phone,
                  position: processed.position,
                  positionCode: processed.positionCode,
                  qualificationGrade: processed.qualificationGrade,
                  qualificationGradeCode: processed.qualificationGradeCode,
                  employmentType: processed.employmentType,
                  employmentTypeCode: processed.employmentTypeCode,
                  departmentCode: processed.affiliationCode, // 7桁の所属コード
                  joinDate: processed.joinDate,
                  birthDate: processed.birthDate,
                  isActive: true,
                  organizationId,
                  departmentId: department.id,
                  departmentName: department.name,
                  sectionId: section?.id,
                  sectionName: section?.name,
                  courseId: course?.id,
                  courseName: course?.name,
                  changeType: isTransfer ? "TRANSFER" : "UPDATE",
                  changeReason: isTransfer
                    ? "インポートによる異動"
                    : "インポートによる更新",
                  changedBy,
                },
              });

              if (isTransfer) {
                statistics.transferred++;
              } else {
                statistics.updated++;
              }
            } else {
              // 新規社員を作成
              // メール重複チェック（同じメールアドレスの社員が既に存在する場合はnullに）
              let emailToUse: string | null = processed.email || null;
              if (emailToUse) {
                const emailExists = await tx.employee.findFirst({
                  where: { email: emailToUse },
                });
                if (emailExists) {
                  console.log(
                    `Email conflict: ${emailToUse} already exists for ${emailExists.employeeId}, setting null for ${processed.employeeId}`,
                  );
                  emailToUse = null;
                }
              }

              const newEmployee = await tx.employee.create({
                data: {
                  employeeId: processed.employeeId,
                  name: processed.name,
                  nameKana: processed.nameKana,
                  email: emailToUse,
                  phone: processed.phone,
                  position: processed.position,
                  positionCode: processed.positionCode,
                  organizationId,
                  departmentId: department.id,
                  sectionId: section?.id || null,
                  courseId: course?.id || null,
                  departmentCode: processed.affiliationCode, // 7桁の所属コード
                  qualificationGrade: processed.qualificationGrade,
                  qualificationGradeCode: processed.qualificationGradeCode,
                  employmentType: processed.employmentType,
                  employmentTypeCode: processed.employmentTypeCode,
                  joinDate: processed.joinDate,
                  birthDate: processed.birthDate,
                  isActive: true,
                },
              });

              // 入社履歴スナップショットを作成
              await tx.employeeHistory.create({
                data: {
                  employeeId: newEmployee.id,
                  validFrom: now,
                  name: processed.name,
                  nameKana: processed.nameKana,
                  email: emailToUse || "",
                  phone: processed.phone,
                  position: processed.position,
                  positionCode: processed.positionCode,
                  qualificationGrade: processed.qualificationGrade,
                  qualificationGradeCode: processed.qualificationGradeCode,
                  employmentType: processed.employmentType,
                  employmentTypeCode: processed.employmentTypeCode,
                  departmentCode: processed.affiliationCode, // 7桁の所属コード
                  joinDate: processed.joinDate,
                  birthDate: processed.birthDate,
                  isActive: true,
                  organizationId,
                  departmentId: department.id,
                  departmentName: department.name,
                  sectionId: section?.id,
                  sectionName: section?.name,
                  courseId: course?.id,
                  courseName: course?.name,
                  changeType: "CREATE",
                  changeReason: "インポートによる新規登録",
                  changedBy,
                },
              });

              statistics.created++;
            }

            importedIds.add(processed.employeeId);
          } catch (error) {
            console.error(
              `Error processing employee ${processed.employeeId}:`,
              error,
            );
            statistics.errors++;
          }
        }

        // 退職処理（オプション）
        if (options?.markMissingAsRetired) {
          const existingEmployees = await tx.employee.findMany({
            where: {
              organizationId,
              isActive: true,
            },
            include: { department: true, section: true, course: true },
          });

          for (const existing of existingEmployees) {
            if (!importedIds.has(existing.employeeId)) {
              // 前の履歴のvalidToを更新
              await tx.employeeHistory.updateMany({
                where: {
                  employeeId: existing.id,
                  validTo: null,
                },
                data: {
                  validTo: now,
                },
              });

              await tx.employee.update({
                where: { id: existing.id },
                data: { isActive: false },
              });

              // 退職履歴スナップショットを作成
              await tx.employeeHistory.create({
                data: {
                  employeeId: existing.id,
                  validFrom: now,
                  name: existing.name,
                  nameKana: existing.nameKana,
                  email: existing.email || "",
                  phone: existing.phone,
                  position: existing.position,
                  positionCode: existing.positionCode,
                  qualificationGrade: existing.qualificationGrade,
                  qualificationGradeCode: existing.qualificationGradeCode,
                  employmentType: existing.employmentType,
                  employmentTypeCode: existing.employmentTypeCode,
                  departmentCode: existing.department?.code,
                  joinDate: existing.joinDate,
                  birthDate: existing.birthDate,
                  isActive: false,
                  organizationId,
                  departmentId: existing.departmentId,
                  departmentName: existing.department?.name || "",
                  sectionId: existing.sectionId,
                  sectionName: existing.section?.name,
                  courseId: existing.courseId,
                  courseName: existing.course?.name,
                  changeType: "RETIREMENT",
                  changeReason: "インポートデータに含まれていないため退職処理",
                  changedBy,
                },
              });

              statistics.retired++;
            }
          }
        }
      },
      {
        timeout: 300000, // 5分（601名のインポートに対応）
      },
    );

    // インポートログを記録
    await HistoryRecorder.recordChangeLog({
      entityType: "Organization",
      entityId: organizationId,
      changeType: "IMPORT",
      batchId,
      changedBy,
      changeDescription: `インポート完了: 新規${statistics.created}名, 更新${statistics.updated}名, 異動${statistics.transferred}名, 退職${statistics.retired}名, 重複除外${statistics.excludedDuplicates}名`,
    });

    return NextResponse.json({
      success: true,
      batchId,
      statistics,
    });
  } catch (error) {
    console.error("Error importing data:", error);
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 },
    );
  }
}
