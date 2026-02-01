import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/organization-data?organizationId=xxx
 * 指定した組織のデータを全削除（社員・部門・部・課）
 * 組織レコード自体はDRAFT状態で残す
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizationId = request.nextUrl.searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // トランザクションで全削除
    const result = await prisma.$transaction(async (tx) => {
      // 先にカスタム評価者・評価除外を削除（Employee依存）
      const deletedCustomEvaluators = await tx.customEvaluator.deleteMany({
        where: {
          employee: { organizationId: organization.id },
        },
      });

      const deletedExclusions = await tx.evaluationExclusion.deleteMany({
        where: {
          employee: { organizationId: organization.id },
        },
      });

      // 社員を削除（Cascade: managedDepartments等のmanagerId参照はnull化される）
      const deletedEmployees = await tx.employee.deleteMany({
        where: { organizationId: organization.id },
      });

      // 課 → 部 → 本部の順に削除
      const deletedCourses = await tx.course.deleteMany({
        where: { section: { department: { organizationId: organization.id } } },
      });

      const deletedSections = await tx.section.deleteMany({
        where: { department: { organizationId: organization.id } },
      });

      const deletedDepartments = await tx.department.deleteMany({
        where: { organizationId: organization.id },
      });

      // 組織をDRAFTに戻す
      await tx.organization.update({
        where: { id: organization.id },
        data: { status: "DRAFT", publishedAt: null, publishAt: null },
      });

      return {
        organizationName: organization.name,
        employees: deletedEmployees.count,
        departments: deletedDepartments.count,
        sections: deletedSections.count,
        courses: deletedCourses.count,
        customEvaluators: deletedCustomEvaluators.count,
        exclusions: deletedExclusions.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: `「${result.organizationName}」の組織データを削除しました（社員: ${result.employees}名, 本部: ${result.departments}, 部: ${result.sections}, 課: ${result.courses}）`,
      data: result,
    });
  } catch (error) {
    console.error("Error deleting organization data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete organization data",
      },
      { status: 500 },
    );
  }
}
