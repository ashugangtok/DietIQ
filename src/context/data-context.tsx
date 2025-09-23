
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

type UploadType = 'daily' | 'species' | null;

interface DataContextType {
    data: SheetDataRow[];
    setData: Dispatch<SetStateAction<SheetDataRow[]>>;
    speciesSiteData: SheetDataRow[];
    setSpeciesSiteData: Dispatch<SetStateAction<SheetDataRow[]>>;
    packingList: PackingItem[];
    setPackingList: Dispatch<SetStateAction<PackingItem[]>>;
    extractedData: DietPlanExtractOutput | null;
    setExtractedData: Dispatch<SetStateAction<DietPlanExtractOutput | null>>;
    journalEntries: JournalEntry[];
    addJournalEntry: (action: string, details: string) => void;
    uploadType: UploadType;
    setUploadType: Dispatch<SetStateAction<UploadType>>;
}

export const DataContext = createContext<DataContextType>({
    data: [],
    setData: () => {},
    speciesSiteData: [],
    setSpeciesSiteData: () => {},
    packingList: [],
    setPackingList: () => {},
    extractedData: null,
    setExtractedData: () => {},
    journalEntries: [],
    addJournalEntry: () => {},
    uploadType: null,
    setUploadType: () => {},
});

interface DataProviderProps {
    children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
    const [data, setData] = useState<SheetDataRow[]>([]);
    const [speciesSiteData, setSpeciesSiteData] = useState<SheetDataRow[]>([]);
    const [packingList, setPackingList] = useState<PackingItem[]>([]);
    const [extractedData, setExtractedData] = useState<DietPlanExtractOutput | null>(null);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [uploadType, setUploadType] = useState<UploadType>(null);


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
        speciesSiteData,
        setSpeciesSiteData,
        packingList,
        setPackingList,
        extractedData,
        setExtractedData,
        journalEntries,
        addJournalEntry,
        uploadType,
        setUploadType,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}
