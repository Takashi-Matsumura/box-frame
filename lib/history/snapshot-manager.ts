/**
 * スナップショット管理サービス
 * 組織構成のスナップショットを管理
 */

import { prisma } from "@/lib/prisma";
import type { OrganizationSnapshot } from "./types";

/**
 * スナップショット管理クラス
 */
export class SnapshotManager {
  /**
   * 組織の現在のスナップショットを作成
   */
  static async createOrganizationSnapshot(
    organizationId: string
  ): Promise<OrganizationSnapshot> {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        departments: {
          include: {
            sections: {
              include: {
                courses: true,
              },
            },
          },
        },
        employees: {
          where: { isActive: true },
        },
      },
    });

    if (!organization) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      departments: organization.departments.map((dept) => ({
        id: dept.id,
        name: dept.name,
        code: dept.code || undefined,
        managerId: dept.managerId || undefined,
        sections: dept.sections.map((section) => ({
          id: section.id,
          name: section.name,
          code: section.code || undefined,
          managerId: section.managerId || undefined,
          courses: section.courses.map((course) => ({
            id: course.id,
            name: course.name,
            code: course.code || undefined,
            managerId: course.managerId || undefined,
          })),
        })),
      })),
      employeeCount: organization.employees.length,
    };
  }

  /**
   * スナップショット間の差分を計算
   */
  static compareSnapshots(
    oldSnapshot: OrganizationSnapshot,
    newSnapshot: OrganizationSnapshot
  ): {
    addedDepartments: string[];
    removedDepartments: string[];
    addedSections: string[];
    removedSections: string[];
    addedCourses: string[];
    removedCourses: string[];
    employeeCountDiff: number;
  } {
    const oldDeptIds = new Set(oldSnapshot.departments.map((d) => d.id));
    const newDeptIds = new Set(newSnapshot.departments.map((d) => d.id));

    const oldSectionIds = new Set(
      oldSnapshot.departments.flatMap((d) => d.sections.map((s) => s.id))
    );
    const newSectionIds = new Set(
      newSnapshot.departments.flatMap((d) => d.sections.map((s) => s.id))
    );

    const oldCourseIds = new Set(
      oldSnapshot.departments.flatMap((d) =>
        d.sections.flatMap((s) => s.courses.map((c) => c.id))
      )
    );
    const newCourseIds = new Set(
      newSnapshot.departments.flatMap((d) =>
        d.sections.flatMap((s) => s.courses.map((c) => c.id))
      )
    );

    return {
      addedDepartments: [...newDeptIds].filter((id) => !oldDeptIds.has(id)),
      removedDepartments: [...oldDeptIds].filter((id) => !newDeptIds.has(id)),
      addedSections: [...newSectionIds].filter((id) => !oldSectionIds.has(id)),
      removedSections: [...oldSectionIds].filter((id) => !newSectionIds.has(id)),
      addedCourses: [...newCourseIds].filter((id) => !oldCourseIds.has(id)),
      removedCourses: [...oldCourseIds].filter((id) => !newCourseIds.has(id)),
      employeeCountDiff: newSnapshot.employeeCount - oldSnapshot.employeeCount,
    };
  }

  /**
   * 社員のスナップショットを作成
   */
  static async createEmployeeSnapshot(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        organization: true,
        department: true,
        section: true,
        course: true,
      },
    });

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    return {
      employeeId: employee.employeeId,
      name: employee.name,
      nameKana: employee.nameKana || undefined,
      email: employee.email || undefined,
      phone: employee.phone || undefined,
      position: employee.position,
      positionCode: employee.positionCode || undefined,
      departmentId: employee.departmentId,
      departmentName: employee.department.name,
      sectionId: employee.sectionId || undefined,
      sectionName: employee.section?.name,
      courseId: employee.courseId || undefined,
      courseName: employee.course?.name,
      qualificationGrade: employee.qualificationGrade || undefined,
      qualificationGradeCode: employee.qualificationGradeCode || undefined,
      employmentType: employee.employmentType || undefined,
      employmentTypeCode: employee.employmentTypeCode || undefined,
      isActive: employee.isActive,
    };
  }

  /**
   * 全社員のスナップショットを作成
   */
  static async createAllEmployeesSnapshot(organizationId: string) {
    const employees = await prisma.employee.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        department: true,
        section: true,
        course: true,
      },
    });

    return employees.map((employee) => ({
      employeeId: employee.employeeId,
      name: employee.name,
      nameKana: employee.nameKana || undefined,
      email: employee.email || undefined,
      phone: employee.phone || undefined,
      position: employee.position,
      positionCode: employee.positionCode || undefined,
      departmentId: employee.departmentId,
      departmentName: employee.department.name,
      sectionId: employee.sectionId || undefined,
      sectionName: employee.section?.name,
      courseId: employee.courseId || undefined,
      courseName: employee.course?.name,
      qualificationGrade: employee.qualificationGrade || undefined,
      qualificationGradeCode: employee.qualificationGradeCode || undefined,
      employmentType: employee.employmentType || undefined,
      employmentTypeCode: employee.employmentTypeCode || undefined,
      isActive: employee.isActive,
    }));
  }

  /**
   * 社員の所属履歴を時系列で取得
   */
  static async getEmployeeDepartmentHistory(employeeId: string) {
    return prisma.employeeHistory.findMany({
      where: { employeeId },
      orderBy: { validFrom: "asc" },
    });
  }

  /**
   * 組織の履歴をタイムライン形式で取得
   */
  static async getOrganizationTimeline(
    organizationId: string,
    limit = 10
  ) {
    const histories = await prisma.organizationHistory.findMany({
      where: { organizationId },
      orderBy: { validFrom: "desc" },
      take: limit,
    });

    return histories.map((history) => ({
      id: history.id,
      validFrom: history.validFrom,
      changeType: history.changeType,
      changeDescription: history.changeDescription,
      changedBy: history.changedBy,
      employeeCount: history.employeeCountSnapshot,
      departmentCount: history.departmentCount,
      sectionCount: history.sectionCount,
      courseCount: history.courseCount,
    }));
  }
}
