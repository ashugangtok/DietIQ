
"use client";

import { useContext } from "react";
import { DataContext } from "@/context/data-context";
import { OverallReportCheck } from "@/components/overall-report-card-check";

export default function OverallReportCheckPage() {
  const { data } = useContext(DataContext);
  return <OverallReportCheck data={data} />;
}
