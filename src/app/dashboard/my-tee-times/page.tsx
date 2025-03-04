"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // Add Input for edit form
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Define booking type
interface Booking {
  id: number;
  date: string;
  time: string;
  location: string;
}

export default function MyTeeTimes() {
  const [bookings, setBookings] = useState<Booking[]>([
    { id: 1, date: "2023-10-25", time: "9:00 AM", location: "Location 1" },
    { id: 2, date: "2023-10-26", time: "2:00 PM", location: "Location 2" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editedLocation, setEditedLocation] = useState(""); // State for edited location

  const handleDelete = async (id: number) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setBookings(bookings.filter((b) => b.id !== id));
    toast.success("Booking deleted!");
    setIsLoading(false);
    setSelectedBooking(null);
  };

  const handleEdit = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditedLocation(booking.location); // Pre-fill with current location
  };

  const saveEdit = async () => {
    if (selectedBooking) {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const updatedBookings = bookings.map((b) =>
        b.id === selectedBooking.id ? { ...b, location: editedLocation } : b
      );
      setBookings(updatedBookings);
      toast.success("Booking updated!");
      setIsLoading(false);
      setSelectedBooking(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Tee Times</h1>
      <div className="space-y-4">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {booking.date} at {booking.time}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{booking.location}</p>
              <div className="mt-2 space-x-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => handleEdit(booking)}
                    >
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Booking</DialogTitle>
                      <DialogDescription>
                        Editing {selectedBooking?.date} at{" "}
                        {selectedBooking?.time}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Label>New Location</Label>
                      <Input
                        value={editedLocation}
                        onChange={(e) => setEditedLocation(e.target.value)}
                        placeholder="Enter new location"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedBooking(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        onClick={saveEdit}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      Delete
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Deletion</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete the booking for{" "}
                        {booking.date} at {booking.time}?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedBooking(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(booking.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          "Delete"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
