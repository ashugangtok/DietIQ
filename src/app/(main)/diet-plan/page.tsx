
"use client";

import { useContext } from "react";
import { DataContext } from "@/context/data-context";
import { TableReport } from "@/components/table-report";

export default function DietPlanPage() {
  const { data } = useContext(DataContext);
  return <TableReport data={data} />;
}
