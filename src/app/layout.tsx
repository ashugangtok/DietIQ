"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { DataProvider } from '@/context/data-context';
import { PT_Sans, Poppins } from 'next/font/google';
import { cn } from '@/lib/utils';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "font-body antialiased",
        ptSans.variable,
        poppins.variable
      )}>
        <DataProvider>
          {children}
          <Toaster />
        </DataProvider>
      </body>
    </html>
  );
}
