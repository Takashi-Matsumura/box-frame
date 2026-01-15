import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/organization/publish
 *
 * 組織の公開設定を取得
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        status: true,
        publishAt: true,
        publishedAt: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error fetching organization publish settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch publish settings" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/organization/publish
 *
 * 組織の公開設定を更新
 *
 * Body:
 * - organizationId: string (required)
 * - action: "publish" | "schedule" | "cancel" | "archive" (required)
 * - publishAt?: string (ISO date, required for "schedule")
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { organizationId, action, publishAt } = body;

    if (!organizationId || !action) {
      return NextResponse.json(
        { error: "Organization ID and action are required" },
        { status: 400 },
      );
    }

    if (!["publish", "schedule", "cancel", "archive"].includes(action)) {
      return NextResponse.json(
        {
          error:
            "Invalid action. Must be publish, schedule, cancel, or archive",
        },
        { status: 400 },
      );
    }

    // Get current organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    let updateData: {
      status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
      publishAt?: Date | null;
      publishedAt?: Date | null;
    };

    switch (action) {
      case "publish":
        // Immediately publish the organization
        // First, archive any currently published organization
        await prisma.organization.updateMany({
          where: {
            status: "PUBLISHED",
            id: { not: organizationId },
          },
          data: {
            status: "ARCHIVED",
          },
        });

        updateData = {
          status: "PUBLISHED",
          publishAt: null,
          publishedAt: new Date(),
        };
        break;

      case "schedule": {
        if (!publishAt) {
          return NextResponse.json(
            { error: "Publish date is required for scheduling" },
            { status: 400 },
          );
        }

        const scheduledDate = new Date(publishAt);
        if (scheduledDate <= new Date()) {
          return NextResponse.json(
            { error: "Publish date must be in the future" },
            { status: 400 },
          );
        }

        updateData = {
          status: "SCHEDULED",
          publishAt: scheduledDate,
          publishedAt: null,
        };
        break;
      }

      case "cancel":
        // Cancel scheduled publish, revert to draft
        updateData = {
          status: "DRAFT",
          publishAt: null,
          publishedAt: null,
        };
        break;

      case "archive":
        updateData = {
          status: "ARCHIVED",
          publishAt: null,
        };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
      select: {
        id: true,
        name: true,
        status: true,
        publishAt: true,
        publishedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      organization: updatedOrganization,
    });
  } catch (error) {
    console.error("Error updating organization publish settings:", error);
    return NextResponse.json(
      { error: "Failed to update publish settings" },
      { status: 500 },
    );
  }
}
