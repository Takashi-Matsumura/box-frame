import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/organization
 *
 * 組織一覧を取得
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizations = await prisma.organization.findMany({
      include: {
        departments: {
          include: {
            sections: {
              include: {
                courses: true,
              },
            },
            _count: {
              select: { employees: true },
            },
          },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    return NextResponse.json({
      organizations,
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/organization
 *
 * 組織を作成
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 },
      );
    }

    const existing = await prisma.organization.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Organization already exists" },
        { status: 409 },
      );
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        description,
      },
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 },
    );
  }
}
