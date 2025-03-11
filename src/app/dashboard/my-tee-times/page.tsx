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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

// Define booking type with additional fields
interface Booking {
  id: number;
  date: string;
  time: string;
  location: string;
  duration: string; // e.g., "1hr"
  guests: { name: string; cell: string }[]; // List of guests
  guestPassUsage: { free: number; charged: number }; // Guest pass usage
}

export default function MyTeeTimes() {
  const [bookings, setBookings] = useState<Booking[]>([
    {
      id: 1,
      date: "2023-10-25",
      time: "9:00 AM",
      location: "Location 1",
      duration: "1hr",
      guests: [
        { name: "Jane Doe", cell: "+1-123-456-7890" },
        { name: "John Smith", cell: "+1-234-567-8901" },
      ],
      guestPassUsage: { free: 1, charged: 1 },
    },
    {
      id: 2,
      date: "2023-10-26",
      time: "2:00 PM",
      location: "Location 2",
      duration: "2hr",
      guests: [],
      guestPassUsage: { free: 0, charged: 0 },
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [deleteBooking, setDeleteBooking] = useState<Booking | null>(null);
  const [editedLocation, setEditedLocation] = useState("");

  const handleDelete = async (id: number) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setBookings(bookings.filter((b) => b.id !== id));
      toast.success("Booking deleted!");
    } catch {
      toast.error("Failed to delete booking");
    } finally {
      setIsLoading(false);
      setDeleteBooking(null);
    }
  };

  const handleEdit = (booking: Booking) => {
    setEditBooking(booking);
    setEditedLocation(booking.location);
  };

  const saveEdit = async () => {
    if (editBooking) {
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const updatedBookings = bookings.map((b) =>
          b.id === editBooking.id ? { ...b, location: editedLocation } : b
        );
        setBookings(updatedBookings);
        toast.success("Booking updated!");
      } catch {
        toast.error("Failed to update booking");
      } finally {
        setIsLoading(false);
        setEditBooking(null);
      }
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center"
      >
        My Tee Times
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-2xl mx-auto space-y-4"
      >
        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    {booking.date} at {booking.time}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm sm:text-base">
                    <strong>Location:</strong> {booking.location}
                  </p>
                  <p className="text-sm sm:text-base">
                    <strong>Duration:</strong> {booking.duration}
                  </p>
                  {booking.guests.length > 0 ? (
                    <div className="text-sm sm:text-base">
                      <strong>Guests:</strong>
                      <ul className="list-disc pl-5">
                        {booking.guests.map((guest, index) => (
                          <li key={index}>
                            {guest.name} ({guest.cell})
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base">
                      <strong>Guests:</strong> None
                    </p>
                  )}
                  {booking.guests.length > 0 && (
                    <p className="text-sm sm:text-base text-gray-600">
                      <strong>Guest Pass Usage:</strong>{" "}
                      {booking.guestPassUsage.free} free pass(es) used
                      {booking.guestPassUsage.charged > 0
                        ? `, ${booking.guestPassUsage.charged} charged ($${
                            booking.guestPassUsage.charged * 10
                          })`
                        : ""}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2">
                    <Dialog
                      open={editBooking?.id === booking.id}
                      onOpenChange={(open) => !open && setEditBooking(null)}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto py-1.5 sm:py-2 text-sm sm:text-base"
                          onClick={() => handleEdit(booking)}
                        >
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Booking</DialogTitle>
                          <DialogDescription>
                            Editing {editBooking?.date} at {editBooking?.time}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Label>New Location</Label>
                          <Input
                            value={editedLocation}
                            onChange={(e) => setEditedLocation(e.target.value)}
                            placeholder="Enter new location"
                            className="text-sm sm:text-base"
                          />
                        </div>
                        <DialogFooter className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => setEditBooking(null)}
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            className="w-full sm:w-auto"
                            onClick={saveEdit}
                            disabled={isLoading || !editedLocation.trim()}
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
                    <Dialog
                      open={deleteBooking?.id === booking.id}
                      onOpenChange={(open) => !open && setDeleteBooking(null)}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="w-full sm:w-auto py-1.5 sm:py-2 text-sm sm:text-base"
                          onClick={() => setDeleteBooking(booking)}
                        >
                          Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Deletion</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete the booking for{" "}
                            {deleteBooking?.date} at {deleteBooking?.time}?
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => setDeleteBooking(null)}
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            className="w-full sm:w-auto"
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
            </motion.div>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-lg sm:text-xl text-gray-600">
                No tee times booked yet.
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
