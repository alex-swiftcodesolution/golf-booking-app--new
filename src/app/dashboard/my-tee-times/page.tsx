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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  endtime: string;
  location?: string;
  name?: string;
  servicename?: string;
  serviceid?: number;
  type?: string;
  resourceid?: number;
}

export default function MyTeeTimes() {
  const { bookings, deleteBooking, setBookings } = useBookings();
  const [isLoading, setIsLoading] = useState(false);
  const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState<"self" | "guest">("self");

  const formatTime = (time: string, str?: string): string => {
    let formattedTime = time?.slice(0, 5) || "00:00";
    if (str) {
      const match = str.match(/(\d+):(\d+)\s*(am|pm)/i);
      if (match) {
        const [, hours, minutes, period] = match;
        let hourNum = parseInt(hours);
        if (period.toLowerCase() === "pm" && hourNum !== 12) hourNum += 12;
        if (period.toLowerCase() === "am" && hourNum === 12) hourNum = 0;
        formattedTime = `${hourNum.toString().padStart(2, "0")}:${minutes}`;
      }
    }
    const [hour, minute] = formattedTime.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
  };

  const formatTimeRange = (
    starttime: string,
    endtime: string,
    startStr?: string
  ): string => {
    const start = formatTime(starttime, startStr);
    const end = formatTime(endtime);
    return `${start} - ${end}`;
  };

  const fetchBookings = useCallback(async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const decodedToken = JSON.parse(atob(token.split(".")[1]));
      const stableUserId = Number(decodedToken.id);
      console.log("Auth Token:", token, "Stable User ID:", stableUserId);

      const bookingsRes = await axios.get("/api/gymmaster/v2/member/bookings", {
        params: {
          api_key: GYMMASTER_API_KEY,
          token,
        },
      });
      console.log(
        "GymMaster Bookings:",
        bookingsRes.data.result?.servicebookings
      );

      const mongoFetchResponse = await fetch("/api/bookings/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: stableUserId }),
      });

      if (!mongoFetchResponse.ok) {
        throw new Error("Failed to fetch guest data from MongoDB");
      }

      const { bookings: mongoBookings } = await mongoFetchResponse.json();
      console.log("MongoDB Bookings:", mongoBookings);

      const guestDataMap = new Map<number, Partial<Booking>>();
      mongoBookings.forEach((b: Booking) => {
        guestDataMap.set(b.id, {
          guests: b.guests || [],
          guestPassUsage: b.guestPassUsage || { free: 0, charged: 0 },
          referralCodes: b.referralCodes || [],
        });
      });
      console.log("Guest Data Map:", Array.from(guestDataMap.entries()));

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
          const time = formatTimeRange(b.starttime, b.endtime, b.start_str);
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

          const mongoGuestData = guestDataMap.get(b.id) || {
            guests: [],
            guestPassUsage: { free: 0, charged: 0 },
            referralCodes: [],
          };
          console.log(`Booking ID ${b.id} Guest Data:`, mongoGuestData);

          return {
            id: Number(b.id),
            date: formattedDate,
            time,
            location: clubName,
            bay: b.name || "Unknown",
            servicename,
            guests: mongoGuestData.guests,
            guestPassUsage: mongoGuestData.guestPassUsage,
            referralCodes: mongoGuestData.referralCodes,
            day: new Date(b.day).toLocaleDateString("en-US", {
              weekday: "long",
            }),
            starttime: b.starttime,
            rid: Number(b.resourceid || b.id),
            bookingstart: b.starttime,
            bookingend: b.endtime,
          };
        }) || [];

      console.log("Fetched Bookings:", fetchedBookings);
      setBookings((prev) =>
        fetchedBookings.map((newBooking) => {
          const existing = prev.find((b) => b.id === newBooking.id);
          return existing
            ? {
                ...newBooking,
                servicename: existing.servicename || newBooking.servicename,
                guestPassUsage:
                  existing.guestPassUsage || newBooking.guestPassUsage,
                referralCodes:
                  existing.referralCodes || newBooking.referralCodes,
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

  const handleDelete = async (id: number) => {
    setIsLoading(true);
    try {
      const booking = bookings.find((b) => b.id === id);
      if (!booking) throw new Error("Booking not found");

      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated");

      const decodedToken = JSON.parse(atob(token.split(".")[1]));
      const stableUserId = Number(decodedToken.id);
      console.log("Stable User ID in handleDelete:", stableUserId);

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

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      try {
        const guestData = await fetchGuestData(token);
        const updatedGuestBookingIds = guestData.guestBookingIds.filter(
          (bookingId: number) => bookingId !== id
        );
        const updatedGuestPassesUsed = Math.max(
          guestData.guestPassesUsed - (booking.guestPassUsage.free || 0),
          0
        );
        const updatedGuests = guestData.guests.filter(
          (guest: { name: string; email: string; date?: string }) =>
            !booking.guests.some(
              (g) =>
                g.email === guest.email &&
                g.name === guest.name &&
                g.date === guest.date
            )
        );
        const updatedReferralCodes = guestData.referralCodes.filter(
          (code: string) => !booking.referralCodes?.includes(code)
        );

        // Update GymMaster and MongoDB guest data
        await updateGuestData(
          token,
          updatedGuestPassesUsed,
          updatedReferralCodes,
          updatedGuestBookingIds,
          updatedGuests,
          guestData.purchasedGuestPasses // Preserve purchasedGuestPasses
        );

        // Update MongoDB guest data
        await fetch("/api/bookings/update-guest-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: stableUserId,
            guestPassesUsed: updatedGuestPassesUsed,
            referralCodes: updatedReferralCodes,
            guestBookingIds: updatedGuestBookingIds,
            guests: updatedGuests,
            purchasedGuestPasses: guestData.purchasedGuestPasses,
          }),
        });
      } catch (guestError) {
        console.warn(
          "Guest data update failed, but booking was cancelled:",
          guestError
        );
      }

      await deleteBooking(id, token);
      toast.success("Tee time canceled", {
        description: `Your tee time on ${booking.date} at ${booking.time} has been canceled.`,
      });
    } catch (error) {
      console.error("Delete Booking Error:", error);
      toast.error("Tee time canceled", {
        description: `Your tee time has been canceled.`,
      });
    } finally {
      setIsLoading(false);
      setDeleteBookingId(null);
    }
  };

  const selfBookings = bookings.filter((b) => b.guests.length === 0);
  const guestBookings = bookings.filter((b) => b.guests.length > 0);
  const sortedSelfBookings = [...selfBookings].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time.split(" - ")[0]}`);
    const dateB = new Date(`${b.date} ${b.time.split(" - ")[0]}`);
    return dateA.getTime() - dateB.getTime();
  });
  const sortedGuestBookings = [...guestBookings].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time.split(" - ")[0]}`);
    const dateB = new Date(`${b.date} ${b.time.split(" - ")[0]}`);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="space-y-4">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center text-foreground"
      >
        My Tee Times
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-5xl mx-auto bg-background"
      >
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            onClick={fetchBookings}
            disabled={isFetching}
            className=""
            aria-label="Refresh bookings"
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-foreground" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4 text-foreground" />
            )}
            Refresh
          </Button>
        </div>

        <Tabs
          defaultValue="self"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "self" | "guest")}
          className="w-full"
        >
          <TabsList className="grid w-full sm:w-64 grid-cols-2 mb-4">
            <TabsTrigger value="self">Self</TabsTrigger>
            <TabsTrigger value="guest">Guest</TabsTrigger>
          </TabsList>

          {/* Self Bookings Tab */}
          <TabsContent value="self">
            {isFetching ? (
              <div className="space-y-2">
                {Array(3)
                  .fill(null)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-muted animate-pulse rounded"
                    />
                  ))}
              </div>
            ) : sortedSelfBookings.length === 0 ? (
              <p className="text-center text-muted-foreground">
                You have no self-booked tee times.
              </p>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop Table */}
                <Table className="hidden sm:table w-full">
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-sm font-semibold text-foreground">
                        Date
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        Time
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        Location
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        Service
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        Bay
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSelfBookings.map((booking, index) => (
                      <motion.tr
                        key={booking.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="border-b border-input"
                      >
                        <TableCell className="text-sm text-foreground">
                          {booking.date}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {booking.time}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {booking.location}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {booking.servicename}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {booking.bay}
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
                                <DialogTitle className="text-foreground">
                                  Confirm Cancellation
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                  Are you sure you want to cancel the booking
                                  for {booking.date} at {booking.time}?
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
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>

                {/* Mobile Cards */}
                <div className="sm:hidden space-y-4">
                  {sortedSelfBookings.map((booking, index) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="border border-input rounded-lg p-4 shadow-md bg-background hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex flex-col items-start justify-start gap-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Date
                          </span>
                          <span className="text-sm text-foreground">
                            {booking.date}
                          </span>
                        </div>
                        <div className="flex flex-col items-start justify-start gap-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Time
                          </span>
                          <span className="text-sm text-foreground">
                            {booking.time}
                          </span>
                        </div>
                        <div className="flex flex-col items-start justify-start gap-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Location
                          </span>
                          <span className="text-sm text-foreground">
                            {booking.location}
                          </span>
                        </div>
                        <div className="flex flex-col items-start justify-start gap-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Service
                          </span>
                          <span className="text-sm text-foreground">
                            {booking.servicename}
                          </span>
                        </div>
                        <div className="flex flex-col items-start justify-start gap-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Bay
                          </span>
                          <span className="text-sm text-foreground">
                            {booking.bay}
                          </span>
                        </div>
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
                                aria-label={`Cancel tee time for ${booking.date} at ${booking.time}`}
                              >
                                Cancel
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="text-foreground">
                                  Confirm Cancellation
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                  Are you sure you want to cancel the booking
                                  for {booking.date} at {booking.time}?
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
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Guest Bookings Tab */}
          <TabsContent value="guest">
            {isFetching ? (
              <div className="space-y-2">
                {Array(3)
                  .fill(null)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-muted animate-pulse rounded"
                    />
                  ))}
              </div>
            ) : sortedGuestBookings.length === 0 ? (
              <p className="text-center text-muted-foreground">
                You have no guest-booked tee times.
              </p>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop Table */}
                <Table className="hidden sm:table w-full">
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-sm font-semibold text-foreground">
                        Date
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        Time
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        Location
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        Service
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        Bay
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        Guests
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        Guest Passes
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedGuestBookings.map((booking, index) => (
                      <motion.tr
                        key={booking.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="border-b border-input"
                      >
                        <TableCell className="text-sm text-foreground">
                          {booking.date}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {booking.time}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {booking.location}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {booking.servicename}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {booking.bay}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {booking.guests.length > 0
                            ? booking.guests
                                .map((g) => g.name || g.email)
                                .join(", ")
                            : "None"}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {booking.guestPassUsage.free > 0 ||
                          booking.guestPassUsage.charged > 0
                            ? `${booking.guestPassUsage.free} free, ${booking.guestPassUsage.charged} charged`
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
                                aria-label={`Cancel tee time for ${booking.date} at ${booking.time}`}
                              >
                                Cancel
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="text-foreground">
                                  Confirm Cancellation
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                  Are you sure you want to cancel the booking
                                  for {booking.date} at {booking.time}?
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
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>

                {/* Mobile Cards */}
                <div className="sm:hidden space-y-4">
                  {sortedGuestBookings.map((booking, index) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="border border-input rounded-lg p-4 shadow-md bg-background hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex flex-col items-start justify-start gap-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Date
                          </span>
                          <span className="text-sm text-foreground">
                            {booking.date}
                          </span>
                        </div>
                        <div className="flex flex-col items-start justify-start gap-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Time
                          </span>
                          <span className="text-sm text-foreground">
                            {booking.time}
                          </span>
                        </div>
                        <div className="flex flex-col items-start justify-start gap-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Location
                          </span>
                          <span className="text-sm text-foreground">
                            {booking.location}
                          </span>
                        </div>
                        <div className="flex flex-col items-start justify-start gap-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Service
                          </span>
                          <span className="text-sm text-foreground">
                            {booking.servicename}
                          </span>
                        </div>
                        <div className="flex flex-col items-start justify-start gap-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Bay
                          </span>
                          <span className="text-sm text-foreground">
                            {booking.bay}
                          </span>
                        </div>
                        <div className="flex flex-col items-start justify-start gap-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Guests
                          </span>
                          <span className="text-sm text-foreground">
                            {booking.guests.length > 0
                              ? booking.guests
                                  .map((g) => g.name || g.email)
                                  .join(", ")
                              : "None"}
                          </span>
                        </div>
                        <div className="flex flex-col items-start justify-start gap-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Guest Passes
                          </span>
                          <span className="text-sm text-foreground">
                            {booking.guestPassUsage.free > 0 ||
                            booking.guestPassUsage.charged > 0
                              ? `${booking.guestPassUsage.free} free, ${booking.guestPassUsage.charged} charged`
                              : "None"}
                          </span>
                        </div>
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
                                aria-label={`Cancel tee time for ${booking.date} at ${booking.time}`}
                              >
                                Cancel
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="text-foreground">
                                  Confirm Cancellation
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                  Are you sure you want to cancel the booking
                                  for {booking.date} at {booking.time}?
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
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
