import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AIService } from "@/lib/core-modules/ai";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * AIで作業手順書を生成
 * POST /api/backoffice/processes/[id]/procedures/generate
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // 必須フィールド検証
    if (!body.taskName) {
      return NextResponse.json(
        { error: "taskName is required" },
        { status: 400 }
      );
    }

    // プロセスを取得（コンテキスト用）
    const process = await prisma.businessProcess.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        jobDescriptionMd: true,
        flowDescription: true,
      },
    });

    if (!process) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // AIが利用可能か確認
    const isAIAvailable = await AIService.isAvailable();
    if (!isAIAvailable) {
      return NextResponse.json(
        { error: "AI is not available. Please configure AI settings." },
        { status: 503 }
      );
    }

    // コンテキスト情報を構築
    const contextParts: string[] = [];

    if (process.jobDescriptionMd) {
      contextParts.push(`## 業務分掌\n${process.jobDescriptionMd}`);
    } else if (process.flowDescription) {
      contextParts.push(`## 業務フロー説明\n${process.flowDescription}`);
    }

    if (process.description) {
      contextParts.push(`## 業務概要\n${process.description}`);
    }

    const context = contextParts.join("\n\n");

    // タスクタイプの日本語表記
    const taskTypeJa = body.taskType === "system" ? "システム処理" : "人手作業";

    // プロンプト生成
    const systemPrompt = `あなたは業務マニュアル作成のエキスパートです。
以下の業務フローの1つの「作業」について、作業手順書を作成してください。

## 対象作業
- 作業名: ${body.taskName}
- アクター: ${body.actorName || "未指定"}
- 作業タイプ: ${taskTypeJa}

## 業務全体のコンテキスト
${context || "（コンテキスト情報なし）"}

## 出力形式（マークダウン）

以下の構造でマークダウン形式の作業手順書を出力してください。
セクションは必要に応じて省略可能です。

# ${body.taskName}

## 概要
[1-2文で説明]

## 目的
[なぜ必要か]

## アクター
[実行者]

## 事前条件
- [条件1]

## メインフロー
1. [ステップ1]
2. [ステップ2]

## 代替フロー
- [代替パターン]

## 例外フロー
- [エラー時の対応]

## 事後条件
- [完了時の状態]

## 備考
- [補足情報]`;

    const result = await AIService.generate({
      input: `「${body.taskName}」の作業手順書を作成してください。`,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    return NextResponse.json({
      procedureMd: result.output,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error("Failed to generate procedure:", error);
    return NextResponse.json(
      { error: "Failed to generate procedure" },
      { status: 500 }
    );
  }
}
