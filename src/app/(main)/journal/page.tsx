
'use client';

import { useContext } from 'react';
import { DataContext } from '@/context/data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BookText } from 'lucide-react';

export default function JournalPage() {
  const { journalEntries } = useContext(DataContext);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card className="shadow-lg h-[calc(100vh-4rem)] flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <BookText className="w-6 h-6" />
          Activity Journal
        </CardTitle>
        <CardDescription>A log of all significant actions performed in the application.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {journalEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No journal entries yet. Perform an action to see it logged here.</p>
          </div>
        ) : (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
              {journalEntries.map((entry, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-primary mt-1"></div>
                    {index < journalEntries.length - 1 && <div className="w-px flex-1 bg-border -mb-6"></div>}
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="font-semibold text-primary">{entry.action}</p>
                    <p className="text-sm text-muted-foreground">{formatTimestamp(entry.timestamp)}</p>
                    <p className="mt-1 text-sm">{entry.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
