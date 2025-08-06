
"use client";

import { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { type SheetDataRow } from '@/types';

export interface PackingItem {
    id: string;
    status: 'Pending' | 'Packed' | 'Dispatched';
}

interface DataContextType {
    data: SheetDataRow[];
    setData: Dispatch<SetStateAction<SheetDataRow[]>>;
    packingList: PackingItem[];
    setPackingList: Dispatch<SetStateAction<PackingItem[]>>;
}

export const DataContext = createContext<DataContextType>({
    data: [],
    setData: () => {},
    packingList: [],
    setPackingList: () => {},
});

interface DataProviderProps {
    children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
    const [data, setData] = useState<SheetDataRow[]>([]);
    const [packingList, setPackingList] = useState<PackingItem[]>([]);

    const value = {
        data,
        setData,
        packingList,
        setPackingList,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}
