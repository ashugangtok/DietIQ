
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart2,
  Table,
  TrendingUp,
  Spline,
  Group,
  ClipboardList,
  ChefHat,
  Home,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Book,
  BookCopy,
  ClipboardCheck,
  FileText,
  Bot,
  BookText,
  Lightbulb,
  ListTodo,
  LayoutGrid,
} from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { DataContext } from '@/context/data-context';
import { useContext, useRef, useState, useEffect } from 'react';
import * as XLSX from "xlsx";
import { type SheetDataRow } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import styles from '../reporting.module.css';
import Image from 'next/image';
import './../hero.css';
import { useRouter } from 'next/navigation';

function RedirectOrLoading() {
    const router = useRouter();
    
    useEffect(() => {
        router.replace('/upload');
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center">
            <div className={styles['paw-loader-lg']}>
                <div className={styles.paw}></div>
                <div className={styles.paw}></div>
                <div className={styles.paw}></div>
            </div>
        </div>
    );
}


export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, setData, speciesSiteData } = useContext(DataContext);
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  const handleReset = () => {
    setData([]);
    router.push('/upload');
  };

  if (data.length === 0 && speciesSiteData.length === 0) {
    if (pathname === '/upload') {
        return <main>{children}</main>
    }
    return <RedirectOrLoading />;
  }


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Image src="/logo.png" alt="Sheet Insights" width={180} height={32} />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/dashboard" passHref>
                    <SidebarMenuButton tooltip="Live Dashboard" isActive={isActive('/dashboard')}>
                        <BarChart2 />
                        <span>Live Dashboard</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/species-dashboard" passHref>
                    <SidebarMenuButton tooltip="Species Dashboard" isActive={isActive('/species-dashboard')}>
                        <LayoutGrid />
                        <span>Species Dashboard</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/data-table" passHref>
                    <SidebarMenuButton tooltip="Data Table" isActive={isActive('/data-table')}>
                        <Table />
                        <span>Data Table</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/summary" passHref>
                    <SidebarMenuButton tooltip="Summary" isActive={isActive('/summary')}>
                        <TrendingUp />
                        <span>Summary</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/ingredient-breakup" passHref>
                    <SidebarMenuButton tooltip="Ingredient Breakup" isActive={isActive('/ingredient-breakup')}>
                        <Spline />
                        <span>Ingredient Breakup</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/meal-group-breakup" passHref>
                    <SidebarMenuButton tooltip="Meal Group Breakup" isActive={isActive('/meal-group-breakup')}>
                        <Group />
                        <span>Meal Group Breakup</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/diet-plan" passHref>
                    <SidebarMenuButton tooltip="Diet Plan" isActive={isActive('/diet-plan')}>
                        <ClipboardList />
                        <span>Diet Plan</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/summary-report" passHref>
                    <SidebarMenuButton tooltip="Summary Report" isActive={isActive('/summary-report')}>
                        <Book />
                        <span>Summary Report</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <Link href="/summary-report-check" passHref>
                    <SidebarMenuButton tooltip="Summary Report Check" isActive={isActive('/summary-report-check')}>
                        <ListTodo />
                        <span>Summary Report Check</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <Link href="/overall-report" passHref>
                    <SidebarMenuButton tooltip="Overall Report" isActive={isActive('/overall-report')}>
                        <BookCopy />
                        <span>Overall Report</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/overall-report-check" passHref>
                    <SidebarMenuButton tooltip="Overall Report Check" isActive={isActive('/overall-report-check')}>
                        <ClipboardCheck />
                        <span>Overall Report Check</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Link href="/journal" passHref>
                <SidebarMenuButton tooltip="Journal" isActive={isActive('/journal')}>
                  <BookText />
                  <span>Journal</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/pdf-extract" passHref>
                <SidebarMenuButton tooltip="Extract from PDF" isActive={isActive('/pdf-extract')}>
                  <FileText />
                  <span>Extract from PDF</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Link href="/generate-summary" passHref>
                <SidebarMenuButton tooltip="Generate Summary" isActive={isActive('/generate-summary')}>
                  <FileSpreadsheet />
                  <span>Generate Summary</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/generate-diet" passHref>
                <SidebarMenuButton tooltip="Generate Diet" isActive={isActive('/generate-diet')}>
                  <Bot />
                  <span>Generate Diet</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <Link href="/kitchen" passHref>
                <SidebarMenuButton tooltip="Go to Kitchen">
                    <ChefHat />
                    <span>Go to Kitchen</span>
                </SidebarMenuButton>
            </Link>
            <Button variant="ghost" onClick={handleReset}>Upload New File</Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <SidebarTrigger className="sm:hidden"/>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
