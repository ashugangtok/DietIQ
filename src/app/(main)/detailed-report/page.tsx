
"use client";

import { useContext } from "react";
import { DataContext } from "@/context/data-context";
import { DetailedReport } from "@/components/detailed-report";

export default function DetailedReportPage() {
  const { speciesSiteData } = useContext(DataContext);
  return <DetailedReport data={speciesSiteData} />;
}
