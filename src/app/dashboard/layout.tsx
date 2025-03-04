"use client"; // Required for client-side interactivity
import { useState, useEffect } from "react"; // Add useEffect
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react"; // For hamburger icon
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Set sidebar open by default on desktop (md and larger screens)
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    typeof window !== "undefined" && window.innerWidth >= 768
  );

  // Handle window resize to update sidebar state
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarVariants = {
    open: { x: 0, transition: { duration: 0.3 } },
    closed: { x: "-100%", transition: { duration: 0.3 } },
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <motion.aside
        initial={isSidebarOpen ? "open" : "closed"}
        animate={isSidebarOpen ? "open" : "closed"}
        variants={sidebarVariants}
        className="fixed inset-y-0 left-0 w-64 bg-white shadow-md md:relative md:w-64"
      >
        <div className="p-4">
          <h2 className="text-xl font-bold">Club App</h2>
          <nav className="mt-6 space-y-2">
            <Link
              href="/dashboard"
              className="block rounded-md p-2 hover:bg-gray-100"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/open-door"
              className="block rounded-md p-2 hover:bg-gray-100"
            >
              Open the Door
            </Link>
            <Link
              href="/dashboard/my-account"
              className="block rounded-md p-2 hover:bg-gray-100"
            >
              My Account
            </Link>
            <Link
              href="/dashboard/book-tee-time"
              className="block rounded-md p-2 hover:bg-gray-100"
            >
              Book a Tee Time
            </Link>
            <Link
              href="/dashboard/my-tee-times"
              className="block rounded-md p-2 hover:bg-gray-100"
            >
              My Tee Times
            </Link>
            <Link
              href="/dashboard/invite"
              className="block rounded-md p-2 hover:bg-gray-100"
            >
              Invite New Member
            </Link>
          </nav>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <header className="flex items-center justify-between bg-white p-4 shadow-md">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold">Club Membership</h1>
          <Button asChild>
            <Link href="/login">Logout</Link>
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
