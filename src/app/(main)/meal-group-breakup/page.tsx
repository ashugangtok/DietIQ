
"use client";

import { useContext } from "react";
import { DataContext } from "@/context/data-context";
import { MealGroupBreakupTable } from "@/components/meal-group-breakup-table";
import { MealGroupBreakupWithIngredientsTable } from "@/components/meal-group-breakup-with-ingredients-table";

export default function MealGroupBreakupPage() {
  const { data } = useContext(DataContext);
  return (
    <div className="space-y-6">
      <MealGroupBreakupTable data={data} />
      <MealGroupBreakupWithIngredientsTable data={data} />
    </div>
  );
}
