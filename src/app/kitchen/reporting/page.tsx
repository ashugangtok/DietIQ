
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportingPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Reporting</CardTitle>
                <CardDescription>
                    View day/week/month-wise summaries of what's packed and dispatched. This page is under construction.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground">
                    Reporting dashboards and data exports will be available here.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
