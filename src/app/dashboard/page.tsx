/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, DoorOpen } from "lucide-react";
import Link from "next/link";
import { Booking, useBookings } from "@/context/BookingContext";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchOutstandingBalance,
  fetchMemberDetails,
  fetchGuestData,
} from "@/api/gymmaster";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import axios from "axios";

function SignupDialog({ memberName }: { memberName: string | null }) {
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const isNewSignup = searchParams.get("newSignup") === "true";
    if (isNewSignup) {
      setShowSuccessDialog(true);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("newSignup");
      router.replace(newUrl.pathname, { scroll: false });
    }
  }, [searchParams, router]);

  return (
    <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>
            <strong>Welcome, {memberName || "Member"}!</strong>
          </p>
          <p>Your membership is set.</p>
          <Button onClick={() => setShowSuccessDialog(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const { bookings, setBookings } = useBookings();
  const [accountStatus, setAccountStatus] = useState<
    "Payment Complete" | "Not Paid Yet" | "Unknown" | null
  >(null);
  const [owingAmount, setOwingAmount] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [recentInvites, setRecentInvites] = useState<
    { name: string; email: string; date?: string }[]
  >([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  const router = useRouter();
  const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 },
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        const balanceData = await fetchOutstandingBalance(token);
        const rawOwingAmount = balanceData.owingamount || "$0.00";
        setOwingAmount(rawOwingAmount);
        const parsedOwingAmount = parseFloat(
          rawOwingAmount.replace("$", "") || "0"
        );
        if (isNaN(parsedOwingAmount)) {
          console.warn("Invalid owingamount:", rawOwingAmount);
          setAccountStatus("Unknown");
        } else {
          setAccountStatus(
            parsedOwingAmount > 0 ? "Not Paid Yet" : "Payment Complete"
          );
        }

        const memberData = await fetchMemberDetails(token);
        setMemberName(`${memberData.firstname} ${memberData.surname}`);

        const guestData = await fetchGuestData(token);
        setRecentInvites(guestData.guests.slice(0, 2));

        // Fetch bookings
        const decodedToken = JSON.parse(atob(token.split(".")[1]));
        const stableUserId = Number(decodedToken.id);

        const [gymMasterResponse, mongoResponse] = await Promise.all([
          axios.get("/api/gymmaster/v2/member/bookings", {
            params: { api_key: GYMMASTER_API_KEY || "", token },
          }),
          fetch("/api/bookings/fetch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: stableUserId }),
          }).then((res) => res.json()),
        ]);

        const gymMasterBookings =
          gymMasterResponse.data.result?.servicebookings || [];
        const mongoBookings = mongoResponse.bookings || [];

        const updatedBookings = gymMasterBookings
          .filter((b: any) =>
            mongoBookings.some((mb: Booking) => mb.id === Number(b.id))
          )
          .map((b: any) => {
            const mongoBooking = mongoBookings.find(
              (mb: Booking) => mb.id === Number(b.id)
            );
            return {
              id: Number(b.id),
              date: b.day,
              time: mongoBooking?.time || b.starttime,
              location: b.location || mongoBooking?.location || "",
              bay: b.name,
              servicename: b.servicename,
              guests: mongoBooking?.guests || [],
              guestPassUsage: mongoBooking?.guestPassUsage || {
                free: 0,
                charged: 0,
              },
              guestPassCharge: mongoBooking?.guestPassCharge || 25,
              day:
                mongoBooking?.day ||
                new Date(b.day).toLocaleDateString("en-US", {
                  weekday: "long",
                }),
              starttime: b.starttime,
              referralCodes: mongoBooking?.referralCodes || [],
              rid: Number(b.resourceid),
              bookingstart: b.starttime,
              bookingend: b.endtime,
            };
          });

        setBookings(updatedBookings);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load dashboard data", {
          description: "Please try again later.",
        });
        setAccountStatus("Unknown");
      } finally {
        setIsLoadingBookings(false);
      }
    };

    fetchData();
  }, [router, setBookings]);

  return (
    <div className="space-y-4">
      <Suspense fallback={<div>Loading...</div>}>
        <SignupDialog memberName={memberName} />
      </Suspense>

      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center md:text-left"
      >
        {memberName ? `${memberName}'s Dashboard` : "Member Dashboard"}
      </motion.h1>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card
          className={
            accountStatus === "Not Paid Yet" ? "md:col-span-3" : "md:col-span-1"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />{" "}
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge
              variant={
                accountStatus === "Payment Complete" ? "default" : "destructive"
              }
              className="text-base sm:text-lg mb-2"
              aria-label={`Account status: ${accountStatus || "Loading"}`}
            >
              {accountStatus || "Loading"}
              {accountStatus === "Not Paid Yet" &&
                owingAmount &&
                ` - ${owingAmount}`}
            </Badge>
            {accountStatus === "Payment Complete" ? (
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    href: "/dashboard/open-door",
                    text: "Open the Door",
                    icon: DoorOpen,
                  },
                  { href: "/dashboard/my-account", text: "My Account" },
                  { href: "/dashboard/book-tee-time", text: "Book a Tee Time" },
                  { href: "/dashboard/my-tee-times", text: "My Tee Times" },
                  { href: "/dashboard/invite", text: "Invite New Member" },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Button
                      asChild
                      className="w-full justify-start"
                      variant={index > 0 ? "outline" : "default"}
                    >
                      <Link href={item.href}>
                        {item.icon && (
                          <item.icon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                        {item.text}
                      </Link>
                    </Button>
                  </motion.div>
                ))}
              </div>
            ) : accountStatus === "Not Paid Yet" ? (
              <div className="space-y-3">
                <p className="text-sm text-red-600">
                  You have an outstanding balance. Please update your payment
                  method to regain full access.
                </p>
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    asChild
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    <Link href="/dashboard/my-account">Pay Now</Link>
                  </Button>
                </motion.div>
              </div>
            ) : (
              <p className="text-gray-600 text-sm sm:text-base">
                Loading account status...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Show other cards only if payment is complete */}
        {accountStatus === "Payment Complete" && (
          <>
            {/* Upcoming Tee Times */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />{" "}
                  Upcoming Tee Times
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingBookings ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, index) => (
                      <div key={index} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : bookings.length > 0 ? (
                  <ul className="space-y-4">
                    {bookings
                      .sort(
                        (a, b) =>
                          new Date(a.bookingstart).getTime() -
                          new Date(b.bookingstart).getTime()
                      )
                      .slice(0, 3)
                      .map((teeTime, index) => (
                        <motion.li
                          key={teeTime.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="border-b pb-3 last:border-b-0"
                        >
                          <div className="flex flex-col gap-2 text-sm sm:text-base">
                            <div className="flex justify-between items-start">
                              <p className="font-semibold">
                                {new Date(teeTime.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}{" "}
                                at {teeTime.time}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {teeTime.servicename}
                              </Badge>
                            </div>
                            <p className="text-gray-600">
                              <span className="font-medium">Location:</span>{" "}
                              {teeTime.location} ({teeTime.bay})
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Day:</span>{" "}
                              {teeTime.day}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Time:</span>{" "}
                              {teeTime.bookingstart} - {teeTime.bookingend}
                            </p>
                            {teeTime.guests.length > 0 && (
                              <div className="text-gray-600">
                                <p className="font-medium">Guests:</p>
                                <ul className="list-disc pl-5 text-xs sm:text-sm">
                                  {teeTime.guests.map((guest, i) => (
                                    <li key={i}>
                                      {guest.name} ({guest.email})
                                      {guest.date &&
                                        `, ${new Date(guest.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <p className="text-gray-600">
                              <span className="font-medium">Guest Passes:</span>{" "}
                              {teeTime.guestPassUsage.free} Free,{" "}
                              {teeTime.guestPassUsage.charged} Charged
                              {teeTime.guestPassCharge > 0 &&
                                ` ($${teeTime.guestPassCharge})`}
                            </p>
                            {teeTime.referralCodes &&
                              teeTime.referralCodes.length > 0 && (
                                <p className="text-gray-600 text-xs sm:text-sm">
                                  <span className="font-medium">
                                    Referral Codes:
                                  </span>{" "}
                                  {teeTime.referralCodes.join(", ")}
                                </p>
                              )}
                            <p className="text-gray-600 text-xs sm:text-sm">
                              <span className="font-medium">Resource ID:</span>{" "}
                              {teeTime.rid}
                            </p>
                          </div>
                        </motion.li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 text-sm sm:text-base">
                    No upcoming tee times.
                  </p>
                )}
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="mt-2"
                >
                  <Button asChild variant="link" className="p-0">
                    <Link href="/dashboard/my-tee-times">View All</Link>
                  </Button>
                </motion.div>
              </CardContent>
            </Card>

            {/* Recent Invites */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />{" "}
                  Recent Invites
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentInvites.length > 0 ? (
                  <ul className="space-y-3">
                    {recentInvites.map((invite, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm sm:text-base">
                          {invite.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm sm:text-base">
                            {invite.name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {invite.email}
                          </p>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 text-sm sm:text-base">
                    No recent invites.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
