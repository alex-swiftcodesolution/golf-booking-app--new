"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation"; // Add useRouter for redirection
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Bluetooth } from "lucide-react";
import { motion } from "framer-motion";

const openDoorSchema = z.object({
  club: z.string().min(1, "Please select a club"),
});

export default function OpenDoor() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const router = useRouter(); // Initialize router for redirection

  const form = useForm<z.infer<typeof openDoorSchema>>({
    resolver: zodResolver(openDoorSchema),
    defaultValues: { club: "" },
  });

  const onSubmit = async (data: z.infer<typeof openDoorSchema>) => {
    setIsConnecting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsConnecting(false);

      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Door opened!", {
        description: `Access granted to ${data.club}`,
        icon: <Bluetooth className="h-4 w-4" />,
      });
      router.push("/dashboard"); // Redirect to dashboard on success
    } catch {
      toast.error("Failed to open door", {
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const accountStatus = "Good"; // Replace with API call in backend phase

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center md:text-left"
      >
        Open the Door
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-md mx-auto space-y-4 sm:space-y-6"
      >
        <div className="flex items-center justify-center space-x-2 text-blue-600">
          <Bluetooth
            className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse"
            aria-hidden="true"
          />
          <p className="text-sm sm:text-base">
            This feature uses Bluetooth to unlock the door
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="club"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    Choose a Club
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full sm:text-base">
                        <SelectValue placeholder="Choose a club" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="club1">Club 1</SelectItem>
                      <SelectItem value="club2">Club 2</SelectItem>
                      <SelectItem value="club3">Club 3</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="submit"
                className="w-full py-2.5 sm:py-3 text-lg sm:text-base"
                disabled={isLoading || isConnecting || accountStatus !== "Good"}
                aria-label="Open the door for the selected club"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : accountStatus !== "Good" ? (
                  "Account Status Not Good"
                ) : (
                  "Open Door"
                )}
              </Button>
            </motion.div>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
