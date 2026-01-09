"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import PeriodsSection from "./components/PeriodsSection";
import WeightsSection from "./components/WeightsSection";
import Criteria1Section from "./components/Criteria1Section";
import ProcessCategoriesSection from "./components/ProcessCategoriesSection";
import GrowthCategoriesSection from "./components/GrowthCategoriesSection";

interface EvaluationMasterClientProps {
  language: "en" | "ja";
}

export default function EvaluationMasterClient({
  language,
}: EvaluationMasterClientProps) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "periods";
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  return (
    <div className="max-w-7xl mx-auto mt-4 h-[calc(100vh-160px)] overflow-hidden">
      <Card className="h-full flex flex-col">
        <CardContent className="p-6 flex-1 flex flex-col overflow-hidden">
          {tab === "periods" && (
            <PeriodsSection
              language={language}
              onPeriodSelect={setSelectedPeriodId}
            />
          )}

          {tab === "weights" && (
            <WeightsSection
              language={language}
              selectedPeriodId={selectedPeriodId}
            />
          )}

          {tab === "organizationGoals" && (
            <Criteria1Section
              language={language}
              selectedPeriodId={selectedPeriodId}
            />
          )}

          {tab === "processCategories" && (
            <ProcessCategoriesSection language={language} />
          )}

          {tab === "growthCategories" && (
            <GrowthCategoriesSection language={language} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
