import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { executeMerge } from "@/lib/services/organization-merge";

/**
 * POST /api/admin/organization/merge/execute
 *
 * マージを実行
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sourceOrgId, targetOrgId, departmentMappings, confirmationText } =
      body;

    if (!sourceOrgId || !targetOrgId || !departmentMappings) {
      return NextResponse.json(
        {
          error:
            "sourceOrgId, targetOrgId, and departmentMappings are required",
        },
        { status: 400 },
      );
    }

    // Verify confirmation text
    const validConfirmations = ["Merge", "マージ実行"];
    if (!validConfirmations.includes(confirmationText)) {
      return NextResponse.json(
        { error: "Invalid confirmation text" },
        { status: 400 },
      );
    }

    const result = await executeMerge(
      sourceOrgId,
      targetOrgId,
      departmentMappings,
      session.user.id || "system",
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error executing merge:", error);
    return NextResponse.json(
      { error: "Failed to execute merge" },
      { status: 500 },
    );
  }
}
