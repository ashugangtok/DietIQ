
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  Users,
  BarChart3,
  Upload,
  Settings,
  ChefHat,
  Home,
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

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    // Exact match for the base kitchen path, otherwise check for startsWith
    return path === '/kitchen' ? pathname === path : pathname.startsWith(path);
  };
  
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <ChefHat className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold">Kitchen</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/kitchen" passHref>
                <SidebarMenuButton tooltip="Packing Dashboard" isActive={pathname === '/kitchen'}>
                  <Package />
                  <span>Packing Dashboard</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/kitchen/supervisor" passHref>
                <SidebarMenuButton tooltip="Supervisor Dashboard" isActive={isActive('/kitchen/supervisor')}>
                  <Users />
                  <span>Supervisor Dashboard</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/kitchen/reporting" passHref>
                <SidebarMenuButton tooltip="Reporting" isActive={isActive('/kitchen/reporting')}>
                  <BarChart3 />
                  <span>Reporting</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/kitchen/upload" passHref>
                <SidebarMenuButton tooltip="Upload Orders" isActive={isActive('/kitchen/upload')}>
                  <Upload />
                  <span>Upload Orders</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/kitchen/settings" passHref>
                <SidebarMenuButton tooltip="Settings" isActive={isActive('/kitchen/settings')}>
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <Link href="/" passHref>
                <SidebarMenuButton tooltip="Back to Insights">
                    <Home/>
                    <span>Sheet Insights</span>
                </SidebarMenuButton>
            </Link>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <SidebarTrigger className="md:hidden"/>
            <h1 className="text-xl font-semibold text-primary font-headline hidden md:block">
                Kitchen Management
            </h1>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
