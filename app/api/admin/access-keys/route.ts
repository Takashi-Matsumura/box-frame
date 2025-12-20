import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Generate random Access key
function generateAccessKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = 4;
  const segmentLength = 8;

  const key = Array.from({ length: segments }, () =>
    Array.from(
      { length: segmentLength },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join(""),
  ).join("-");

  return key;
}

// Create new Access key
export async function POST(request: Request) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, expiresAt, targetUserId, menuPaths } = body;

    if (
      !name ||
      !expiresAt ||
      !targetUserId ||
      !menuPaths ||
      menuPaths.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 },
      );
    }

    const key = generateAccessKey();
    const expiryDate = new Date(expiresAt);

    const accessKey = await prisma.accessKey.create({
      data: {
        key,
        name,
        targetUserId,
        menuPaths: JSON.stringify(menuPaths), // Store as JSON string
        expiresAt: expiryDate,
        isActive: true,
        createdBy: session.user.id,
      },
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ accessKey });
  } catch (error) {
    console.error("Error creating Access key:", error);
    return NextResponse.json(
      { error: "Failed to create Access key" },
      { status: 500 },
    );
  }
}

// Update Access key (activate/deactivate)
export async function PATCH(request: Request) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const accessKey = await prisma.accessKey.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({ accessKey });
  } catch (error) {
    console.error("Error updating Access key:", error);
    return NextResponse.json(
      { error: "Failed to update Access key" },
      { status: 500 },
    );
  }
}

// Delete Access key
export async function DELETE(request: Request) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing Access key ID" },
        { status: 400 },
      );
    }

    await prisma.accessKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Access key:", error);
    return NextResponse.json(
      { error: "Failed to delete Access key" },
      { status: 500 },
    );
  }
}
