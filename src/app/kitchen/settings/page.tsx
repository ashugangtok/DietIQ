
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                    Manage site names, users, roles, and other master data.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                 <div>
                    <h3 className="text-lg font-medium">Site Management</h3>
                    <Separator className="my-4"/>
                    <div className="space-y-4">
                        <Label htmlFor="new-site">Add New Site</Label>
                        <div className="flex gap-2">
                           <Input id="new-site" placeholder="Enter new site name" />
                           <Button>Add Site</Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Existing sites will be listed here for editing or removal.
                        </p>
                    </div>
                 </div>

                 <div>
                    <h3 className="text-lg font-medium">User Management</h3>
                    <Separator className="my-4"/>
                     <div className="space-y-4">
                        <Label htmlFor="new-user">Invite New User</Label>
                        <div className="flex gap-2">
                           <Input id="new-user" placeholder="Enter user email" type="email" />
                           <Button>Invite User</Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Existing users and their roles will be listed here.
                        </p>
                    </div>
                 </div>
            </CardContent>
        </Card>
    </div>
  );
}
