
"use client";

import { useContext } from "react";
import { DataContext } from "@/context/data-context";
import { DietReportCheck } from "@/components/diet-report-card-check";

export default function SummaryReportCheckPage() {
  const { data } = useContext(DataContext);
  return <DietReportCheck data={data} />;
}
