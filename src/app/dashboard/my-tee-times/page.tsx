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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function MyTeeTimes() {
  const [bookings, setBookings] = useState([
    { id: 1, date: "2023-10-25", time: "9:00 AM", location: "Location 1" },
    { id: 2, date: "2023-10-26", time: "2:00 PM", location: "Location 2" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const handleDelete = async (id: number) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay
    setBookings(bookings.filter((b) => b.id !== id));
    toast.success("Booking deleted!");
    setIsLoading(false);
    setSelectedBooking(null);
  };

  const handleEdit = (booking: any) => {
    setSelectedBooking(booking);
    // Mock edit - in reality, open a form to edit details
    toast.info("Edit functionality mocked - update form to be implemented.");
  };

  return (
    <div className="space-y-8 p-6">
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
                        Editing {booking.date} at {booking.time} - (Mocked for
                        now)
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
                        variant="default"
                        onClick={() => handleEdit(booking)}
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
