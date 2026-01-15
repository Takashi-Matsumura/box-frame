import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization/employees/[id]
 *
 * 社員詳細を取得
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            manager: {
              select: { id: true, name: true, position: true },
            },
          },
        },
        section: {
          select: {
            id: true,
            name: true,
            code: true,
            manager: {
              select: { id: true, name: true, position: true },
            },
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            manager: {
              select: { id: true, name: true, position: true },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        nameKana: employee.nameKana,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        positionCode: employee.positionCode,
        qualificationGrade: employee.qualificationGrade,
        qualificationGradeCode: employee.qualificationGradeCode,
        employmentType: employee.employmentType,
        employmentTypeCode: employee.employmentTypeCode,
        organization: employee.organization,
        department: employee.department,
        section: employee.section,
        course: employee.course,
        joinDate: employee.joinDate,
        birthDate: employee.birthDate,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 },
    );
  }
}
