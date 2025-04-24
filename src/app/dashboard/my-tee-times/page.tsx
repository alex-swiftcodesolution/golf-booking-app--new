"use client";
import { useState, useEffect, useCallback } from "react";
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
import { useBookings } from "@/context/BookingContext";
import axios from "axios";
import { fetchGuestData, updateGuestData } from "@/api/gymmaster";

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;

// Interface for GymMaster service booking response
interface ServiceBooking {
  id: number;
  day: string;
  starttime: string;
  start_str?: string;
  location?: string;
  name?: string;
  servicename?: string;
}

export default function MyTeeTimes() {
  const { bookings, deleteBooking, setBookings } = useBookings();
  const [isLoading, setIsLoading] = useState(false);
  const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const fetchBookings = useCallback(async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const [bookingsRes, guestData] = await Promise.all([
        axios.get("/api/gymmaster/v2/member/bookings", {
          params: {
            api_key: GYMMASTER_API_KEY,
            token,
          },
        }),
        fetchGuestData(token),
      ]);

      console.log("Bookings Response:", bookingsRes.data);
      console.log("Guest Data:", guestData);

      const { guestBookingIds, guests } = guestData;

      // Map guest data to bookings
      const guestMap: Record<number, { name: string; email: string }[]> = {};
      let guestIndex = 0;
      guestBookingIds.forEach((id: number) => {
        guestMap[id] = guestMap[id] || [];
        if (guestIndex < guests.length) {
          guestMap[id].push(guests[guestIndex]);
          guestIndex++;
        } else {
          guestMap[id].push({
            name: `Guest ${guestIndex + 1}`,
            email: `guest${guestIndex + 1}@example.com`,
          });
        }
      });
      console.log("Guest Map:", guestMap);

      const fetchedBookings =
        bookingsRes.data.result?.servicebookings?.map((b: ServiceBooking) => {
          let time = b.starttime?.slice(0, 5) || "00:00";
          if (b.start_str) {
            const [hours, minutes, period] = b.start_str
              .match(/(\d+):(\d+)\s*(am|pm)/i)
              ?.slice(1) || ["0", "00", "am"];
            let hourNum = parseInt(hours);
            if (period.toLowerCase() === "pm" && hourNum !== 12) hourNum += 12;
            if (period.toLowerCase() === "am" && hourNum === 12) hourNum = 0;
            time = `${hourNum.toString().padStart(2, "0")}:${minutes}`;
          }

          const bookingGuests = guestMap[b.id] || [];
          return {
            id: b.id,
            date: b.day,
            time,
            location: b.location || "Simcoquitos 24/7 Golf Club",
            bay: b.name || "Unknown",
            servicename: b.servicename || "Golf Simulator",
            guests: bookingGuests,
            guestPassUsage: {
              free: bookingGuests.length
                ? Math.min(bookingGuests.length, 2)
                : 0,
              charged: bookingGuests.length
                ? Math.max(bookingGuests.length - 2, 0)
                : 0,
            },
            day: new Date(b.day).toLocaleDateString("en-US", {
              weekday: "long",
            }),
            starttime: time,
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
  }, [setBookings]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleDelete = async (id: number) => {
    setIsLoading(true);
    try {
      const booking = bookings.find((b) => b.id === id);
      if (!booking) throw new Error("Booking not found");

      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated");

      // Cancel booking via GymMaster API
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

      // Update guest data in customtext1
      const guestData = await fetchGuestData(token);
      const updatedGuestBookingIds = guestData.guestBookingIds.filter(
        (bookingId: number) => bookingId !== id
      );
      const updatedGuestPassesUsed = Math.max(
        guestData.guestPassesUsed - (booking.guests.length || 0),
        0
      );
      const guestIndices = guestData.guestBookingIds
        .map((bookingId: number, index: number) =>
          bookingId === id ? index : -1
        )
        .filter((index: number) => index !== -1);
      const updatedGuests = guestData.guests.filter(
        (_: { name: string; email: string }, index: number) =>
          !guestIndices.includes(index)
      );
      await updateGuestData(
        token,
        updatedGuestPassesUsed,
        guestData.referralCodes,
        updatedGuestBookingIds,
        updatedGuests
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
        className="text-3xl sm:text-4xl font-bold text-center text-black"
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
            className="border-gray-300 text-black hover:bg-gray-100"
            aria-label="Refresh bookings"
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-black" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4 text-black" />
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
                  <TableHead className="text-xs sm:text-sm text-black">
                    Date
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm text-black">
                    Time
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm text-black">
                    Service
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm text-black">
                    Location
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm text-black">
                    Bay
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm text-black">
                    Guests
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm text-black">
                    Guest Pass Usage
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm text-black">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBookings.map((booking, index) => (
                  <motion.tr
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <TableCell className="text-xs sm:text-sm text-black">
                      {booking.date}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-black">
                      {booking.time}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-black">
                      {booking.servicename}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-black">
                      {booking.location}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-black">
                      {booking.bay}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-black">
                      {booking.guests.length > 0
                        ? booking.guests.map((guest) => guest.name).join(", ")
                        : "None"}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-black">
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
                            className="bg-red-500 text-white hover:bg-red-600"
                            aria-label={`Cancel tee time for ${booking.date} at ${booking.time}`}
                          >
                            Cancel
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-black">
                              Confirm Cancellation
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                              Are you sure you want to cancel the booking for{" "}
                              {booking.date} at {booking.time}?
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto border-gray-300 text-black hover:bg-gray-100"
                              onClick={() => setDeleteBookingId(null)}
                              disabled={isLoading}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              className="w-full sm:w-auto bg-red-500 text-white hover:bg-red-600"
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
                  </motion.tr>
                ))}
              </TableBody>
            </Table>

            {/* Mobile Layout: Stacked Card-like View */}
            <div className="sm:hidden space-y-4">
              {sortedBookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="border rounded-lg p-4 shadow-sm bg-white"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-black">
                          {booking.date} at {booking.time}
                        </p>
                        <p className="text-xs text-gray-600">
                          {booking.servicename} at {booking.location} (
                          {booking.bay})
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
                            className="bg-red-500 text-white hover:bg-red-600"
                            aria-label={`Cancel tee time for ${booking.date} at ${booking.time}`}
                          >
                            Cancel
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-black">
                              Confirm Cancellation
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                              Are you sure you want to cancel the booking for{" "}
                              {booking.date} at {booking.time}?
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto border-gray-300 text-black hover:bg-gray-100"
                              onClick={() => setDeleteBookingId(null)}
                              disabled={isLoading}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              className="w-full sm:w-auto bg-red-500 text-white hover:bg-red-600"
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
                    <p className="text-xs text-black">
                      <strong>Guests:</strong>{" "}
                      {booking.guests.length > 0
                        ? booking.guests.map((guest) => guest.name).join(", ")
                        : "None"}
                    </p>
                    <p className="text-xs text-black">
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
