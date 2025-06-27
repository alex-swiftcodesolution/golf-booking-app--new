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
import { Booking, useBookings } from "@/context/BookingContext";
import axios from "axios";
import {
  fetchGuestData,
  updateGuestData,
  fetchServices,
  fetchClubs,
} from "@/api/gymmaster";

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;

interface ServiceBooking {
  id: number;
  day: string;
  starttime: string;
  start_str?: string;
  location?: string;
  name?: string;
  servicename?: string;
  serviceid?: number;
  type?: string;
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

      console.log(
        "Raw API Bookings:",
        bookingsRes.data.result?.servicebookings
      );

      const { guestBookingIds, guests } = guestData;

      // Build guest map with explicit string key
      const guestMap: Record<
        string,
        { name: string; email: string; date?: string }[]
      > = {};
      guestBookingIds.forEach((id: number, index: number) => {
        const guest = guests[index];
        const date = guest?.date ?? "";
        const key: string = `${id}_${date}`;
        guestMap[key] = guestMap[key] || [];
        guestMap[key].push(guest || { name: "", email: "", date: "" });
      });

      const clubs = await fetchClubs();
      const clubMap = Object.fromEntries(
        clubs.map((club) => [club.name, club.id])
      );

      const uniqueClubs: string[] = Array.from(
        new Set(
          bookingsRes.data.result?.servicebookings?.map(
            (b: ServiceBooking) => b.location || "Simcognito's Golf 2/47 Club"
          )
        )
      );

      const serviceMaps: Record<string, Record<number, string>> = {};

      for (const clubName of uniqueClubs) {
        const companyid = clubMap[clubName];
        if (companyid) {
          const services = await fetchServices(token, undefined, companyid);
          serviceMaps[clubName] = Object.fromEntries(
            services
              .filter((s) => s.servicename.includes("Member Golf Bay"))
              .map((s) => [s.serviceid, s.servicename.trim()])
          );
        }
      }

