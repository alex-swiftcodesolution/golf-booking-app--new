"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Loader2, Copy } from "lucide-react"; // Add Copy icon
import { motion } from "framer-motion"; // For animations

const inviteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cell: z.string().min(10, "Please enter a valid phone number with area code"),
});

export default function Invite() {
  const [isLoading, setIsLoading] = useState(false);
  const referralCode = "REF12345"; // Mock referral code

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", cell: "" },
  });

  const onSubmit = async (data: z.infer<typeof inviteSchema>) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay
      toast.success("Invite sent!", {
        description: `SMS sent to ${data.cell} with signup link and code ${referralCode}`,
      });
      console.log("Invite data:", data);
      form.reset(); // Reset form after submission
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
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

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center"
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
              name="cell"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Cell</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+1-123-456-7890"
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

        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-100 rounded-lg">
          <p className="text-sm sm:text-base text-gray-700">
            Referral Code: <strong>{referralCode}</strong>
          </p>
          <Button
            variant="outline"
            className="mt-2 sm:mt-0 text-sm sm:text-base"
            onClick={handleCopyCode}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy Code
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
