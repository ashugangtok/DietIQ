
"use client";

import { useContext } from "react";
import { DataContext } from "@/context/data-context";
import { SummaryTable } from "@/components/summary-table";

export default function SummaryPage() {
  const { data } = useContext(DataContext);
  return <SummaryTable data={data} />;
}
