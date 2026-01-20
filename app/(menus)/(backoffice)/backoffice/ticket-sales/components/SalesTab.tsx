"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { ticketSalesTranslations } from "../translations";

interface Sale {
  id: string;
  soldAt: string;
  customerId: string | null;
  customerName: string;
  productId: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentMethod: "CASH" | "PAYROLL";
  adminNfcId: string;
  adminName: string;
  notes: string | null;
  customer?: {
    id: string;
    name: string;
    customerId: string;
    company: string;
  } | null;
  product: {
    id: string;
    code: string;
    name: string;
    nameJa: string;
  };
}

interface SalesTabProps {
  language: "en" | "ja";
}

export default function SalesTab({ language }: SalesTabProps) {
  const t = ticketSalesTranslations[language];
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // デフォルトで今月の1日から今日まで
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [fromDate, setFromDate] = useState(
    firstDayOfMonth.toISOString().split("T")[0],
  );
  const [toDate, setToDate] = useState(today.toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (paymentMethod) params.set("paymentMethod", paymentMethod);

      const response = await fetch(`/api/ticket-sales/sales?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setSales(data.sales);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(t.fetchError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, paymentMethod, t.fetchError]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDeleteSale)) return;

    try {
      const response = await fetch(`/api/ticket-sales/sales/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      fetchSales();
    } catch (err) {
      alert(t.deleteError);
      console.error(err);
    }
  };

  const handleExportCsv = () => {
    if (!fromDate || !toDate) {
      alert(
        language === "ja"
          ? "期間を指定してください"
          : "Please specify date range",
      );
      return;
    }
    window.open(
      `/api/ticket-sales/csv?from=${fromDate}&to=${toDate}`,
      "_blank",
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(language === "ja" ? "ja-JP" : "en-US").format(
      price,
    );
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(language === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 集計
  const totalAmount = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const cashAmount = sales
    .filter((s) => s.paymentMethod === "CASH")
    .reduce((sum, sale) => sum + sale.totalPrice, 0);
  const payrollAmount = sales
    .filter((s) => s.paymentMethod === "PAYROLL")
    .reduce((sum, sale) => sum + sale.totalPrice, 0);

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">{t.from}</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">{t.to}</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t.allPaymentMethods}</option>
          <option value="CASH">{t.paymentCash}</option>
          <option value="PAYROLL">{t.paymentPayroll}</option>
        </select>
        <Button variant="secondary" onClick={handleExportCsv}>
          {t.exportCsv}
        </Button>
      </div>

      {/* 集計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">
            {language === "ja" ? "件数" : "Count"}
          </p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">
            {language === "ja" ? "合計金額" : "Total"}
          </p>
          <p className="text-2xl font-bold">
            {formatPrice(totalAmount)}
            {t.yen}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">{t.paymentCash}</p>
          <p className="text-2xl font-bold">
            {formatPrice(cashAmount)}
            {t.yen}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">{t.paymentPayroll}</p>
          <p className="text-2xl font-bold">
            {formatPrice(payrollAmount)}
            {t.yen}
          </p>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.soldAt}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.customerNameLabel}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.productNameLabel}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t.quantity}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t.totalPrice}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.paymentMethod}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.admin}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {t.loading}
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {t.noData}
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDateTime(sale.soldAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{sale.customerName}</div>
                      {sale.customer && (
                        <div className="text-xs text-gray-500">
                          {sale.customer.company}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {language === "ja"
                          ? sale.product.nameJa
                          : sale.product.name}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {sale.productCode}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{sale.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatPrice(sale.totalPrice)}
                      {t.yen}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          sale.paymentMethod === "CASH"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {sale.paymentMethod === "CASH"
                          ? t.paymentCash
                          : t.paymentPayroll}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {sale.adminName}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(sale.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        {t.deleteSale}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
