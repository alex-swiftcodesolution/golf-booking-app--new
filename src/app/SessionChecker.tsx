"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SessionChecker() {
  const router = useRouter();

  const checkSession = () => {
    const tokenExpires = localStorage.getItem("tokenExpires");
    if (!tokenExpires || Date.now() > parseInt(tokenExpires, 10)) {
      toast.error("Session expired. Please log in again.", { duration: 5000 });
      localStorage.clear();
      document.cookie = "sessionExpired=; max-age=0; path=/";
      router.push("/");
    }
  };

  useEffect(() => {
    checkSession();
    const interval = setInterval(checkSession, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
