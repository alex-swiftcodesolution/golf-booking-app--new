"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { motion } from "framer-motion";
import { useBookings } from "@/context/BookingContext";

export default function MyTeeTimes() {
  const { bookings, deleteBooking } = useBookings();
  const [isLoading, setIsLoading] = useState(false);
  const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      deleteBooking(id);
      toast.success("Tee time canceled", {
        description: `Your tee time on ${
          bookings.find((b) => b.id === id)?.date
        } at ${bookings.find((b) => b.id === id)?.time} has been canceled.`,
      });
    } catch {
      toast.error("Failed to cancel tee time", {
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
      setDeleteBookingId(null);
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
        className="w-full max-w-4xl mx-auto"
      >
        {bookings.length === 0 ? (
          <p className="text-center text-gray-500">
            You have no booked tee times.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Time</TableHead>
                  <TableHead className="text-xs sm:text-sm">Location</TableHead>
                  <TableHead className="text-xs sm:text-sm">Bay</TableHead>
                  <TableHead className="text-xs sm:text-sm">Guests</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="text-xs sm:text-sm">
                      {booking.date}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {booking.time}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {booking.location}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {booking.bay}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {booking.guests.length > 0
                        ? booking.guests.map((guest) => guest.name).join(", ")
                        : "None"}
                    </TableCell>
                    <TableCell>
                      <Dialog
                        open={deleteBookingId === booking.id}
                        onOpenChange={(open) =>
                          !open && setDeleteBookingId(null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteBookingId(booking.id)}
                          >
                            Cancel
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Cancellation</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to cancel the booking for{" "}
                              {booking.date} at {booking.time}?
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() => setDeleteBookingId(null)}
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
                                "Confirm"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Mobile Layout: Stacked Card-like View */}
            <div className="sm:hidden space-y-4">
              {bookings.map((booking) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border rounded-lg p-4 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold">
                          {booking.date} at {booking.time}
                        </p>
                        <p className="text-xs text-gray-600">
                          {booking.location} ({booking.bay})
                        </p>
                      </div>
                      <Dialog
                        open={deleteBookingId === booking.id}
                        onOpenChange={(open) =>
                          !open && setDeleteBookingId(null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteBookingId(booking.id)}
                          >
                            Cancel
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Cancellation</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to cancel the booking for{" "}
                              {booking.date} at {booking.time}?
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() => setDeleteBookingId(null)}
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
                                "Confirm"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <p className="text-xs">
                      <strong>Guests:</strong>{" "}
                      {booking.guests.length > 0
                        ? booking.guests.map((guest) => guest.name).join(", ")
                        : "None"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
