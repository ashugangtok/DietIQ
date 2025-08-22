
"use client";

import { useContext } from "react";
import { DataContext } from "@/context/data-context";
import { DietReport } from "@/components/diet-report-card";

export default function SummaryReportPage() {
  const { data } = useContext(DataContext);
  return <DietReport data={data} />;
}
