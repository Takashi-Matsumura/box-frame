import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/organization/manager
 *
 * 部署の責任者を更新
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, id, managerId } = body;

    if (!type || !id) {
      return NextResponse.json(
        { error: "Type and ID are required" },
        { status: 400 }
      );
    }

    if (!["department", "section", "course"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be department, section, or course" },
        { status: 400 }
      );
    }

    // Update the manager based on type
    let result;

    if (type === "department") {
      result = await prisma.department.update({
        where: { id },
        data: { managerId: managerId || null },
        include: {
          manager: {
            select: { id: true, name: true, position: true },
          },
        },
      });
    } else if (type === "section") {
      result = await prisma.section.update({
        where: { id },
        data: { managerId: managerId || null },
        include: {
          manager: {
            select: { id: true, name: true, position: true },
          },
        },
      });
    } else if (type === "course") {
      result = await prisma.course.update({
        where: { id },
        data: { managerId: managerId || null },
        include: {
          manager: {
            select: { id: true, name: true, position: true },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      type,
      id,
      manager: result?.manager || null,
    });
  } catch (error) {
    console.error("Error updating manager:", error);
    return NextResponse.json(
      { error: "Failed to update manager" },
      { status: 500 }
    );
  }
}
