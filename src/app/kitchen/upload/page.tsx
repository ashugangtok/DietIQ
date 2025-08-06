
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UploadOrdersPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Upload Orders</CardTitle>
                <CardDescription>
                    Upload daily/weekly ingredient requirement lists manually. This page is under construction.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground">
                    File upload or form-based order entry will be available here.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
