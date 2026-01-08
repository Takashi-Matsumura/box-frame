"use client";

import { useState, useEffect, useCallback } from "react";
import { FaUsers, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import type { DataManagementTranslation } from "../translations";

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  nameKana: string | null;
  email: string | null;
  phone: string | null;
  position: string;
  isActive: boolean;
  department: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  course: { id: string; name: string } | null;
}

interface EmployeesTabProps {
  organizationId: string;
  language: "en" | "ja";
  t: DataManagementTranslation;
}

export function EmployeesTab({ organizationId, language, t }: EmployeesTabProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("true");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        organizationId,
        page: page.toString(),
        pageSize: pageSize.toString(),
        isActive: isActiveFilter,
      });

      if (search) {
        params.set("search", search);
      }

      const response = await fetch(`/api/admin/organization/employees?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, page, search, isActiveFilter]);

  useEffect(() => {
    if (organizationId) {
      fetchEmployees();
    }
  }, [organizationId, fetchEmployees]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FaUsers className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-semibold text-foreground">{t.employeesTitle}</h2>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>

        <select
          value={isActiveFilter}
          onChange={(e) => {
            setIsActiveFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t.all}</option>
          <option value="true">{t.active}</option>
          <option value="false">{t.inactive}</option>
        </select>
      </div>

      {/* Employee Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>{t.loading}</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FaUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t.noEmployees}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    {t.employeeId}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    {t.name}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    {t.department}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    {t.section}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    {t.course}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    {t.position}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    {t.email}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    {t.status}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-foreground">{emp.employeeId}</td>
                    <td className="px-4 py-3 text-foreground">
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        {emp.nameKana && (
                          <p className="text-xs text-muted-foreground">{emp.nameKana}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {emp.department?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {emp.section?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {emp.course?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-foreground">{emp.position}</td>
                    <td className="px-4 py-3 text-foreground">{emp.email || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          emp.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {emp.isActive ? t.active : t.inactive}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {language === "ja"
                ? `${total}件中 ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)}件を表示`
                : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm text-foreground">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
