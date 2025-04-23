"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { storeReferralCode } from "@/api/gymmaster";
import { v4 as uuidv4 } from "uuid";

const inviteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

export default function Invite() {
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "" },
  });

  // Check authentication status
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const memberId = localStorage.getItem("memberId");
    const tokenExpires = localStorage.getItem("tokenExpires");
    const isValid =
      token && memberId && tokenExpires && Number(tokenExpires) > Date.now();
    setIsAuthenticated(isValid);
    if (!isValid) {
      toast.error("Please log in to send invites");
      router.push("/");
    }
  }, [router]);

  const onSubmit = async (data: z.infer<typeof inviteSchema>) => {
    if (!isAuthenticated) {
      toast.error("Please log in to send invites");
      router.push("/");
      return;
    }

    setIsLoading(true);
    try {
      // Generate unique referral code
      const newReferralCode = `REF-${uuidv4().slice(0, 8).toUpperCase()}`;
      setReferralCode(newReferralCode);

      // Store referral code
      const memberId = localStorage.getItem("memberId")!;
      const token = localStorage.getItem("authToken")!;
      await storeReferralCode(newReferralCode, memberId, token);

      // Send email with referral link
      const referralLink = `http://localhost:3000/?referral=${newReferralCode}`;
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: data.email,
          name: data.name,
          referralCode: newReferralCode,
          referralLink,
        }),
      });

      if (!response.ok) throw new Error("Failed to send email");

      toast.success("Invite sent!", {
        description: `${data.name} will receive an email with your referral link!`,
      });
      form.reset();
    } catch (error) {
      console.error("Invite error:", error);
      toast.error("Failed to send invite", { description: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!referralCode) {
      toast.error("No referral code generated yet");
      return;
    }
    navigator.clipboard
      .writeText(referralCode)
      .then(() => {
        toast.success("Referral code copied!", {
          description: `${referralCode} is ready to share`,
        });
      })
      .catch(() => {
        toast.error("Failed to copy referral code");
      });
  };

  if (!isAuthenticated) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center md:text-left"
      >
        Invite a New Member
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-md mx-auto space-y-6 sm:space-y-8"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Jane Doe"
                      {...field}
                      className="text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="jane@example.com"
                      type="email"
                      {...field}
                      className="text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="submit"
                className="w-full py-2.5 sm:py-3 text-lg sm:text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Send Invite"
                )}
              </Button>
            </motion.div>
          </form>
        </Form>

        {referralCode && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-100 rounded-lg">
            <p className="text-sm sm:text-base text-gray-700">
              Referral Code: <strong>{referralCode}</strong>
            </p>
            <Button
              variant="outline"
              className="mt-2 sm:mt-0 text-sm sm:text-base"
              onClick={handleCopyCode}
              aria-label="Copy referral code to clipboard"
            >
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" /> Copy Code
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
