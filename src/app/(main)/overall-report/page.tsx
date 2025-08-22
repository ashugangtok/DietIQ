
"use client";

import { useContext } from "react";
import { DataContext } from "@/context/data-context";
import { OverallReport } from "@/components/overall-report-card";

export default function OverallReportPage() {
  const { data } = useContext(DataContext);
  return <OverallReport data={data} />;
}