      const fetchedBookings: Booking[] =
        bookingsRes.data.result?.servicebookings?.map((b: ServiceBooking) => {
          let time = b.starttime?.slice(0, 5) || "00:00";
          if (b.start_str) {
            const match = b.start_str.match(/(\d+):(\d+)\s*(am|pm)/i);
            if (match) {
              const [, hours, minutes, period] = match;
              let hourNum = parseInt(hours);
              if (period.toLowerCase() === "pm" && hourNum !== 12)
                hourNum += 12;
              if (period.toLowerCase() === "am" && hourNum === 12) hourNum = 0;
              time = `${hourNum.toString().padStart(2, "0")}:${minutes}`;
            }
          }
          const [hour, minute] = time.split(":").map(Number);
          const period = hour >= 12 ? "PM" : "AM";
          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          const displayTime = `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;

          const [year, month, day] = b.day.split("-").map(Number);
          const formattedDate = `${month.toString().padStart(2, "0")}/${day
            .toString()
            .padStart(2, "0")}/${year.toString().slice(-2)}`;

          const clubName = b.location || "Simcognito's Golf 2/47 Club";

          const servicename =
            b.type?.trim() ||
            (typeof b.serviceid === "number" &&
            serviceMaps[clubName]?.[b.serviceid]
              ? serviceMaps[clubName][b.serviceid]
              : b.servicename || "Unknown Service");

          const guestKey = `${b.id}_${b.day}`;
          return {
            id: b.id,
            date: formattedDate,
            time: displayTime,
            location: clubName,
            bay: b.name || "Unknown",
            servicename,
            guests: guestMap[guestKey] || [],
            guestPassUsage: { free: 0, charged: 0 },
            day: new Date(b.day).toLocaleDateString("en-US", {
              weekday: "long",
            }),
            starttime: time,
          };
        }) || [];

      setBookings((prev) =>
        fetchedBookings.map((newBooking) => {
          const existing = prev.find((b) => b.id === newBooking.id);
          return existing
            ? {
                ...newBooking,
                servicename: existing.servicename || newBooking.servicename,
              }
            : newBooking;
        })
      );

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

  /*
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
  */

  const handleDelete = async (id: number) => {
    setIsLoading(true);
    try {
      const booking = bookings.find((b) => b.id === id);
      if (!booking) throw new Error("Booking not found");

      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated");

      // Cancel booking
      const response = await axios.post(
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

      // Check response for success
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // Update guest data
      try {
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
      } catch (guestError) {
        console.warn(
          "Guest data update failed, but booking was cancelled:",
          guestError
        );
        // Proceed with UI update even if guest data fails
      }

      // Update UI
      deleteBooking(id);
      toast.success("Tee time canceled", {
        description: `Your tee time on ${booking.date} at ${booking.time} has been canceled.`,
      });

      // Optional: Verify cancellation due to GymMaster caching
      setTimeout(async () => {
        try {
          const updatedBookings = await axios.get(
            "/api/gymmaster/v2/member/bookings",
            {
              params: {
                api_key: GYMMASTER_API_KEY,
                token,
              },
            }
          );
          if (
            !updatedBookings.data.result?.servicebookings?.find(
              (b: ServiceBooking) => b.id === id
            )
          ) {
            console.log("Cancellation confirmed via API");
          } else {
            console.warn(
              "Booking still appears in API response, possible caching delay"
            );
          }
        } catch (verifyError) {
          console.warn("Failed to verify cancellation:", verifyError);
        }
      }, 5000); // Wait 5 seconds to account for cache
    } catch (error) {
      console.error("Delete Booking Error:", error);
      toast.error("Failed to cancel tee time", {
        description:
          "The booking may have been cancelled. Please refresh to confirm.",
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
    <div className="">
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

        {sortedBookings.length === 0 ? (
          <p className="text-center text-gray-500">
            You have no booked tee times.
          </p>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <Table className="hidden sm:table w-full">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="text-sm font-semibold text-black">
                    Date
                  </TableHead>
                  <TableHead className="text-sm font-semibold text-black">
                    Time
                  </TableHead>
                  <TableHead className="text-sm font-semibold text-black">
                    Service
                  </TableHead>
                  <TableHead className="text-sm font-semibold text-black">
                    Bay
                  </TableHead>
                  {/* <TableHead className="text-sm font-semibold text-black">
                    Guests
                  </TableHead> */}
                  <TableHead className="text-sm font-semibold text-black">
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
                    className="border-b"
                  >
                    <TableCell className="text-sm text-black">
                      {booking.date}
                    </TableCell>
                    <TableCell className="text-sm text-black">
                      {booking.time}
                    </TableCell>
                    <TableCell className="text-sm text-black">
                      {booking.servicename}
                    </TableCell>
                    <TableCell className="text-sm text-black">
                      {booking.bay}
                    </TableCell>
                    {/* <TableCell className="text-sm text-black">
                      {booking.guests.length > 0
                        ? booking.guests.map((g) => g.name).join(", ")
                        : "None"}
                    </TableCell> */}
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

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-4">
              {sortedBookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="border rounded-lg p-4 shadow-md bg-white hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex flex-col items-start justify-start gap-0">
                      <span className="text-sm font-semibold text-gray-700">
                        Date
                      </span>
                      <span className="text-sm text-black">{booking.date}</span>
                    </div>
                    <div className="flex flex-col items-start justify-start gap-0">
                      <span className="text-sm font-semibold text-gray-700">
                        Time
                      </span>
                      <span className="text-sm text-black">{booking.time}</span>
                    </div>
                    <div className="flex flex-col items-start justify-start gap-0">
                      <span className="text-sm font-semibold text-gray-700">
                        Service
                      </span>
                      <span className="text-sm text-black">
                        {booking.servicename}
                      </span>
                    </div>
                    <div className="flex flex-col items-start justify-start gap-0">
                      <span className="text-sm font-semibold text-gray-700">
                        Bay
                      </span>
                      <span className="text-sm text-black">{booking.bay}</span>
                    </div>
                    {/* <div className="flex flex-col items-start justify-start gap-0">
                      <span className="text-sm font-semibold text-gray-700">
                        Guests
                      </span>
                      <span className="text-sm text-black">
                        {booking.guests.length > 0
                          ? booking.guests.map((g) => g.name).join(", ")
                          : "None"}
                      </span>
                    </div> */}
                    <div className="flex justify-end mt-2">
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
