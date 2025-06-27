// app/SessionChecker.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SessionChecker() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = () => {
      const tokenExpires = localStorage.getItem("tokenExpires");
      const sessionExpiredCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("sessionExpired="));

      if (tokenExpires && Date.now() > parseInt(tokenExpires, 10)) {
        toast.error("Session expired. Please log in again.", {
          duration: 30000,
        });
        localStorage.removeItem("authToken");
        localStorage.removeItem("memberId");
        localStorage.removeItem("tokenExpires");
        localStorage.removeItem("deviceFingerprint");
        document.cookie = "sessionExpired=; max-age=0; path=/";
        router.push("/");
      } else if (sessionExpiredCookie) {
        toast.error("Session expired. Please log in again.", {
          duration: 30000,
        });
        localStorage.removeItem("authToken");
        localStorage.removeItem("memberId");
        localStorage.removeItem("tokenExpires");
        localStorage.removeItem("deviceFingerprint");
        document.cookie = "sessionExpired=; max-age=0; path=/";
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 60000); // Check every 60 seconds
    return () => clearInterval(interval);
  }, [router]);

  return null; // No UI, just logic
}
