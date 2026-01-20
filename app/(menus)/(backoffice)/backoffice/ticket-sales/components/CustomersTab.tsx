"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { ticketSalesTranslations } from "../translations";

interface Customer {
  id: string;
  name: string;
  customerId: string;
  nfcId: string | null;
  email: string | null;
  company: string;
  paymentDay: number;
  hasApproval: boolean;
  isActive: boolean;
  employeeId: string | null;
  employee?: {
    id: string;
    name: string;
    employeeId: string;
    department?: { name: string };
  } | null;
}

interface CustomersTabProps {
  language: "en" | "ja";
}

export default function CustomersTab({ language }: CustomersTabProps) {
  const t = ticketSalesTranslations[language];
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (!showInactive) params.set("isActive", "true");

      const response = await fetch(`/api/ticket-sales/customers?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCustomers(data);
      setError(null);
    } catch (err) {
      setError(t.fetchError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, showInactive, t.fetchError]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDelete = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;

    try {
      const response = await fetch(`/api/ticket-sales/customers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      fetchCustomers();
    } catch (err) {
      alert(t.deleteError);
      console.error(err);
    }
  };

  const handleSave = async (customer: Partial<Customer>) => {
    try {
      const url = editingCustomer
        ? `/api/ticket-sales/customers/${editingCustomer.id}`
        : "/api/ticket-sales/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      setIsFormOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.saveError);
    }
  };

  return (
    <div className="space-y-4">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            {t.showInactive}
          </label>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingCustomer(null);
            setIsFormOpen(true);
          }}
        >
          {t.addCustomer}
        </Button>
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
                  {t.customerName}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.customerId}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.nfcId}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.company}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase max-w-[150px]">
                  {t.department}
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
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {t.loading}
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {t.noData}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={`hover:bg-gray-50 ${!customer.isActive ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">{customer.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {customer.customerId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {customer.nfcId || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {customer.company}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px]">
                      {customer.employee?.department?.name ? (
                        <span
                          className="block truncate"
                          title={customer.employee.department.name}
                        >
                          {customer.employee.department.name}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCustomer(customer);
                            setIsFormOpen(true);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {t.editCustomer}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(customer.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          {t.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* フォームモーダル */}
      {isFormOpen && (
        <CustomerFormModal
          language={language}
          customer={editingCustomer}
          onSave={handleSave}
          onClose={() => {
            setIsFormOpen(false);
            setEditingCustomer(null);
          }}
        />
      )}
    </div>
  );
}

// 顧客フォームモーダル
function CustomerFormModal({
  language,
  customer,
  onSave,
  onClose,
}: {
  language: "en" | "ja";
  customer: Customer | null;
  onSave: (data: Partial<Customer>) => void;
  onClose: () => void;
}) {
  const t = ticketSalesTranslations[language];
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    customerId: customer?.customerId || "",
    nfcId: customer?.nfcId || "",
    email: customer?.email || "",
    company: customer?.company || "",
    paymentDay: customer?.paymentDay || 25,
    hasApproval: customer?.hasApproval || false,
    isActive: customer?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            {customer ? t.editCustomer : t.addCustomer}
          </h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.customerName} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.customerId} *
              </label>
              <input
                type="text"
                required
                value={formData.customerId}
                onChange={(e) =>
                  setFormData({ ...formData, customerId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.nfcId}
              </label>
              <input
                type="text"
                value={formData.nfcId}
                onChange={(e) =>
                  setFormData({ ...formData, nfcId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.email}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.company} *
              </label>
              <input
                type="text"
                required
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.paymentDay}
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={formData.paymentDay}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentDay: parseInt(e.target.value, 10) || 25,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hasApproval}
                  onChange={(e) =>
                    setFormData({ ...formData, hasApproval: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{t.hasApproval}</span>
              </label>
              {customer && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{t.active}</span>
                </label>
              )}
            </div>
          </div>
          <div className="px-6 py-4 border-t flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit">
              {t.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
