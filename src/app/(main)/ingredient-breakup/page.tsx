
"use client";

import { useContext } from "react";
import { DataContext } from "@/context/data-context";
import { BreakupTable } from "@/components/breakup-table";
import { RecipeBreakupTable } from "@/components/recipe-breakup-table";

export default function IngredientBreakupPage() {
  const { data } = useContext(DataContext);
  return (
    <div className="space-y-6">
      <RecipeBreakupTable data={data} />
      <BreakupTable data={data} />
    </div>
  );
}
