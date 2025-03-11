"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 sm:px-6">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8 sm:mb-10"
      >
        <Image
          src="/logo.png"
          alt="Simcoquitos 24/7 Golf Club Logo"
          width={400} // Updated to match typical logo size (adjust if needed)
          height={400}
          className="object-contain w-32 sm:w-40 md:w-48 drop-shadow-md" // Responsive width and shadow
          priority
        />
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-6 sm:mb-8"
      >
        <span className="block text-2xl sm:text-3xl md:text-4xl font-semibold">
          Welcome to
        </span>
        <span className="block text-4xl sm:text-5xl md:text-6xl font-bold mt-2">
          Simcoquitos 24/7 Golf Club
        </span>
      </motion.h1>

      {/* Login Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Button
          asChild
          className="px-6 py-3 sm:px-5 sm:py-2.5 text-lg sm:text-base min-w-[120px] sm:min-w-[100px]"
        >
          <Link href="/login">Login</Link>
        </Button>
      </motion.div>

      {/* Demo Link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-6 sm:mt-8 text-sm sm:text-base"
      >
        <Link href="/demo" className="text-blue-600 hover:underline">
          View Demo
        </Link>
      </motion.p>
    </div>
  );
}
