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
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Dashboard() {
  const accountStatus = "Good";
  const upcomingTeeTimes = [
    { id: 1, date: "2023-10-25", time: "9:00 AM", location: "Location 1" },
    { id: 2, date: "2023-10-26", time: "2:00 PM", location: "Location 2" },
  ];
  const guestPassesRemaining = 3;
  const totalGuestPasses = 5;

  // Mock data for charts
  const visitData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [
      {
        label: "Visits",
        data: [5, 8, 3, 6, 4],
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      },
    ],
  };

  const guestPassData = {
    labels: ["Used", "Remaining"],
    datasets: [
      {
        data: [totalGuestPasses - guestPassesRemaining, guestPassesRemaining],
        backgroundColor: ["rgba(255, 99, 132, 0.5)", "rgba(54, 162, 235, 0.5)"],
        borderColor: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 },
  };

  return (
    <div className="space-y-8">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl font-bold"
      >
        Welcome to Your Dashboard
      </motion.h1>

      {/* Account Status */}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge
            variant={accountStatus === "Good" ? "default" : "destructive"}
            className="text-lg"
          >
            {accountStatus}
          </Badge>
          {accountStatus === "Good" ? (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button asChild className="w-full">
                  <Link href="/dashboard/open-door">
                    <DoorOpen className="mr-2 h-4 w-4" /> Open the Door
                  </Link>
                </Button>
              </motion.div>
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/my-account">My Account</Link>
                </Button>
              </motion.div>
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/book-tee-time">Book a Tee Time</Link>
                </Button>
              </motion.div>
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/my-tee-times">My Tee Times</Link>
                </Button>
              </motion.div>
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/invite">Invite New Member</Link>
                </Button>
              </motion.div>
            </div>
          ) : (
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="mt-6"
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
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Upcoming Tee Times
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingTeeTimes.length > 0 ? (
            <ul className="space-y-4">
              {upcomingTeeTimes.map((teeTime) => (
                <motion.li
                  key={teeTime.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-4"
                >
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-semibold">
                      {teeTime.date} at {teeTime.time}
                    </p>
                    <p className="text-sm text-gray-600">{teeTime.location}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No upcoming tee times.</p>
          )}
          <motion.div
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            className="mt-4"
          >
            <Button asChild variant="link">
              <Link href="/dashboard/my-tee-times">View All</Link>
            </Button>
          </motion.div>
        </CardContent>
      </Card>

      {/* Infographics Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Weekly Visit Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Bar
              data={visitData}
              options={{
                responsive: true,
                plugins: { legend: { position: "top" } },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Guest Pass Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Doughnut
              data={guestPassData}
              options={{
                responsive: true,
                plugins: { legend: { position: "top" } },
              }}
            />
            <p className="mt-4 text-center text-sm text-gray-600">
              {guestPassesRemaining} of {totalGuestPasses} passes remaining
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
