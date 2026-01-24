import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMergeCandidates } from "@/lib/services/organization-merge";

/**
 * GET /api/admin/organization/merge/candidates
 *
 * マージ可能な組織一覧を取得
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetOrgId = searchParams.get("targetOrgId");

    if (!targetOrgId) {
      return NextResponse.json(
        { error: "targetOrgId is required" },
        { status: 400 },
      );
    }

    const candidates = await getMergeCandidates(targetOrgId);

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Error fetching merge candidates:", error);
    return NextResponse.json(
      { error: "Failed to fetch merge candidates" },
      { status: 500 },
    );
  }
}
