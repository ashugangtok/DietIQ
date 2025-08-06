
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const packingList = [
    { site: "Main Zoo", ingredient: "Apples", quantity: "15 kg", status: "Pending" },
    { site: "Main Zoo", ingredient: "Bermuda Grass", quantity: "50 kg", status: "Packed" },
    { site: "Safari Park", ingredient: "Carrots", quantity: "20 kg", status: "Pending" },
    { site: "Safari Park", ingredient: "Fish (Cod)", quantity: "10 kg", status: "Pending" },
    { site: "Main Zoo", ingredient: "Hay", quantity: "100 kg", status: "Packed" },
];

export default function PackingDashboardPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Packing Dashboard</CardTitle>
                <CardDescription>
                    Today&apos;s required ingredients. Mark items as &quot;Packed&quot; once they are ready.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Site Name</TableHead>
                            <TableHead>Ingredient Name</TableHead>
                            <TableHead>Quantity Required</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {packingList.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{item.site}</TableCell>
                                <TableCell>{item.ingredient}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>
                                    <Badge variant={item.status === "Packed" ? "default" : "secondary"}>
                                        {item.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Button size="sm" disabled={item.status === "Packed"}>
                                        Mark as Packed
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
