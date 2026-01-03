/**
 * 組織図インポーター
 * 組織図専用のインポートロジックを実装
 */

import { prisma } from "@/lib/prisma";
import { BaseImporter, type ImportResult } from "../base-importer";
import { processEmployeeData } from "./parser";
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
   * データベースにインポート
   */
  async importToDatabase(
    employees: ProcessedEmployee[],
    changedBy = "admin"
  ): Promise<ImportResult> {
    console.log(
      `Starting database import for ${employees.length} employees...`
    );

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

        // コードヘルパー関数
        const getDepartmentCode = (
          departmentCode?: string
        ): string | undefined => {
          if (!departmentCode || departmentCode.length < 2) return undefined;
          return departmentCode.substring(0, 2);
        };

        const getSectionCode = (
          departmentCode?: string
        ): string | undefined => {
          if (!departmentCode || departmentCode.length < 4) return undefined;
          return departmentCode.substring(0, 4);
        };

        const getCourseCode = (departmentCode?: string): string | undefined => {
          if (!departmentCode || departmentCode.length < 7) return undefined;
          return departmentCode;
        };

        // 部門を作成
        const uniqueDepartments = [
          ...new Set(employees.map((e) => e.department).filter((d) => d)),
        ];
        for (const deptName of uniqueDepartments) {
          const deptEmployee = employees.find((e) => e.department === deptName);
          const deptCode = getDepartmentCode(deptEmployee?.departmentCode);

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
            console.log(`Created department: ${deptName}`);
          }

          departmentMap.set(deptName, dept.id);
        }

        // セクションを作成
        const uniqueSections = employees
          .filter((e) => e.department && e.section)
          .map((e) => ({
            department: e.department,
            section: e.section!,
            departmentCode: e.departmentCode,
          }));

        const processedSections = new Set<string>();
        for (const { department, section, departmentCode } of uniqueSections) {
          const key = `${department}/${section}`;
          if (!processedSections.has(key)) {
            processedSections.add(key);

            const deptId = departmentMap.get(department);
            if (!deptId) continue;

            const sectionCode = getSectionCode(departmentCode);

            let sec = await tx.section.findFirst({
              where: { name: section, departmentId: deptId },
            });

            if (!sec) {
              sec = await tx.section.create({
                data: {
                  name: section,
                  code: sectionCode,
                  departmentId: deptId,
                },
              });
              console.log(`Created section: ${department}/${section}`);
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
            departmentCode: e.departmentCode,
          }));

        const processedCourses = new Set<string>();
        for (const {
          department,
          section,
          course,
          departmentCode,
        } of uniqueCourses) {
          const key = `${department}/${section}/${course}`;
          if (!processedCourses.has(key)) {
            processedCourses.add(key);

            const sectionId = sectionMap.get(`${department}/${section}`);
            if (!sectionId) continue;

            const courseCode = getCourseCode(departmentCode);

            let crs = await tx.course.findFirst({
              where: { name: course, sectionId },
            });

            if (!crs) {
              crs = await tx.course.create({
                data: {
                  name: course,
                  code: courseCode,
                  sectionId,
                },
              });
              console.log(`Created course: ${department}/${section}/${course}`);
            }

            courseMap.set(key, crs.id);
          }
        }

        // 社員を作成または更新
        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const emp of employees) {
          const existing = await tx.employee.findFirst({
            where: {
              OR: [{ employeeId: emp.employeeId }, { email: emp.email }],
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

          if (existing) {
            await tx.employee.update({
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
                departmentCode: emp.departmentCode,
                joinDate: emp.joinDate,
                birthDate: emp.birthDate,
                isActive: true,
                organizationId: org.id,
                departmentId: deptId,
                sectionId,
                courseId,
              },
            });
            updatedCount++;
          } else {
            await tx.employee.create({
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
                departmentCode: emp.departmentCode,
                joinDate: emp.joinDate,
                birthDate: emp.birthDate,
                isActive: true,
                organizationId: org.id,
                departmentId: deptId,
                sectionId,
                courseId,
              },
            });
            createdCount++;
          }
        }

        // 退職者を isActive = false に更新
        const newEmployeeIds = employees.map((e) => e.employeeId);
        const retiredResult = await tx.employee.updateMany({
          where: {
            isActive: true,
            employeeId: {
              notIn: newEmployeeIds,
            },
          },
          data: {
            isActive: false,
          },
        });

        console.log(
          `Marked ${retiredResult.count} employees as inactive (retired)`
        );

        // 管理者を自動割り当て
        await this.assignManagers(tx, departmentMap, sectionMap, courseMap);

        return {
          organizationId: org.id,
          totalEmployees: employees.length,
          employeesCreated: createdCount,
          employeesUpdated: updatedCount,
          employeesSkipped: skippedCount,
          employeesRetired: retiredResult.count,
          departmentsCreated: departmentMap.size,
          sectionsCreated: sectionMap.size,
          coursesCreated: courseMap.size,
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
          }),
        },
        create: {
          key: "pendingSnapshotAfterImport",
          value: JSON.stringify({
            pending: true,
            importedAt: new Date().toISOString(),
            importedBy: changedBy,
          }),
        },
      });

      return {
        success: true,
        message: `インポートが完了しました（作成: ${result.employeesCreated}名、更新: ${result.employeesUpdated}名、退職: ${result.employeesRetired}名）`,
        data: result,
        statistics: {
          totalRecords: result.totalEmployees,
          created: result.employeesCreated,
          updated: result.employeesUpdated,
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
