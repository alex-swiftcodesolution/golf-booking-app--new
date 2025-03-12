"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

export default function Home() {
  const videoSrc = "/bg-video.mp4";

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover brightness-75"
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent"></div>
      </div>

      {/* Overlay Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center text-white px-4 sm:px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 sm:mb-10"
        >
          <Image
            src="/logo-white.png" // Updated to use the new logo
            alt="Simcoquitos 24/7 Golf Club Logo"
            width={400}
            height={400}
            className="object-contain w-32 sm:w-40 md:w-48 drop-shadow-md"
            priority
          />
        </motion.div>

        {/* Heading and Tagline */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-center mb-6 sm:mb-8"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2">
            Simcoquitos 24/7 Golf Club
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl font-medium">
            Your 24/7 Golfing Experience Starts Here
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-x-4 mb-6 sm:mb-8"
        >
          <Button
            asChild
            className="px-6 py-3 sm:px-5 sm:py-2.5 text-lg sm:text-base"
          >
            <Link href="/login">Login</Link>
          </Button>
        </motion.div>

        {/* Golf Ball Animation (Micro-Shenanigan) */}
        <motion.div
          animate={{
            y: [0, -10, 0],
            transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-12 h-12"
        >
          <Image
            src="/golf-ball.png"
            alt="Golf Ball"
            width={48}
            height={48}
            className="object-contain"
          />
        </motion.div>
      </div>

      {/* Features Section */}
    </div>
  );
}
