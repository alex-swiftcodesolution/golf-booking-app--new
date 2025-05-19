// src/app/dashboard/layout.tsx
"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image"; // Import Image component from Next.js
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { BookingProvider } from "@/context/BookingContext";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const expires = localStorage.getItem("tokenExpires");

    if (!token || (expires && Date.now() > parseInt(expires))) {
      localStorage.clear();
      router.push("/");
    }
  }, [router]);

  const handleLogout = () => {
    // localStorage.clear();
    localStorage.removeItem("authToken");
    localStorage.removeItem("tokenExpires");
    localStorage.removeItem("deviceFingerprint");
    router.push("/");
  };

  // Initialize based on screen size
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768; // Open on desktop/tablet, closed on mobile
    }
    return false; // Default for SSR
  });

  // Close sidebar on route change or click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector("aside");
      const toggleButton = document.querySelector(
        "button[aria-label='toggle-menu']"
      );
      if (
        isMobileMenuOpen &&
        sidebar &&
        !sidebar.contains(event.target as Node) &&
        !toggleButton?.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  // Close sidebar on navigation for mobile only
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(false);
    }
  }, [pathname]);

  // Handle resize to ensure sidebar stays open on desktop/tablet
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(true);
      }
    };
    handleResize(); // Initial call
    window.addEventListener("resize", handleResize);
    // return () => window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <BookingProvider>
      <div className="flex min-h-screen bg-gray-100">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-md transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
        >
          <div className="p-4 h-full flex flex-col justify-between">
            <div>
              {/* Client Logo */}
              <div className="mb-6 flex justify-center">
                <Image
                  src="/logo.png"
                  alt="Simcognito's 24/7 golf club logo"
                  width={150} // Base width
                  height={50} // Adjust height based on logo aspect ratio
                  className="w-36 h-auto" // Fixed width within sidebar, maintaining aspect ratio
                />
              </div>
              <nav className="mt-6 space-y-2">
                <Link
                  href="/dashboard"
                  className={`block rounded-md p-2 text-sm hover:bg-gray-100 ${
                    pathname === "/dashboard" ? "bg-gray-200 font-medium" : ""
                  }`}
                  aria-current={pathname === "/dashboard" ? "page" : undefined}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/open-door"
                  className={`block rounded-md p-2 text-sm hover:bg-gray-100 ${
                    pathname === "/dashboard/open-door"
                      ? "bg-gray-200 font-medium"
                      : ""
                  }`}
                  aria-current={
                    pathname === "/dashboard/open-door" ? "page" : undefined
                  }
                >
                  Open the Door
                </Link>
                <Link
                  href="/dashboard/my-account"
                  className={`block rounded-md p-2 text-sm hover:bg-gray-100 ${
                    pathname === "/dashboard/my-account"
                      ? "bg-gray-200 font-medium"
                      : ""
                  }`}
                  aria-current={
                    pathname === "/dashboard/my-account" ? "page" : undefined
                  }
                >
                  My Account
                </Link>
                <Link
                  href="/dashboard/book-tee-time"
                  className={`block rounded-md p-2 text-sm hover:bg-gray-100 ${
                    pathname === "/dashboard/book-tee-time"
                      ? "bg-gray-200 font-medium"
                      : ""
                  }`}
                  aria-current={
                    pathname === "/dashboard/book-tee-time" ? "page" : undefined
                  }
                >
                  Book a Tee Time
                </Link>
                <Link
                  href="/dashboard/my-tee-times"
                  className={`block rounded-md p-2 text-sm hover:bg-gray-100 ${
                    pathname === "/dashboard/my-tee-times"
                      ? "bg-gray-200 font-medium"
                      : ""
                  }`}
                  aria-current={
                    pathname === "/dashboard/my-tee-times" ? "page" : undefined
                  }
                >
                  My Tee Times
                </Link>
                <Link
                  href="/dashboard/invite"
                  className={`block rounded-md p-2 text-sm hover:bg-gray-100 ${
                    pathname === "/dashboard/invite"
                      ? "bg-gray-200 font-medium"
                      : ""
                  }`}
                  aria-current={
                    pathname === "/dashboard/invite" ? "page" : undefined
                  }
                >
                  Invite New Member
                </Link>
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <header className="fixed top-0 left-0 w-full z-40 bg-white shadow-md p-4 sm:p-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="toggle-menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
            <h1 className="text-xs font-semibold sm:text-xs flex-1 text-center md:text-left text-blue-600">
              .
            </h1>
            <Button
              variant="outline"
              className="sm:text-sm"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </header>

          <main
            className="flex-1 p-6 sm:p-4 mt-0 md:ml-64"
            style={{ paddingTop: "64px" }}
          >
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
    </BookingProvider>
  );
}
