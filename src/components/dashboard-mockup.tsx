
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { PawPrint, MapPin, Leaf, Wheat } from "lucide-react";
import { type SheetDataRow } from "@/types";

const BG = {
  animals:
    "https://images.unsplash.com/photo-1606229365485-93a3b8ea9b22?auto=format&fit=crop&w=1600&q=60",
  sites:
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=60",
  ingredients:
    "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=1600&q=60",
  feeds:
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=60",
};

const isWeightUnit = (uom: string) => {
    if (!uom) return false;
    const lowerUom = uom.toLowerCase();
    return lowerUom === 'gram' || lowerUom === 'kg' || lowerUom === 'kilogram';
}

function processData(rawData: SheetDataRow[]) {
    if (!rawData || rawData.length === 0) {
        return {
            kpis: { totalAnimals: 0, totalSites: 0, uniqueIngredients: 0, feedTypes: 0 },
            filters: { sites: ["All Sites"], feedTypes: ["All Types"] },
            topIngredientsByWeight: [],
            topAnimalPopulations: [],
        };
    }

    const uniqueAnimalIds = new Set(rawData.map(row => row.animal_id));
    const uniqueSites = new Set(rawData.map(row => row.site_name));
    const uniqueIngredients = new Set(rawData.map(row => row.ingredient_name));
    const uniqueFeedTypes = new Set(rawData.map(row => row['Feed type name']));

    const ingredients = new Map<string, number>();
    rawData.forEach(row => {
        if (isWeightUnit(row.base_uom_name)) {
            const ingredientName = row.ingredient_name;
            const currentWeight = ingredients.get(ingredientName) || 0;
            ingredients.set(ingredientName, currentWeight + row.ingredient_qty_gram);
        }
    });

    const topIngredientsByWeight = Array.from(ingredients.entries())
        .map(([name, totalGrams]) => ({
            name,
            value: parseFloat((totalGrams / 1000).toFixed(2)),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const animalsByCommonName = new Map<string, Set<string>>();
    rawData.forEach(row => {
        if (!animalsByCommonName.has(row.common_name)) {
            animalsByCommonName.set(row.common_name, new Set());
        }
        animalsByCommonName.get(row.common_name)!.add(row.animal_id);
    });

    const topAnimalPopulations = Array.from(animalsByCommonName.entries())
        .map(([name, ids]) => ({ name, value: ids.size }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    return {
        kpis: {
            totalAnimals: uniqueAnimalIds.size,
            totalSites: uniqueSites.size,
            uniqueIngredients: uniqueIngredients.size,
            feedTypes: uniqueFeedTypes.size,
        },
        filters: {
            sites: ["All Sites", ...Array.from(uniqueSites).sort()],
            feedTypes: ["All Types", ...Array.from(uniqueFeedTypes).sort()],
        },
        topIngredientsByWeight,
        topAnimalPopulations,
    };
}


const nf = new Intl.NumberFormat("en-IN");

function StatCard({ title, value, subtitle, icon: Icon, bg }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative h-44 rounded-2xl overflow-hidden shadow-lg ring-1 ring-white/10"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/40 to-black/30" />
      <Card className="bg-transparent text-white h-full border-0">
        <CardContent className="h-full p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm/relaxed font-medium opacity-90">{title}</span>
            <Icon className="h-5 w-5 opacity-80" />
          </div>
          <div>
            <div className="text-4xl font-bold tracking-tight">{nf.format(value)}</div>
            <div className="text-xs opacity-80 mt-1">{subtitle}</div>
          </div>
        </CardContent>
      </Card>
      {/* subtle glow */}
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
    </motion.div>
  );
}

function Panel({ title, subtitle, children }: any) {
  return (
    <Card className="bg-[#0c1222] text-white border-white/10 shadow-xl rounded-2xl">
      <CardHeader className="pb-0">
        <CardTitle className="text-lg">{title}</CardTitle>
        {subtitle && <CardDescription className="text-sm text-white/70 -mt-2">{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white/95 text-slate-900 px-3 py-2 text-xs shadow-md">
      <div className="font-semibold">{label}</div>
      <div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded" style={{ background: p.fill }} />
            {p.value}
            {unit ? ` ${unit}` : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardMockup({ data: rawData }: { data: SheetDataRow[] }) {
  const [site, setSite] = useState("All Sites");
  const [feedType, setFeedType] = useState("All Types");

  const data = useMemo(() => processData(rawData), [rawData]);

  const filteredData = useMemo(() => {
    let filtered = rawData;
    if (site !== "All Sites") {
        filtered = filtered.filter(row => row.site_name === site);
    }
    if (feedType !== "All Types") {
        filtered = filtered.filter(row => row['Feed type name'] === feedType);
    }
    return processData(filtered);
  }, [rawData, site, feedType]);

  if (!data) {
    return (
      <div className="min-h-[80vh] grid place-items-center bg-gradient-to-b from-[#0a0f1f] to-[#0d1530]">
        <div className="text-white/80 text-sm">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0a0f1f] via-[#0b1328] to-[#0d1530] p-6 rounded-lg">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard
            key="total-animals"
            title="Total Animals"
            value={filteredData.kpis.totalAnimals}
            subtitle="Unique animals recorded"
            icon={PawPrint}
            bg={BG.animals}
          />
          <StatCard
            key="total-sites"
            title="Total Sites"
            value={filteredData.kpis.totalSites}
            subtitle="Locations providing data"
            icon={MapPin}
            bg={BG.sites}
          />
          <StatCard
            key="unique-ingredients"
            title="Unique Ingredients"
            value={filteredData.kpis.uniqueIngredients}
            subtitle="Different ingredients used"
            icon={Leaf}
            bg={BG.ingredients}
          />
          <StatCard
            key="feed-types"
            title="Feed Types"
            value={filteredData.kpis.feedTypes}
            subtitle="Distinct feed categories"
            icon={Wheat}
            bg={BG.feeds}
          />
        </div>

        <Panel title="Dashboard Filters" subtitle="Slice insights by site and feed type.">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="w-64">
              <label className="text-xs text-white/70">Filter by Site</label>
              <Select value={site} onValueChange={setSite}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f172a] text-white border-white/10">
                  {data.filters.sites.map((s: string, index: number) => (
                    <SelectItem key={`${s}-${index}`} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-64">
              <label className="text-xs text-white/70">Filter by Feed Type</label>
              <Select value={feedType} onValueChange={setFeedType}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select a feed type" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f172a] text-white border-white/10">
                  {data.filters.feedTypes.map((t: string, index: number) => (
                    <SelectItem key={`${t}-${index}`} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => {
                setSite("All Sites");
                setFeedType("All Types");
              }}
              className="bg-white/10 hover:bg-white/20 text-white"
            >
              Clear Filters
            </Button>
          </div>
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Panel
            title="Top 5 Ingredients by Weight"
            subtitle="Total weight (kg) of the most used ingredients."
          >
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData.topIngredientsByWeight} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#ffffff20" />
                  <XAxis type="number" stroke="#c7d2fe" tick={{ fill: "#c7d2fe", fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" stroke="#c7d2fe" tick={{ fill: "#c7d2fe", fontSize: 12 }} width={120} />
                  <Tooltip content={<ChartTooltip unit="kg" />} />
                  <Bar dataKey="value" radius={[6, 6, 6, 6]} fill="url(#grad1)" barSize={20} />
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Top 5 Animal Populations"
            subtitle="Count of unique animals by their common name."
          >
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData.topAnimalPopulations} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#ffffff20" />
                  <XAxis type="number" allowDecimals={false} stroke="#c7d2fe" tick={{ fill: "#c7d2fe", fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" stroke="#c7d2fe" tick={{ fill: "#c7d2fe", fontSize: 12 }} width={160} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 6, 6]} fill="url(#grad2)" barSize={20} />
                  <defs>
                    <linearGradient id="grad2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
