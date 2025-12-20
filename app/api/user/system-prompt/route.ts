import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// デフォルトのシステムプロンプト
const DEFAULT_SYSTEM_PROMPT = `あなたは業務効率化を支援するAIアシスタントです。以下のルールに従ってください：

1. 回答は簡潔かつ具体的にすること
2. 専門用語を使う場合は必要に応じて説明を加えること
3. 箇条書きやリストを活用して読みやすい形式で回答すること
4. 不確実な情報については推測であることを明示すること
5. 日本語で回答すること`;

// システムプロンプトを取得
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { systemPrompt: true },
    });

    return NextResponse.json({
      systemPrompt: user?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      isDefault: !user?.systemPrompt,
    });
  } catch (error) {
    console.error("Failed to get system prompt:", error);
    return NextResponse.json(
      { error: "Failed to get system prompt" },
      { status: 500 },
    );
  }
}

// システムプロンプトを更新
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { systemPrompt } = await request.json();

    // 空文字列の場合はnullに設定（デフォルトに戻す）
    const promptValue = systemPrompt?.trim() || null;

    await prisma.user.update({
      where: { email: session.user.email },
      data: { systemPrompt: promptValue },
    });

    return NextResponse.json({
      success: true,
      systemPrompt: promptValue || DEFAULT_SYSTEM_PROMPT,
      isDefault: !promptValue,
    });
  } catch (error) {
    console.error("Failed to update system prompt:", error);
    return NextResponse.json(
      { error: "Failed to update system prompt" },
      { status: 500 },
    );
  }
}

// デフォルトプロンプトを取得
export async function POST() {
  return NextResponse.json({
    defaultPrompt: DEFAULT_SYSTEM_PROMPT,
  });
}
