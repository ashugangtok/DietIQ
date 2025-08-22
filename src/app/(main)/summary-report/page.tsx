
"use client";

import { useContext } from "react";
import { DataContext } from "@/context/data-context";
import { PivotTableReport } from "@/components/pivot-table-report";

export default function SummaryReportPage() {
  const { data } = useContext(DataContext);
  return <PivotTableReport data={data} />;
}
