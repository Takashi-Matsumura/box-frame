import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateMergePreview } from "@/lib/services/organization-merge";

/**
 * POST /api/admin/organization/merge/preview
 *
 * マージプレビューを生成
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sourceOrgId, targetOrgId, departmentMappings } = body;

    if (!sourceOrgId || !targetOrgId || !departmentMappings) {
      return NextResponse.json(
        {
          error:
            "sourceOrgId, targetOrgId, and departmentMappings are required",
        },
        { status: 400 },
      );
    }

    const preview = await generateMergePreview(
      sourceOrgId,
      targetOrgId,
      departmentMappings,
    );

    return NextResponse.json({ preview });
  } catch (error) {
    console.error("Error generating merge preview:", error);
    return NextResponse.json(
      { error: "Failed to generate merge preview" },
      { status: 500 },
    );
  }
}
