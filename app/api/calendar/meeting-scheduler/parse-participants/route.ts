import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/calendar/meeting-scheduler/parse-participants
 *
 * 自然言語テキストから参加者を抽出し、社員レコードとマッチングします。
 *
 * @example リクエスト
 * ```json
 * {
 *   "text": "田中さんと鈴木さんで会議をしたい"
 * }
 * ```
 *
 * @example レスポンス
 * ```json
 * {
 *   "participants": [
 *     { "name": "田中", "employeeId": "E001", "userId": "user123", "found": true },
 *     { "name": "鈴木", "employeeId": "E002", "userId": "user456", "found": true }
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
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text is required and must be a string" },
        { status: 400 },
      );
    }

    // AIを使用して自然言語から名前を抽出
    const extractResult = await AIService.extract({
      text,
      schema: [
        {
          name: "names",
          description:
            "会議・ミーティングの参加者として言及されている人物の名前のリスト。「さん」などの敬称は除く。",
          type: "array",
          required: true,
        },
      ],
      language: "ja",
    });

    const names = (extractResult.data.names as string[]) || [];

    if (names.length === 0) {
      return NextResponse.json({
        participants: [],
        message: "参加者名が見つかりませんでした",
      });
    }

    // 社員テーブルから名前でマッチング
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        OR: names.flatMap((name) => [
          { name: { contains: name } },
          { nameKana: { contains: name } },
        ]),
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        nameKana: true,
        email: true,
      },
    });

    // 各名前に対してマッチした社員を探す
    const participants = names.map((name) => {
      const matchedEmployee = employees.find(
        (emp) => emp.name.includes(name) || emp.nameKana?.includes(name),
      );

      if (matchedEmployee) {
        return {
          name,
          employeeName: matchedEmployee.name,
          employeeId: matchedEmployee.employeeId,
          email: matchedEmployee.email,
          found: true,
        };
      }

      return {
        name,
        employeeName: null,
        employeeId: null,
        email: null,
        found: false,
      };
    });

    // マッチした社員のemailからユーザーIDを取得
    const foundEmails = participants
      .filter((p) => p.found && p.email)
      .map((p) => p.email as string);

    const users = await prisma.user.findMany({
      where: {
        email: { in: foundEmails },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const emailToUserId = new Map(users.map((u) => [u.email, u.id]));

    // userIdを追加
    const participantsWithUserId = participants.map((p) => ({
      ...p,
      userId: p.email ? emailToUserId.get(p.email) || null : null,
    }));

    return NextResponse.json({
      participants: participantsWithUserId,
    });
  } catch (error) {
    console.error("Error parsing participants:", error);
    const message =
      error instanceof Error ? error.message : "Failed to parse participants";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
