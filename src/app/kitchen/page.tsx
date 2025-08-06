
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PackingDashboardPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Packing Dashboard</CardTitle>
                <CardDescription>
                    View required items and mark them as "Packed". This page is under construction.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Interactive packing list will be displayed here.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
