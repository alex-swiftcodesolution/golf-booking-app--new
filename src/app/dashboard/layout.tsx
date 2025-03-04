"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation"; // Add this
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname(); // Track current route

  // Close sidebar on route change
  useEffect(() => {
    setIsMobileMenuOpen(false); // Close sidebar when pathname changes
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside
        className={`fixed inset-y-0 left-0 z-10 w-64 bg-white shadow-md transform transition-transform duration-300 md:relative md:w-64 ${
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
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
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-white p-4 shadow-md w-full top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold">Club Membership</h1>
          <Button asChild>
            <Link href="/login">Logout</Link>
          </Button>
        </header>

        <main className="flex-1 p-6 mt-16 md:mt-0">
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
