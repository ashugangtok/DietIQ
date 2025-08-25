
"use client";

import { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { type SheetDataRow } from '@/types';
import { type DietPlanExtractOutput } from '@/ai/flows/extract-diet-plan-flow';


export interface PackingItem {
    id: string;
    status: 'Pending' | 'Packed' | 'Dispatched';
}

interface DataContextType {
    data: SheetDataRow[];
    setData: Dispatch<SetStateAction<SheetDataRow[]>>;
    packingList: PackingItem[];
    setPackingList: Dispatch<SetStateAction<PackingItem[]>>;
    extractedData: DietPlanExtractOutput | null;
    setExtractedData: Dispatch<SetStateAction<DietPlanExtractOutput | null>>;
}

export const DataContext = createContext<DataContextType>({
    data: [],
    setData: () => {},
    packingList: [],
    setPackingList: () => {},
    extractedData: null,
    setExtractedData: () => {},
});

interface DataProviderProps {
    children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
    const [data, setData] = useState<SheetDataRow[]>([]);
    const [packingList, setPackingList] = useState<PackingItem[]>([]);
    const [extractedData, setExtractedData] = useState<DietPlanExtractOutput | null>(null);

    const value = {
        data,
        setData,
        packingList,
        setPackingList,
        extractedData,
        setExtractedData,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}
