
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

export default function ReportingPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Reporting</CardTitle>
                <CardDescription>
                    View day/week/month-wise summaries of what&apos;s packed and dispatched.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Input type="date" placeholder="Start Date" className="w-full sm:w-auto bg-background" />
                    <Input type="date" placeholder="End Date" className="w-full sm:w-auto bg-background" />
                    <Select>
                        <SelectTrigger className="w-full sm:w-[180px] bg-background">
                            <SelectValue placeholder="Filter by Site" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sites</SelectItem>
                            <SelectItem value="main-zoo">Main Zoo</SelectItem>
                            <SelectItem value="safari-park">Safari Park</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input placeholder="Filter by Ingredient..." className="w-full sm:w-[200px] bg-background" />
                    <div className="flex-grow"></div>
                    <Button>
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                    </Button>
                 </div>
                 <div className="text-center p-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">
                        Summary reports and charts will be displayed here.
                    </p>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
