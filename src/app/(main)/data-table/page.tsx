
"use client";

import { useState, useContext, Suspense } from "react";
import { DataContext } from "@/context/data-context";
import { DataTable, type Filters } from "@/components/data-table";
import { useSearchParams } from "next/navigation";

function DataTableContent() {
  const { data } = useContext(DataContext);
  const searchParams = useSearchParams();

  const initialFilters: Filters = {
    site_name: searchParams.get('site_name') || "",
    common_name: searchParams.get('common_name') || "",
    'Feed type name': searchParams.get('Feed type name') || "",
  };

  const [filters, setFilters] = useState<Filters>(initialFilters);

  return (
    <DataTable data={data} initialFilters={filters} onFiltersChange={setFilters} />
  );
}

export default function DataTablePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DataTableContent />
        </Suspense>
    )
}
