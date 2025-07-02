"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const RenameServicePage = () => {
  const [oldName, setOldName] = useState("");
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/services/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName, newName }),
      });
      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }
      const { modifiedCount } = await response.json();
      toast.success(`Renamed ${modifiedCount} bookings successfully`);
      setOldName("");
      setNewName("");
      router.push("/dashboard");
    } catch (error) {
      console.error("Rename error:", error);
      toast.error("Failed to rename service", {
        description: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Rename Service</CardTitle>
          <CardDescription>
            Update the service name for all bookings in the database.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldName">Current Service Name</Label>
              <Input
                id="oldName"
                type="text"
                value={oldName}
                onChange={(e) => setOldName(e.target.value)}
                placeholder="Enter current service name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newName">New Service Name</Label>
              <Input
                id="newName"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new service name"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Renaming..." : "Rename Service"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default RenameServicePage;
