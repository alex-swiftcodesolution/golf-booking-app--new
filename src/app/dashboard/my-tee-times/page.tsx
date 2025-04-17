"use client";
import { useState, useEffect } from "react";
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
import { Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Booking, useBookings } from "@/context/BookingContext";
import axios from "axios";

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;

export default function MyTeeTimes() {
  const { bookings, deleteBooking, setBookings } = useBookings();
  const [isLoading, setIsLoading] = useState(false);
  const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const fetchBookings = async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await axios.get("/api/gymmaster/v2/member/bookings", {
        params: {
          api_key: GYMMASTER_API_KEY,
          token,
        },
      });

      console.log("Bookings Response:", response.data);

      const fetchedBookings =
        response.data.result.servicebookings?.map((b: Booking) => {
          // Normalize time to 24-hour format (e.g., "9:00 am" -> "09:00")
          let time = b.starttime.slice(0, 5); // Default to "HH:MM"
          if (b.start_str) {
            const [hours, minutes, period] = b.start_str
              .match(/(\d+):(\d+)\s*(am|pm)/i)
              ?.slice(1) || ["0", "00", "am"];
            let hourNum = parseInt(hours);
            if (period.toLowerCase() === "pm" && hourNum !== 12) hourNum += 12;
            if (period.toLowerCase() === "am" && hourNum === 12) hourNum = 0;
            time = `${hourNum.toString().padStart(2, "0")}:${minutes}`;
          }

          return {
            id: b.id,
            date: b.day,
            time,
            location: b.location || "Simcognito's Golf 2/47 Club",
            bay: b.name || "Unknown",
            guests: [], // No guest data from API
            guestPassUsage: { free: 0, charged: 0 }, // Placeholder
          };
        }) || [];

      console.log("Mapped Bookings:", fetchedBookings);
      setBookings(fetchedBookings);
      if (fetchedBookings.length === 0) {
        toast.info("No bookings found");
      }
    } catch (error) {
      console.error("Fetch Bookings Error:", error);
      toast.error("Failed to fetch bookings", {
        description: "Please try again later.",
      });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleDelete = async (id: number) => {
    setIsLoading(true);
    try {
      const booking = bookings.find((b) => b.id === id);
      if (!booking) throw new Error("Booking not found");

      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated");

      await axios.post(
        "/api/gymmaster/v1/member/cancelbooking",
        new URLSearchParams({
          api_key: GYMMASTER_API_KEY || "",
          token,
          bookingid: id.toString(),
          waitlist: "0",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      deleteBooking(id);
      toast.success("Tee time canceled", {
        description: `Your tee time on ${booking.date} at ${booking.time} has been canceled.`,
      });
    } catch (error) {
      console.error("Delete Booking Error:", error);
      toast.error("Failed to cancel tee time", {
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
      setDeleteBookingId(null);
    }
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

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
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            onClick={fetchBookings}
            disabled={isFetching}
            aria-label="Refresh bookings"
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

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
                  <TableHead className="text-xs sm:text-sm">
                    Guest Pass Usage
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBookings.map((booking) => (
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
                    <TableCell className="text-xs sm:text-sm">
                      {booking.guestPassUsage
                        ? `${booking.guestPassUsage.free} free pass(es), ${booking.guestPassUsage.charged} charged`
                        : "N/A"}
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
                            aria-label={`Cancel tee time for ${booking.date} at ${booking.time}`}
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
              {sortedBookings.map((booking) => (
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
                            aria-label={`Cancel tee time for ${booking.date} at ${booking.time}`}
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
                    <p className="text-xs">
                      <strong>Guest Pass Usage:</strong>{" "}
                      {booking.guestPassUsage
                        ? `${booking.guestPassUsage.free} free pass(es), ${booking.guestPassUsage.charged} charged`
                        : "N/A"}
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
