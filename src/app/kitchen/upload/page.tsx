
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud } from "lucide-react";

export default function UploadOrdersPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Upload Orders</CardTitle>
                <CardDescription>
                    Upload daily/weekly ingredient requirement lists manually.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div 
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                    >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <UploadCloud className="w-12 h-12 text-primary" />
                        <p className="font-semibold">Click to browse or drag & drop</p>
                        <p className="text-sm">Supports .xlsx files only</p>
                        <Button className="mt-4">Upload File</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
