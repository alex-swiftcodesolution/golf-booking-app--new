"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, DoorOpen } from "lucide-react";
import Link from "next/link";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const accountStatus = "Good"; // Mock status
  const upcomingTeeTimes = [
    { id: 1, date: "2023-10-25", time: "9:00 AM", location: "Location 1" },
    { id: 2, date: "2023-10-26", time: "2:00 PM", location: "Location 2" },
  ]; // Mock data
  const guestPassesRemaining = 3; // Mock data
  const totalGuestPasses = 5; // Mock data
  const recentInvites = [
    { name: "Jane Doe", email: "jane@example.com", date: "2023-10-24" },
    { name: "John Smith", email: "john@example.com", date: "2023-10-23" },
  ]; // Mock data

  // Mock data for charts
  const bookingData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        label: "Tee Times Booked",
        data: [2, 4, 1, 3],
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgba(29, 78, 216, 1)",
        borderWidth: 1,
      },
    ],
  };

  const guestPassData = {
    labels: ["Used", "Remaining"],
    datasets: [
      {
        data: [totalGuestPasses - guestPassesRemaining, guestPassesRemaining],
        backgroundColor: ["rgba(220, 38, 38, 0.7)", "rgba(14, 165, 233, 0.7)"],
        borderColor: ["rgba(220, 38, 38, 1)", "rgba(14, 165, 233, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 },
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center md:text-left"
      >
        Member Dashboard
      </motion.h1>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Account Status */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" /> Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge
              variant={accountStatus === "Good" ? "default" : "destructive"}
              className="text-base sm:text-lg mb-2"
            >
              {accountStatus}
            </Badge>
            {accountStatus === "Good" ? (
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
            ) : (
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className="mt-2"
              >
                <Button asChild className="w-full">
                  <Link href="/dashboard/my-account">Update Payment</Link>
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tee Times */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6" /> Upcoming Tee Times
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingTeeTimes.length > 0 ? (
              <ul className="space-y-3">
                {upcomingTeeTimes.map((teeTime, index) => (
                  <motion.li
                    key={teeTime.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    <div>
                      <p className="font-semibold text-sm sm:text-base">
                        {teeTime.date} at {teeTime.time}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {teeTime.location}
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

        {/* Booking Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6" /> Booking Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-56">
              <Bar
                data={bookingData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "top" },
                    title: { display: false },
                  },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Guest Passes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" /> Guest Passes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-56 flex items-center justify-center">
              <Doughnut
                data={guestPassData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "top" },
                    title: { display: false },
                  },
                }}
              />
            </div>
            <p className="mt-2 text-center text-sm sm:text-base text-gray-600">
              {guestPassesRemaining} of {totalGuestPasses} passes remaining
            </p>
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="mt-2"
            >
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/book-tee-time">Use a Pass</Link>
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        {/* Recent Invites */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" /> Recent Invites
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
      </div>
    </div>
  );
}
