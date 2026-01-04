/**
 * 組織図インポーター
 * 組織図専用のインポートロジックを実装
 * 履歴記録機能を統合
 */

import { prisma } from "@/lib/prisma";
import type { ChangeType, Employee, Prisma } from "@prisma/client";
import { BaseImporter, type ImportResult } from "../base-importer";
import { processEmployeeData } from "./parser";
import { HistoryRecorder } from "@/lib/history/history-recorder";
import type {
  CSVEmployeeRow,
  FieldChange,
  PreviewResult,
  ProcessedEmployee,
} from "./types";

/**
 * 組織図インポータークラス
 */
export class OrganizationImporter extends BaseImporter<
  CSVEmployeeRow,
  ProcessedEmployee
> {
  constructor() {
    super({
      fileTypes: ["csv", "xlsx"],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      requiredColumns: ["氏名", "社員番号", "所属"],
    });
  }

  /**
   * データを処理（組織図専用）
   */
  processData(rows: CSVEmployeeRow[]): ProcessedEmployee[] {
    return processEmployeeData(rows);
  }

  /**
   * プレビュー（差分確認）
   */
  async preview(employees: ProcessedEmployee[]): Promise<PreviewResult> {
    const newEmployees: ProcessedEmployee[] = [];
    const updatedEmployees: {
      employee: ProcessedEmployee;
      changes: FieldChange[];
    }[] = [];
    const transferredEmployees: {
      employee: ProcessedEmployee;
      oldDepartment: string;
      newDepartment: string;
    }[] = [];
    const errors: { row: number; message: string }[] = [];

    // 既存社員のIDセット
    const existingEmployeeIds = new Set<string>();

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];

      try {
        const existing = await prisma.employee.findUnique({
          where: { employeeId: emp.employeeId },
          include: {
            department: true,
            section: true,
            course: true,
          },
        });

        if (!existing) {
          newEmployees.push(emp);
        } else {
          existingEmployeeIds.add(existing.employeeId);
          const changes = this.detectFieldChanges(existing, emp);

          // 部門変更があれば異動として扱う
          const deptChange = changes.find((c) => c.fieldName === "department");
          if (deptChange) {
            transferredEmployees.push({
              employee: emp,
              oldDepartment: deptChange.oldValue,
              newDepartment: deptChange.newValue,
            });
          } else if (changes.length > 0) {
            updatedEmployees.push({ employee: emp, changes });
          }
        }
      } catch (error) {
        errors.push({
          row: i + 2, // 1-indexed + header row
          message:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // 退職者を検出
    const newEmployeeIds = new Set(employees.map((e) => e.employeeId));
    const activeEmployees = await prisma.employee.findMany({
      where: { isActive: true },
      include: { department: true },
    });

    const retiredEmployees = activeEmployees
      .filter((e) => !newEmployeeIds.has(e.employeeId))
      .map((e) => ({
        employeeId: e.employeeId,
        name: e.name,
        department: e.department.name,
      }));

    return {
      totalRecords: employees.length,
      newEmployees,
      updatedEmployees,
      transferredEmployees,
      retiredEmployees,
      excludedDuplicates: [],
      errors,
    };
  }

  /**
   * フィールド変更を検出
   */
  private detectFieldChanges(
    existing: any,
    newData: ProcessedEmployee
  ): FieldChange[] {
    const changes: FieldChange[] = [];

    const fieldMappings: {
      field: string;
      fieldJa: string;
      existingKey: string;
      newKey: keyof ProcessedEmployee;
      isRelation?: boolean;
    }[] = [
      { field: "name", fieldJa: "氏名", existingKey: "name", newKey: "name" },
      {
        field: "nameKana",
        fieldJa: "フリガナ",
        existingKey: "nameKana",
        newKey: "nameKana",
      },
      {
        field: "email",
        fieldJa: "メール",
        existingKey: "email",
        newKey: "email",
      },
      {
        field: "phone",
        fieldJa: "電話番号",
        existingKey: "phone",
        newKey: "phone",
      },
      {
        field: "department",
        fieldJa: "本部",
        existingKey: "department.name",
        newKey: "department",
        isRelation: true,
      },
      {
        field: "section",
        fieldJa: "部",
        existingKey: "section.name",
        newKey: "section",
        isRelation: true,
      },
      {
        field: "course",
        fieldJa: "課",
        existingKey: "course.name",
        newKey: "course",
        isRelation: true,
      },
      {
        field: "position",
        fieldJa: "役職",
        existingKey: "position",
        newKey: "position",
      },
      {
        field: "qualificationGrade",
        fieldJa: "資格等級",
        existingKey: "qualificationGrade",
        newKey: "qualificationGrade",
      },
      {
        field: "employmentType",
        fieldJa: "雇用区分",
        existingKey: "employmentType",
        newKey: "employmentType",
      },
    ];

    for (const mapping of fieldMappings) {
      let oldValue: string;
      if (mapping.isRelation) {
        const [relation, key] = mapping.existingKey.split(".");
        oldValue = existing[relation]?.[key] || "";
      } else {
        oldValue = existing[mapping.existingKey] || "";
      }
      const newValue = String(newData[mapping.newKey] || "");

      if (oldValue !== newValue) {
        changes.push({
          fieldName: mapping.field,
          fieldNameJa: mapping.fieldJa,
          oldValue,
          newValue,
        });
      }
    }

    return changes;
  }

  /**
   * 変更タイプを判定
   */
  private determineChangeType(
    existing: Employee & {
      department: { name: string } | null;
      section: { name: string } | null;
      course: { name: string } | null;
    },
    newData: ProcessedEmployee,
    changes: FieldChange[]
  ): ChangeType {
    // 退職からの復職
    if (!existing.isActive) {
      return "REJOINING";
    }

    // 所属変更（異動）
    const hasDepartmentChange = changes.some(
      (c) =>
        c.fieldName === "department" ||
        c.fieldName === "section" ||
        c.fieldName === "course"
    );
    if (hasDepartmentChange) {
      return "TRANSFER";
    }

    // 役職変更（昇進/降格）
    const hasPositionChange = changes.some(
      (c) => c.fieldName === "position" || c.fieldName === "positionCode"
    );
    if (hasPositionChange) {
      return "PROMOTION";
    }

    // その他の更新
    return "UPDATE";
  }

  /**
   * 社員履歴を記録
   */
  private async recordEmployeeHistory(
    tx: Prisma.TransactionClient,
    employee: Employee & {
      department: { id: string; name: string };
      section: { id: string; name: string } | null;
      course: { id: string; name: string } | null;
    },
    changeType: ChangeType,
    changeReason: string | null,
    changedBy: string,
    effectiveDate: Date
  ): Promise<void> {
    // 既存の履歴の validTo を更新
    await tx.employeeHistory.updateMany({
      where: {
        employeeId: employee.id,
        validTo: null,
      },
      data: {
        validTo: effectiveDate,
      },
    });

    // 新しい履歴レコードを作成
    await tx.employeeHistory.create({
      data: {
        employeeId: employee.id,
        validFrom: effectiveDate,
        validTo: null,
        name: employee.name,
        nameKana: employee.nameKana,
        email: employee.email || "",
        profileImage: employee.profileImage,
        phone: employee.phone,
        position: employee.position,
        positionCode: employee.positionCode,
        qualificationGrade: employee.qualificationGrade,
        qualificationGradeCode: employee.qualificationGradeCode,
        employmentType: employee.employmentType,
        employmentTypeCode: employee.employmentTypeCode,
        departmentCode: employee.departmentCode,
        joinDate: employee.joinDate,
        birthDate: employee.birthDate,
        isActive: employee.isActive,
        organizationId: employee.organizationId,
        departmentId: employee.departmentId,
        departmentName: employee.department.name,
        sectionId: employee.sectionId,
        sectionName: employee.section?.name,
        courseId: employee.courseId,
        courseName: employee.course?.name,
        changeType,
        changeReason,
        changedBy,
      },
    });
  }

  /**
   * データベースにインポート
   */
  async importToDatabase(
    employees: ProcessedEmployee[],
    changedBy = "admin"
  ): Promise<ImportResult> {
    console.log(
      `Starting database import for ${employees.length} employees...`
    );

    // バッチIDを生成
    const batchId = HistoryRecorder.generateBatchId();
    const effectiveDate = new Date();

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 組織を取得または作成
        let org = await tx.organization.findFirst({
          where: { name: "Default Organization" },
        });

        if (!org) {
          org = await tx.organization.create({
            data: {
              name: "Default Organization",
              description: "デフォルト組織",
            },
          });
          console.log(`Created organization: ${org.name}`);
        }

        // 部門・セクション・コースのマップ
        const departmentMap = new Map<string, string>();
        const sectionMap = new Map<string, string>();
        const courseMap = new Map<string, string>();

        // 注: ProcessedEmployee には以下のコードが含まれる（parser.ts で解析済み）
        // - departmentCode: 本部コード（1-2桁目）
        // - sectionCode: 部コード（3-4桁目）
        // - courseCode: 課コード（5-7桁目）
        // - affiliationCode: 元の7桁コード

        // 部門を作成
        const uniqueDepartments = [
          ...new Set(employees.map((e) => e.department).filter((d) => d)),
        ];
        for (const deptName of uniqueDepartments) {
          const deptEmployee = employees.find((e) => e.department === deptName);
          // departmentCodeは本部コード（1-2桁目）が既に設定されている
          const deptCode = deptEmployee?.departmentCode;

          let dept = await tx.department.findFirst({
            where: { name: deptName, organizationId: org.id },
          });

          if (!dept) {
            dept = await tx.department.create({
              data: {
                name: deptName,
                code: deptCode,
                organizationId: org.id,
              },
            });
            console.log(`Created department: ${deptName} (code: ${deptCode})`);
          } else if (deptCode && dept.code !== deptCode) {
            // 既存の部門のコードを更新
            await tx.department.update({
              where: { id: dept.id },
              data: { code: deptCode },
            });
            console.log(`Updated department code: ${deptName} -> ${deptCode}`);
          }

          departmentMap.set(deptName, dept.id);
        }

        // セクションを作成
        const uniqueSections = employees
          .filter((e) => e.department && e.section)
          .map((e) => ({
            department: e.department,
            section: e.section!,
            sectionCode: e.sectionCode,  // 部コード（3-4桁目）
          }));

        const processedSections = new Set<string>();
        for (const { department, section, sectionCode } of uniqueSections) {
          const key = `${department}/${section}`;
          if (!processedSections.has(key)) {
            processedSections.add(key);

            const deptId = departmentMap.get(department);
            if (!deptId) continue;

            let sec = await tx.section.findFirst({
              where: { name: section, departmentId: deptId },
            });

            if (!sec) {
              sec = await tx.section.create({
                data: {
                  name: section,
                  code: sectionCode,  // 部コード（3-4桁目）
                  departmentId: deptId,
                },
              });
              console.log(`Created section: ${department}/${section} (code: ${sectionCode})`);
            } else if (sectionCode && sec.code !== sectionCode) {
              // 既存のセクションのコードを更新
              await tx.section.update({
                where: { id: sec.id },
                data: { code: sectionCode },
              });
              console.log(`Updated section code: ${section} -> ${sectionCode}`);
            }

            sectionMap.set(key, sec.id);
          }
        }

        // コースを作成
        const uniqueCourses = employees
          .filter((e) => e.department && e.section && e.course)
          .map((e) => ({
            department: e.department,
            section: e.section!,
            course: e.course!,
            courseCode: e.courseCode,  // 課コード（5-7桁目）
          }));

        const processedCourses = new Set<string>();
        for (const {
          department,
          section,
          course,
          courseCode,
        } of uniqueCourses) {
          const key = `${department}/${section}/${course}`;
          if (!processedCourses.has(key)) {
            processedCourses.add(key);

            const sectionId = sectionMap.get(`${department}/${section}`);
            if (!sectionId) continue;

            let crs = await tx.course.findFirst({
              where: { name: course, sectionId },
            });

            if (!crs) {
              crs = await tx.course.create({
                data: {
                  name: course,
                  code: courseCode,  // 課コード（5-7桁目）
                  sectionId,
                },
              });
              console.log(`Created course: ${department}/${section}/${course} (code: ${courseCode})`);
            } else if (courseCode && crs.code !== courseCode) {
              // 既存のコースのコードを更新
              await tx.course.update({
                where: { id: crs.id },
                data: { code: courseCode },
              });
              console.log(`Updated course code: ${course} -> ${courseCode}`);
            }

            courseMap.set(key, crs.id);
          }
        }

        // 社員を作成または更新（履歴記録付き）
        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let transferredCount = 0;
        let promotedCount = 0;
        const changeLogEntries: {
          entityType: string;
          entityId: string;
          changeType: ChangeType;
          fieldName?: string;
          oldValue?: string;
          newValue?: string;
          changeDescription?: string;
          batchId: string;
          changedBy: string;
        }[] = [];

        for (const emp of employees) {
          const existing = await tx.employee.findFirst({
            where: {
              OR: [{ employeeId: emp.employeeId }, { email: emp.email }],
            },
            include: {
              department: true,
              section: true,
              course: true,
            },
          });

          const deptId = departmentMap.get(emp.department);
          if (!deptId) {
            console.warn(`Department not found for employee: ${emp.name}`);
            skippedCount++;
            continue;
          }

          const sectionId = emp.section
            ? sectionMap.get(`${emp.department}/${emp.section}`)
            : undefined;
          const courseId = emp.course
            ? courseMap.get(`${emp.department}/${emp.section}/${emp.course}`)
            : undefined;

          // 部門名を取得
          const dept = await tx.department.findUnique({
            where: { id: deptId },
          });
          const section = sectionId
            ? await tx.section.findUnique({ where: { id: sectionId } })
            : null;
          const course = courseId
            ? await tx.course.findUnique({ where: { id: courseId } })
            : null;

          if (existing) {
            // 変更を検出
            const changes = this.detectFieldChanges(existing, emp);

            if (changes.length > 0) {
              // 変更タイプを判定
              const changeType = this.determineChangeType(
                existing,
                emp,
                changes
              );

              // 社員データを更新
              const updatedEmployee = await tx.employee.update({
                where: { id: existing.id },
                data: {
                  name: emp.name,
                  nameKana: emp.nameKana,
                  email: emp.email || null,
                  phone: emp.phone,
                  position: emp.position,
                  positionCode: emp.positionCode,
                  qualificationGrade: emp.qualificationGrade,
                  qualificationGradeCode: emp.qualificationGradeCode,
                  employmentType: emp.employmentType,
                  employmentTypeCode: emp.employmentTypeCode,
                  departmentCode: emp.affiliationCode,  // 7桁の所属コードを保存
                  joinDate: emp.joinDate,
                  birthDate: emp.birthDate,
                  isActive: true,
                  organizationId: org.id,
                  departmentId: deptId,
                  sectionId,
                  courseId,
                },
                include: {
                  department: true,
                  section: true,
                  course: true,
                },
              });

              // 履歴を記録
              await this.recordEmployeeHistory(
                tx,
                updatedEmployee,
                changeType,
                `インポートによる${changeType === "TRANSFER" ? "異動" : changeType === "PROMOTION" ? "昇進" : "更新"}`,
                changedBy,
                effectiveDate
              );

              // 変更ログエントリを追加
              for (const change of changes) {
                changeLogEntries.push({
                  entityType: "Employee",
                  entityId: updatedEmployee.id,
                  changeType,
                  fieldName: change.fieldName,
                  oldValue: change.oldValue,
                  newValue: change.newValue,
                  changeDescription: `${change.fieldNameJa}: ${change.oldValue || "(なし)"} → ${change.newValue || "(なし)"}`,
                  batchId,
                  changedBy,
                });
              }

              // カウント更新
              if (changeType === "TRANSFER") {
                transferredCount++;
              } else if (changeType === "PROMOTION") {
                promotedCount++;
              }
              updatedCount++;
            } else {
              // 変更なし - データは同じだがisActiveをtrueに
              await tx.employee.update({
                where: { id: existing.id },
                data: { isActive: true },
              });
            }
          } else {
            // 新規社員を作成
            const newEmployee = await tx.employee.create({
              data: {
                employeeId: emp.employeeId,
                name: emp.name,
                nameKana: emp.nameKana,
                email: emp.email || null,
                phone: emp.phone,
                position: emp.position,
                positionCode: emp.positionCode,
                qualificationGrade: emp.qualificationGrade,
                qualificationGradeCode: emp.qualificationGradeCode,
                employmentType: emp.employmentType,
                employmentTypeCode: emp.employmentTypeCode,
                departmentCode: emp.affiliationCode,  // 7桁の所属コードを保存
                joinDate: emp.joinDate,
                birthDate: emp.birthDate,
                isActive: true,
                organizationId: org.id,
                departmentId: deptId,
                sectionId,
                courseId,
              },
              include: {
                department: true,
                section: true,
                course: true,
              },
            });

            // 新規社員の履歴を記録
            await this.recordEmployeeHistory(
              tx,
              newEmployee,
              "CREATE",
              "インポートによる新規登録",
              changedBy,
              effectiveDate
            );

            // 変更ログエントリを追加
            changeLogEntries.push({
              entityType: "Employee",
              entityId: newEmployee.id,
              changeType: "CREATE",
              changeDescription: `新規登録: ${emp.name} (${emp.employeeId})`,
              batchId,
              changedBy,
            });

            createdCount++;
          }
        }

        // 退職者を検出して処理
        const newEmployeeIds = employees.map((e) => e.employeeId);
        const retiredEmployees = await tx.employee.findMany({
          where: {
            isActive: true,
            employeeId: {
              notIn: newEmployeeIds,
            },
          },
          include: {
            department: true,
            section: true,
            course: true,
          },
        });

        // 退職者を isActive = false に更新し、履歴を記録
        for (const retired of retiredEmployees) {
          await tx.employee.update({
            where: { id: retired.id },
            data: { isActive: false },
          });

          // 退職履歴を記録
          await this.recordEmployeeHistory(
            tx,
            { ...retired, isActive: false },
            "RETIREMENT",
            "インポートデータに存在しないため退職扱い",
            changedBy,
            effectiveDate
          );

          // 変更ログエントリを追加
          changeLogEntries.push({
            entityType: "Employee",
            entityId: retired.id,
            changeType: "RETIREMENT",
            fieldName: "isActive",
            oldValue: "true",
            newValue: "false",
            changeDescription: `退職: ${retired.name} (${retired.employeeId})`,
            batchId,
            changedBy,
          });
        }

        console.log(
          `Marked ${retiredEmployees.length} employees as inactive (retired)`
        );

        // 変更ログを一括記録
        if (changeLogEntries.length > 0) {
          await tx.changeLog.createMany({
            data: changeLogEntries,
          });
          console.log(`Recorded ${changeLogEntries.length} change log entries`);
        }

        // 管理者を自動割り当て
        await this.assignManagers(tx, departmentMap, sectionMap, courseMap);

        return {
          organizationId: org.id,
          batchId,
          totalEmployees: employees.length,
          employeesCreated: createdCount,
          employeesUpdated: updatedCount,
          employeesSkipped: skippedCount,
          employeesRetired: retiredEmployees.length,
          employeesTransferred: transferredCount,
          employeesPromoted: promotedCount,
          departmentsCreated: departmentMap.size,
          sectionsCreated: sectionMap.size,
          coursesCreated: courseMap.size,
          changeLogCount: changeLogEntries.length,
        };
      });

      // スナップショット未作成フラグを設定
      await prisma.systemSetting.upsert({
        where: { key: "pendingSnapshotAfterImport" },
        update: {
          value: JSON.stringify({
            pending: true,
            importedAt: new Date().toISOString(),
            importedBy: changedBy,
            batchId: result.batchId,
          }),
        },
        create: {
          key: "pendingSnapshotAfterImport",
          value: JSON.stringify({
            pending: true,
            importedAt: new Date().toISOString(),
            importedBy: changedBy,
            batchId: result.batchId,
          }),
        },
      });

      // 結果メッセージを構築
      const messageParts = [`作成: ${result.employeesCreated}名`];
      if (result.employeesTransferred > 0) {
        messageParts.push(`異動: ${result.employeesTransferred}名`);
      }
      if (result.employeesPromoted > 0) {
        messageParts.push(`昇進: ${result.employeesPromoted}名`);
      }
      if (result.employeesUpdated - result.employeesTransferred - result.employeesPromoted > 0) {
        messageParts.push(`更新: ${result.employeesUpdated - result.employeesTransferred - result.employeesPromoted}名`);
      }
      if (result.employeesRetired > 0) {
        messageParts.push(`退職: ${result.employeesRetired}名`);
      }

      return {
        success: true,
        message: `インポートが完了しました（${messageParts.join("、")}）`,
        data: result,
        statistics: {
          totalRecords: result.totalEmployees,
          created: result.employeesCreated,
          updated: result.employeesUpdated,
          transferred: result.employeesTransferred,
          promoted: result.employeesPromoted,
          retired: result.employeesRetired,
          skipped: result.employeesSkipped,
        },
      };
    } catch (error) {
      console.error("Database import error:", error);
      return {
        success: false,
        message: "インポート中にエラーが発生しました",
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * 管理者を自動割り当て
   */
  private async assignManagers(
    tx: any,
    departmentMap: Map<string, string>,
    sectionMap: Map<string, string>,
    courseMap: Map<string, string>
  ): Promise<void> {
    console.log("Assigning managers based on positions...");

    const managerPositionKeywords = {
      department: ["本部長", "統括", "事業部長", "役員"],
      section: ["部長", "室長", "支店長"],
      course: ["課長", "グループ長", "チーム長"],
    };

    // 部門の管理者を設定
    for (const [deptName, deptId] of departmentMap.entries()) {
      const deptEmployees = await tx.employee.findMany({
        where: { departmentId: deptId, isActive: true },
      });

      const manager = deptEmployees.find((emp: any) =>
        managerPositionKeywords.department.some((keyword) =>
          emp.position?.includes(keyword)
        )
      );

      if (manager) {
        await tx.department.update({
          where: { id: deptId },
          data: { managerId: manager.id },
        });
        console.log(`Set manager for ${deptName}: ${manager.name}`);
      }
    }

    // セクションの管理者を設定
    for (const [key, sectionId] of sectionMap.entries()) {
      const [deptName] = key.split("/");
      const deptId = departmentMap.get(deptName);

      if (!deptId) continue;

      const sectionEmployees = await tx.employee.findMany({
        where: {
          departmentId: deptId,
          sectionId: sectionId,
          isActive: true,
        },
      });

      const manager = sectionEmployees.find((emp: any) =>
        managerPositionKeywords.section.some((keyword) =>
          emp.position?.includes(keyword)
        )
      );

      if (manager) {
        await tx.section.update({
          where: { id: sectionId },
          data: { managerId: manager.id },
        });
        console.log(`Set manager for ${key}: ${manager.name}`);
      }
    }

    // コースの管理者を設定
    for (const [key, courseId] of courseMap.entries()) {
      const [deptName, sectionName] = key.split("/");
      const sectionKey = `${deptName}/${sectionName}`;
      const sectionId = sectionMap.get(sectionKey);

      if (!sectionId) continue;

      const courseEmployees = await tx.employee.findMany({
        where: {
          sectionId: sectionId,
          courseId: courseId,
          isActive: true,
        },
      });

      const manager = courseEmployees.find((emp: any) =>
        managerPositionKeywords.course.some((keyword) =>
          emp.position?.includes(keyword)
        )
      );

      if (manager) {
        await tx.course.update({
          where: { id: courseId },
          data: { managerId: manager.id },
        });
        console.log(`Set manager for ${key}: ${manager.name}`);
      }
    }

    console.log("Manager assignment completed");
  }
}
