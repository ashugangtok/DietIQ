
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                    Manage site names, users, roles, ingredient master data, etc. This page is under construction.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground">
                    Configuration options and master data management tools will be available here.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
