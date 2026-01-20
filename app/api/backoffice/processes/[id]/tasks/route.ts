import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractTasksFromDiagramXml } from "@/lib/addon-modules/backoffice/utils/task-extractor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 業務フロー図から作業（タスク）を抽出
 * GET /api/backoffice/processes/[id]/tasks
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const process = await prisma.businessProcess.findUnique({
      where: { id },
      select: {
        id: true,
        diagramXml: true,
        status: true,
      },
    });

    if (!process) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!process.diagramXml) {
      return NextResponse.json({ tasks: [] });
    }

    const tasks = extractTasksFromDiagramXml(process.diagramXml);

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Failed to extract tasks from diagram:", error);
    return NextResponse.json(
      { error: "Failed to extract tasks" },
      { status: 500 }
    );
  }
}
