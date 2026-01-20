/**
 * チケット販売CSV出力API
 * GET: 期間指定で販売データをCSV出力
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 日付をYYYY-MM-DD形式にフォーマット
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * 日時をYYYY-MM-DD HH:mm形式にフォーマット（日本時間）
 */
function formatDateTime(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  const hours = String(jst.getUTCHours()).padStart(2, "0");
  const minutes = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * CSVエスケープ
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/ticket-sales/csv
 * 期間指定で販売データをCSV出力
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // 必須パラメータチェック
    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to parameters are required" },
        { status: 400 },
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // 販売データを取得
    const sales = await prisma.ticketSale.findMany({
      where: {
        soldAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        customer: {
          select: {
            customerId: true,
            name: true,
            company: true,
            paymentDay: true,
          },
        },
        product: {
          select: { code: true, nameJa: true },
        },
      },
      orderBy: { soldAt: "asc" },
    });

    // CSVヘッダー（日本語）
    const headers = [
      "販売日時",
      "顧客ID",
      "顧客名",
      "所属",
      "商品コード",
      "商品名",
      "数量",
      "単価",
      "合計金額",
      "支払方法",
      "給与締め日",
      "販売担当者",
      "備考",
    ];

    // CSVデータ行
    const rows = sales.map((sale) => [
      escapeCSV(formatDateTime(sale.soldAt)),
      escapeCSV(sale.customer?.customerId || ""),
      escapeCSV(sale.customerName),
      escapeCSV(sale.customer?.company || ""),
      escapeCSV(sale.productCode),
      escapeCSV(sale.product.nameJa),
      escapeCSV(sale.quantity),
      escapeCSV(sale.unitPrice),
      escapeCSV(sale.totalPrice),
      escapeCSV(sale.paymentMethod === "CASH" ? "現金" : "給与天引き"),
      escapeCSV(sale.customer?.paymentDay || ""),
      escapeCSV(sale.adminName),
      escapeCSV(sale.notes),
    ]);

    // CSVを生成
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // BOM付きUTF-8
    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    // ファイル名を生成
    const fileName = `ticket_sales_${formatDate(fromDate)}_${formatDate(toDate)}.csv`;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error generating CSV:", error);
    return NextResponse.json(
      { error: "Failed to generate CSV" },
      { status: 500 },
    );
  }
}
