
"use client";

import { createContext, useState, ReactNode, Dispatch, SetStateAction, useCallback } from 'react';
import { type SheetDataRow } from '@/types';
import { type DietPlanExtractOutput } from '@/ai/flows/extract-diet-plan-flow';

export interface JournalEntry {
    timestamp: Date;
    action: string;
    details: string;
}

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
    journalEntries: JournalEntry[];
    addJournalEntry: (action: string, details: string) => void;
}

export const DataContext = createContext<DataContextType>({
    data: [],
    setData: () => {},
    packingList: [],
    setPackingList: () => {},
    extractedData: null,
    setExtractedData: () => {},
    journalEntries: [],
    addJournalEntry: () => {},
});

interface DataProviderProps {
    children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
    const [data, setData] = useState<SheetDataRow[]>([]);
    const [packingList, setPackingList] = useState<PackingItem[]>([]);
    const [extractedData, setExtractedData] = useState<DietPlanExtractOutput | null>(null);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

    const addJournalEntry = useCallback((action: string, details: string) => {
        const newEntry: JournalEntry = {
            timestamp: new Date(),
            action,
            details,
        };
        setJournalEntries(prevEntries => [newEntry, ...prevEntries]);
    }, []);

    const value = {
        data,
        setData,
        packingList,
        setPackingList,
        extractedData,
        setExtractedData,
        journalEntries,
        addJournalEntry,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}
