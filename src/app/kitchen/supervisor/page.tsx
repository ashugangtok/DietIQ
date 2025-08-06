
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const dispatchList = [
    { site: "Main Zoo", ingredient: "Bermuda Grass", quantity: "50 kg", status: "Packed" },
    { site: "Main Zoo", ingredient: "Hay", quantity: "100 kg", status: "Dispatched" },
    { site: "Safari Park", ingredient: "Special Pellets", quantity: "30 kg", status: "Packed" },
    { site: "Aviary", ingredient: "Seeds Mix", quantity: "5 kg", status: "Dispatched" },
];

export default function SupervisorDashboardPage() {
  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Supervisor Dashboard</CardTitle>
                <CardDescription>
                    Monitor what&apos;s packed and mark items as &quot;Dispatched&quot;.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                    <Input type="date" className="w-full sm:w-auto bg-background" />
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
                    <Select>
                        <SelectTrigger className="w-full sm:w-[180px] bg-background">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="packed">Packed</SelectItem>
                            <SelectItem value="dispatched">Dispatched</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="relative overflow-x-auto rounded-md border">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Site</TableHead>
                                <TableHead>Ingredient</TableHead>
                                <TableHead>Quantity Packed</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dispatchList.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.site}</TableCell>
                                    <TableCell>{item.ingredient}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.status === "Dispatched" ? "default" : "secondary"} className={item.status === "Dispatched" ? "bg-accent" : ""}>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="outline" disabled={item.status === "Dispatched"}>
                                            Mark as Dispatched
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
