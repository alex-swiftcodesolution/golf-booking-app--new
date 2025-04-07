"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
import {
  fetchCompanies,
  fetchOutstandingBalance,
  kioskCheckin,
  fetchMemberMemberships,
  fetchDoors,
  Club,
  Door,
} from "@/api/gymmaster";

const openDoorSchema = z.object({
  club: z.string().min(1, "Please select a club"),
});

export default function OpenDoor() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [doors, setDoors] = useState<Door[]>([]);
  const [accessibleClubs, setAccessibleClubs] = useState<Club[]>([]);
  const [accountStatus, setAccountStatus] = useState<
    "Good" | "Bad" | "Unknown" | null
  >(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof openDoorSchema>>({
    resolver: zodResolver(openDoorSchema),
    defaultValues: { club: "" },
  });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/");
      return;
    }

    const initializeData = async () => {
      console.log(clubs);
      try {
        const [clubData, doorData] = await Promise.all([
          fetchCompanies(),
          fetchDoors(),
        ]);
        setClubs(clubData);
        setDoors(doorData);

        const memberships = await fetchMemberMemberships(token);
        const activeMemberships = memberships.filter(
          (m) => m.enddate === "Open Ended" || new Date(m.enddate) > new Date()
        );
        const companyIds = activeMemberships
          .map((m) => m.companyid)
          .filter((id): id is number => id !== undefined);

        const accessible = clubData.filter((club) => {
          const hasMembership =
            companyIds.length > 0 ? companyIds.includes(club.id) : true;
          const hasDoor = doorData.some(
            (door) => door.companyid === club.id && door.status === 1
          );
          return hasMembership && hasDoor;
        });
        setAccessibleClubs(accessible.length > 0 ? accessible : []);

        const balanceData = await fetchOutstandingBalance(token);
        const owingAmount = parseFloat(balanceData.owingamount);
        setAccountStatus(owingAmount > 0 ? "Bad" : "Good");
      } catch (error) {
        console.error("Initialization error:", error);
        toast.error("Initialization failed", {
          description: "Unable to load club or entry data. Please try again.",
        });
        setAccessibleClubs([]);
        setAccountStatus("Unknown");
      }
    };

    initializeData();
  }, [router]);

  const onSubmit = async (data: z.infer<typeof openDoorSchema>) => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/");
      return;
    }

    setIsCheckingIn(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay
      setIsCheckingIn(false);

      setIsLoading(true);
      const selectedClub = accessibleClubs.find(
        (c) => c.id.toString() === data.club
      );
      if (!selectedClub) throw new Error("Selected club is not accessible");

      const door = doors.find(
        (d) => d.companyid === selectedClub.id && d.status === 1
      );
      if (!door) throw new Error("No active entry point found for this club");

      const response = await kioskCheckin(token, door.id);
      if (response.response.access_state === 1) {
        toast.success("Entry granted!", {
          description: `Checked in to ${selectedClub.name}`,
          icon: <Bluetooth className="h-4 w-4" />,
        });
        router.push("/dashboard");
      } else {
        throw new Error(
          response.response.denied_reason || "Check-in denied by facility"
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error("Failed to check in", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          <p className="text-sm sm:text-base">Check in to your selected club</p>
        </div>

        {accountStatus === "Bad" && (
          <p className="text-red-600 text-sm sm:text-base text-center">
            Please settle your outstanding balance to check in.
          </p>
        )}

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
                    disabled={accessibleClubs.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full sm:text-base">
                        <SelectValue placeholder="Choose a club" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accessibleClubs.map((club) => (
                        <SelectItem key={club.id} value={club.id.toString()}>
                          {club.name}
                        </SelectItem>
                      ))}
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
                disabled={
                  isLoading ||
                  isCheckingIn ||
                  accountStatus === null ||
                  accountStatus === "Bad" ||
                  accountStatus === "Unknown" ||
                  accessibleClubs.length === 0
                }
                aria-label="Check in to the selected club"
              >
                {isCheckingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking In...
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : accountStatus === "Bad" ? (
                  "Outstanding Balance"
                ) : accountStatus === "Unknown" ? (
                  "Checking Status..."
                ) : accessibleClubs.length === 0 ? (
                  "No Accessible Clubs"
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
