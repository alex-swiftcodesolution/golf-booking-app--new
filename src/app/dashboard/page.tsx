"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, DoorOpen } from "lucide-react";
import Link from "next/link";
import { useBookings } from "@/context/BookingContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  fetchOutstandingBalance,
  fetchMemberDetails,
  fetchGuestData,
} from "@/api/gymmaster";
import { toast } from "sonner";

export default function Dashboard() {
  const { bookings } = useBookings();
  const [accountStatus, setAccountStatus] = useState<
    "Payment Complete" | "Not Paid Yet" | "Unknown" | null
  >(null);
  const [owingAmount, setOwingAmount] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [recentInvites, setRecentInvites] = useState<
    { name: string; email: string; date?: string }[]
  >([]);
  const router = useRouter();

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
        // Fetch outstanding balance
        const balanceData = await fetchOutstandingBalance(token);
        console.log("Balance Data:", balanceData);
        const rawOwingAmount = balanceData.owingamount || "$0.00";
        setOwingAmount(rawOwingAmount);
        const parsedOwingAmount = parseFloat(
          rawOwingAmount.replace("$", "") || "0"
        );
        console.log("Parsed Owing Amount:", parsedOwingAmount);
        if (isNaN(parsedOwingAmount)) {
          console.warn("Invalid owingamount:", rawOwingAmount);
          setAccountStatus("Unknown");
        } else {
          setAccountStatus(
            parsedOwingAmount > 0 ? "Not Paid Yet" : "Payment Complete"
          );
        }

        // Fetch member details
        const memberData = await fetchMemberDetails(token);
        setMemberName(`${memberData.firstname} ${memberData.surname}`);

        // Fetch recent invites
        const guestData = await fetchGuestData(token);
        setRecentInvites(guestData.guests.slice(0, 2));
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load dashboard data", {
          description: "Please try again later.",
        });
        setAccountStatus("Unknown");
      }
    };

    fetchData();
  }, [router]);

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
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
              <CardContent className="space-y-3">
                {bookings.length > 0 ? (
                  <ul className="space-y-3">
                    {bookings.slice(0, 5).map((teeTime, index) => (
                      <motion.li
                        key={teeTime.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <Clock
                          className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="font-semibold text-sm sm:text-base">
                            {teeTime.date} at {teeTime.time}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {teeTime.location} ({teeTime.bay})
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
