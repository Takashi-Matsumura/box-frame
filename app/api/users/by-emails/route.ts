import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/users/by-emails
 *
 * メールアドレスのリストからユーザーを検索します。
 *
 * @example リクエスト
 * ```json
 * {
 *   "emails": ["user1@example.com", "user2@example.com"]
 * }
 * ```
 *
 * @example レスポンス
 * ```json
 * {
 *   "users": [
 *     { "id": "user123", "email": "user1@example.com", "name": "User 1" },
 *     { "id": "user456", "email": "user2@example.com", "name": "User 2" }
 *   ]
 * }
 * ```
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { emails } = body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "emails must be a non-empty array" },
        { status: 400 },
      );
    }

    const users = await prisma.user.findMany({
      where: {
        email: { in: emails },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users by emails:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
