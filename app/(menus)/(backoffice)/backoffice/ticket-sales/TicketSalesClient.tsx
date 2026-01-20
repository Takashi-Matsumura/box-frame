"use client";

import { useSearchParams } from "next/navigation";
import ApiSettingsTab from "./components/ApiSettingsTab";
import CustomersTab from "./components/CustomersTab";
import ProductsTab from "./components/ProductsTab";
import SalesTab from "./components/SalesTab";

interface TicketSalesClientProps {
  language: "en" | "ja";
}

type TabId = "customers" | "products" | "sales" | "api";

export default function TicketSalesClient({
  language,
}: TicketSalesClientProps) {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "customers";

  return (
    <div className="pt-12">
      {activeTab === "customers" && <CustomersTab language={language} />}
      {activeTab === "products" && <ProductsTab language={language} />}
      {activeTab === "sales" && <SalesTab language={language} />}
      {activeTab === "api" && <ApiSettingsTab language={language} />}
    </div>
  );
}
