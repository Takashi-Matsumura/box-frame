import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { processEmployeeDataWithDeduplication } from "@/lib/importers/organization/parser";
import type { CSVEmployeeRow, PreviewResult, FieldChange, ExcludedDuplicateInfo } from "@/lib/importers/organization/types";

/**
 * POST /api/admin/organization/import/preview
 *
 * インポートプレビュー（差分確認）
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { data, organizationId } = body as {
      data: CSVEmployeeRow[];
      organizationId: string;
    };

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // 組織の存在確認
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // CSVデータを処理（役員・顧問の重複除去を含む）
    const { employees: processedData, excludedDuplicates } =
      processEmployeeDataWithDeduplication(data);

    // 除外された重複社員の情報を変換
    const excludedDuplicateInfos: ExcludedDuplicateInfo[] = excludedDuplicates.map(
      (dup) => ({
        employeeId: dup.employee.employeeId,
        name: dup.employee.name,
        position: dup.employee.position,
        reason: dup.reason,
        keptEmployeeId: dup.keptEmployeeId,
      })
    );

    // 既存社員を取得
    const existingEmployees = await prisma.employee.findMany({
      where: { organizationId },
      include: {
        department: true,
        section: true,
        course: true,
      },
    });

    const existingMap = new Map(
      existingEmployees.map((emp) => [emp.employeeId, emp])
    );
    const importedIds = new Set(processedData.map((p) => p.employeeId));

    // プレビュー結果を構築
    const preview: PreviewResult = {
      totalRecords: processedData.length,
      newEmployees: [],
      updatedEmployees: [],
      transferredEmployees: [],
      retiredEmployees: [],
      excludedDuplicates: excludedDuplicateInfos,
      errors: [],
    };

    for (const processed of processedData) {
      const existing = existingMap.get(processed.employeeId);

      if (!existing) {
        // 新規社員
        preview.newEmployees.push(processed);
      } else {
        // 既存社員 - 変更を検出
        const changes: FieldChange[] = [];

        // 各フィールドの変更を検出
        const fieldMappings: {
          field: keyof typeof processed;
          fieldJa: string;
          existingField: keyof typeof existing;
        }[] = [
          { field: "name", fieldJa: "氏名", existingField: "name" },
          { field: "nameKana", fieldJa: "氏名（フリガナ）", existingField: "nameKana" },
          { field: "email", fieldJa: "メールアドレス", existingField: "email" },
          { field: "phone", fieldJa: "電話番号", existingField: "phone" },
          { field: "position", fieldJa: "役職", existingField: "position" },
          { field: "positionCode", fieldJa: "役職コード", existingField: "positionCode" },
          { field: "qualificationGrade", fieldJa: "資格等級", existingField: "qualificationGrade" },
          { field: "qualificationGradeCode", fieldJa: "資格等級コード", existingField: "qualificationGradeCode" },
          { field: "employmentType", fieldJa: "雇用区分", existingField: "employmentType" },
          { field: "employmentTypeCode", fieldJa: "雇用区分コード", existingField: "employmentTypeCode" },
        ];

        for (const mapping of fieldMappings) {
          const oldValue = existing[mapping.existingField] ?? "";
          const newValue = processed[mapping.field] ?? "";
          if (String(oldValue) !== String(newValue)) {
            changes.push({
              fieldName: mapping.field,
              fieldNameJa: mapping.fieldJa,
              oldValue: String(oldValue),
              newValue: String(newValue),
            });
          }
        }

        // 所属変更の検出
        const oldDepartment = existing.department?.name || "";
        const newDepartment = processed.department || "";
        const oldSection = existing.section?.name || "";
        const newSection = processed.section || "";
        const oldCourse = existing.course?.name || "";
        const newCourse = processed.course || "";

        if (oldDepartment !== newDepartment) {
          // 異動
          preview.transferredEmployees.push({
            employee: processed,
            oldDepartment,
            newDepartment,
          });
        } else if (
          oldSection !== newSection ||
          oldCourse !== newCourse
        ) {
          // セクション/コース変更も異動として扱う
          preview.transferredEmployees.push({
            employee: processed,
            oldDepartment: `${oldDepartment}/${oldSection}/${oldCourse}`.replace(/\/+$/, ""),
            newDepartment: `${newDepartment}/${newSection}/${newCourse}`.replace(/\/+$/, ""),
          });
        }

        // その他の変更がある場合
        if (changes.length > 0) {
          preview.updatedEmployees.push({
            employee: processed,
            changes,
          });
        }
      }
    }

    // 退職社員の検出
    for (const existing of existingEmployees) {
      if (existing.isActive && !importedIds.has(existing.employeeId)) {
        preview.retiredEmployees.push({
          employeeId: existing.employeeId,
          name: existing.name,
          department: existing.department?.name || "",
        });
      }
    }

    return NextResponse.json({
      preview,
      summary: {
        new: preview.newEmployees.length,
        updated: preview.updatedEmployees.length,
        transferred: preview.transferredEmployees.length,
        retired: preview.retiredEmployees.length,
        errors: preview.errors.length,
      },
    });
  } catch (error) {
    console.error("Error generating preview:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    );
  }
}
