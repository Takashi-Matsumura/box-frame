import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { detectDuplicateEmployees } from "@/lib/services/organization-merge";

/**
 * GET /api/admin/organization/merge/duplicate-employees
 *
 * 氏名一致による重複社員を検出
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceOrgId = searchParams.get("sourceOrgId");
    const targetOrgId = searchParams.get("targetOrgId");

    if (!sourceOrgId || !targetOrgId) {
      return NextResponse.json(
        { error: "sourceOrgId and targetOrgId are required" },
        { status: 400 },
      );
    }

    const duplicates = await detectDuplicateEmployees(sourceOrgId, targetOrgId);

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error("Error detecting duplicate employees:", error);
    return NextResponse.json(
      { error: "Failed to detect duplicate employees" },
      { status: 500 },
    );
  }
}
