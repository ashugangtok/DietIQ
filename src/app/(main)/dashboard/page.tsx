
"use client";

import { useState, useContext } from "react";
import DashboardMockup from "@/components/dashboard-mockup";
import { DataContext } from "@/context/data-context";
import { type Filters } from "@/components/data-table";
import { useRouter } from 'next/navigation';


export default function DashboardPage() {
  const { data } = useContext(DataContext);
  const router = useRouter();

  const handleCardClick = (newFilters: Partial<Filters> = {}) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
        if (value) {
            params.set(key, value as string);
        }
    });
    router.push(`/data-table?${params.toString()}`);
  };

  return (
    <DashboardMockup data={data} />
  );
}
