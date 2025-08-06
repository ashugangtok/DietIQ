
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SupervisorDashboardPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Supervisor Dashboard</CardTitle>
                <CardDescription>
                    Monitor what's packed and mark items as "Dispatched". This page is under construction.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground">
                    Supervisor controls and monitoring tools will be available here.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
