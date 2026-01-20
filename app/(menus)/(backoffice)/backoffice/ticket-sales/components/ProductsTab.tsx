"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { ticketSalesTranslations } from "../translations";

interface Product {
  id: string;
  code: string;
  name: string;
  nameJa: string;
  description: string | null;
  unitPrice: number;
  isActive: boolean;
  sortOrder: number;
}

interface ProductsTabProps {
  language: "en" | "ja";
}

export default function ProductsTab({ language }: ProductsTabProps) {
  const t = ticketSalesTranslations[language];
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (!showInactive) params.set("isActive", "true");

      const response = await fetch(`/api/ticket-sales/products?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(t.fetchError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [showInactive, t.fetchError]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;

    try {
      const response = await fetch(`/api/ticket-sales/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      fetchProducts();
    } catch (err) {
      alert(t.deleteError);
      console.error(err);
    }
  };

  const handleSave = async (product: Partial<Product>) => {
    try {
      const url = editingProduct
        ? `/api/ticket-sales/products/${editingProduct.id}`
        : "/api/ticket-sales/products";
      const method = editingProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      setIsFormOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.saveError);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(language === "ja" ? "ja-JP" : "en-US").format(
      price,
    );
  };

  return (
    <div className="space-y-4">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
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
            setEditingProduct(null);
            setIsFormOpen(true);
          }}
        >
          {t.addProduct}
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
                  {t.productCode}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.productName}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.productNameJa}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t.unitPrice}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  {t.sortOrder}
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
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {t.noData}
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-50 ${!product.isActive ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-sm">
                      {product.code}
                    </td>
                    <td className="px-4 py-3">{product.name}</td>
                    <td className="px-4 py-3">{product.nameJa}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatPrice(product.unitPrice)}
                      {t.yen}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {product.sortOrder}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(product);
                            setIsFormOpen(true);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {t.editProduct}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id)}
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
        <ProductFormModal
          language={language}
          product={editingProduct}
          onSave={handleSave}
          onClose={() => {
            setIsFormOpen(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

// 商品フォームモーダル
function ProductFormModal({
  language,
  product,
  onSave,
  onClose,
}: {
  language: "en" | "ja";
  product: Product | null;
  onSave: (data: Partial<Product>) => void;
  onClose: () => void;
}) {
  const t = ticketSalesTranslations[language];
  const [formData, setFormData] = useState({
    code: product?.code || "",
    name: product?.name || "",
    nameJa: product?.nameJa || "",
    description: product?.description || "",
    unitPrice: product?.unitPrice || 0,
    sortOrder: product?.sortOrder || 0,
    isActive: product?.isActive ?? true,
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
            {product ? t.editProduct : t.addProduct}
          </h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.productCode} *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.productName} *
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
                {t.productNameJa} *
              </label>
              <input
                type="text"
                required
                value={formData.nameJa}
                onChange={(e) =>
                  setFormData({ ...formData, nameJa: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.unitPrice} *
              </label>
              <input
                type="number"
                required
                min={0}
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unitPrice: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.sortOrder}
              </label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {product && (
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
