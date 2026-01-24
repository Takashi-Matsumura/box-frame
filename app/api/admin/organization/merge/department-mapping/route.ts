import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDepartmentMappingData } from "@/lib/services/organization-merge";

/**
 * GET /api/admin/organization/merge/department-mapping
 *
 * 部門マッピング候補を取得
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

    const mappingData = await getDepartmentMappingData(
      sourceOrgId,
      targetOrgId,
    );

    return NextResponse.json(mappingData);
  } catch (error) {
    console.error("Error fetching department mapping:", error);
    return NextResponse.json(
      { error: "Failed to fetch department mapping" },
      { status: 500 },
    );
  }
}
