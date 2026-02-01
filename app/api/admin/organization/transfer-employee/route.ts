import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ChangeType } from "@prisma/client";
import { randomUUID } from "crypto";

/**
 * POST /api/admin/organization/transfer-employee
 *
 * 個別社員をメイン組織へ転籍する
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, targetOrgId } = body;

    if (!employeeId || !targetOrgId) {
      return NextResponse.json(
        { error: "employeeId and targetOrgId are required" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const batchId = randomUUID();
      const changedBy = session.user.name || session.user.email || "system";

      // Fetch employee with current department/section/course
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: {
          department: true,
          section: true,
          course: true,
          organization: true,
        },
      });

      if (!employee) {
        throw new Error("Employee not found");
      }

      if (employee.organizationId === targetOrgId) {
        throw new Error("Employee already belongs to the target organization");
      }

      // Find or create matching department in target org
      let targetDeptId: string;
      const existingDept = await tx.department.findUnique({
        where: {
          organizationId_name: {
            organizationId: targetOrgId,
            name: employee.department.name,
          },
        },
      });

      if (existingDept) {
        targetDeptId = existingDept.id;
      } else {
        const newDept = await tx.department.create({
          data: {
            name: employee.department.name,
            code: employee.department.code,
            organizationId: targetOrgId,
          },
        });
        targetDeptId = newDept.id;
      }

      // Find or create matching section
      let targetSectionId: string | null = null;
      if (employee.section) {
        const existingSection = await tx.section.findUnique({
          where: {
            departmentId_name: {
              departmentId: targetDeptId,
              name: employee.section.name,
            },
          },
        });

        if (existingSection) {
          targetSectionId = existingSection.id;
        } else {
          const newSection = await tx.section.create({
            data: {
              name: employee.section.name,
              code: employee.section.code,
              departmentId: targetDeptId,
            },
          });
          targetSectionId = newSection.id;
        }
      }

      // Find or create matching course
      let targetCourseId: string | null = null;
      if (employee.course && targetSectionId) {
        const existingCourse = await tx.course.findUnique({
          where: {
            sectionId_name: {
              sectionId: targetSectionId,
              name: employee.course.name,
            },
          },
        });

        if (existingCourse) {
          targetCourseId = existingCourse.id;
        } else {
          const newCourse = await tx.course.create({
            data: {
              name: employee.course.name,
              code: employee.course.code,
              sectionId: targetSectionId,
            },
          });
          targetCourseId = newCourse.id;
        }
      }

      // Get target names for history
      const targetDept = await tx.department.findUnique({
        where: { id: targetDeptId },
      });
      const targetSection = targetSectionId
        ? await tx.section.findUnique({ where: { id: targetSectionId } })
        : null;
      const targetCourse = targetCourseId
        ? await tx.course.findUnique({ where: { id: targetCourseId } })
        : null;

      // Update employee
      await tx.employee.update({
        where: { id: employee.id },
        data: {
          organizationId: targetOrgId,
          departmentId: targetDeptId,
          sectionId: targetSectionId,
          courseId: targetCourseId,
          isActive: true,
        },
      });

      // Create employee history
      await tx.employeeHistory.create({
        data: {
          employeeId: employee.id,
          validFrom: now,
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
          isActive: true,
          organizationId: targetOrgId,
          departmentId: targetDeptId,
          departmentName: targetDept?.name || "",
          sectionId: targetSectionId,
          sectionName: targetSection?.name,
          courseId: targetCourseId,
          courseName: targetCourse?.name,
          changeType: ChangeType.TRANSFER,
          changeReason: `Individual transfer from ${employee.organization.name}`,
          changedBy,
          changedAt: now,
        },
      });

      // Create change log
      await tx.changeLog.create({
        data: {
          entityType: "Employee",
          entityId: employee.id,
          changeType: ChangeType.TRANSFER,
          fieldName: "organizationId",
          oldValue: employee.organizationId,
          newValue: targetOrgId,
          changeDescription: `Transferred ${employee.name} from ${employee.organization.name}`,
          batchId,
          changedBy,
          changedAt: now,
        },
      });

      return { employeeName: employee.name };
    });

    return NextResponse.json({
      success: true,
      message: `${result.employeeName} transferred successfully`,
    });
  } catch (error) {
    console.error("Transfer employee error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to transfer employee";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
