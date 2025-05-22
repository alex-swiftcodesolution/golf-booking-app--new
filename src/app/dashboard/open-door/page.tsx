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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Bluetooth, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import {
  fetchOutstandingBalance,
  kioskCheckin,
  fetchMemberMemberships,
  fetchDoors,
  Door,
  getClubCoordinates,
  getUserLocation,
  calculateDistance,
  watchUserLocation,
  stopWatchingLocation,
  getCachedLocation,
} from "@/api/gymmaster";

const openDoorSchema = z.object({
  door: z.string().min(1, "Please select an entry point"),
});

export default function OpenDoor() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessibleDoors, setAccessibleDoors] = useState<Door[]>([]);
  const [accountStatus, setAccountStatus] = useState<
    "Good" | "Bad" | "Unknown" | null
  >(null);
  const [locationStatus, setLocationStatus] = useState<
    "Idle" | "Fetching" | "Retrieved" | "Failed"
  >("Idle");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distanceToClub, setDistanceToClub] = useState<number | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof openDoorSchema>>({
    resolver: zodResolver(openDoorSchema),
    defaultValues: { door: "" },
  });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/");
      return;
    }

    const initializeData = async () => {
      setLoading(true);
      try {
        const doorData = await fetchDoors();
        const memberships = await fetchMemberMemberships(token);
        const activeMemberships = memberships.filter(
          (m) => m.enddate === "Open Ended" || new Date(m.enddate) > new Date()
        );
        const companyIds = activeMemberships
          .map((m) => m.companyid)
          .filter((id): id is number => id !== undefined);

        const accessible = doorData.filter((door) => {
          const hasMembership =
            companyIds.length > 0 ? companyIds.includes(door.companyid) : true;
          const isActive = door.status === 1;
          return hasMembership && isActive;
        });
        setAccessibleDoors(accessible.length > 0 ? accessible : []);

        const balanceData = await fetchOutstandingBalance(token);
        const owingAmount = parseFloat(balanceData.owingamount);
        setAccountStatus(owingAmount > 0 ? "Bad" : "Good");

        // Check for cached location
        const cachedLocation = getCachedLocation();
        if (cachedLocation) {
          setUserLocation(cachedLocation);
          setLocationStatus("Retrieved");
          updateDistance(cachedLocation, accessible[0]?.companyid);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        toast.error("Initialization failed", {
          description: "Unable to load entry points or account data.",
        });
        setAccessibleDoors([]);
        setAccountStatus("Unknown");
      } finally {
        setLoading(false);
      }
    };

    initializeData();

    return () => {
      if (watchId !== null) {
        stopWatchingLocation(watchId);
      }
    };
  }, [router, watchId]);

  const updateDistance = (
    location: { latitude: number; longitude: number },
    companyId?: number
  ) => {
    if (!companyId) return;
    const clubCoords = getClubCoordinates(companyId);
    if (clubCoords) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        clubCoords.latitude,
        clubCoords.longitude
      );
      setDistanceToClub(distance);
    }
  };

  const handleLocationRequest = async () => {
    setLocationStatus("Fetching");
    try {
      const location = await getUserLocation();
      setUserLocation(location);
      setLocationStatus("Retrieved");
      updateDistance(location, accessibleDoors[0]?.companyid);
      toast.success("Location retrieved!", {
        description: `Latitude: ${location.latitude.toFixed(4)}, Longitude: ${location.longitude.toFixed(4)}`,
      });

      // Start watching for real-time updates
      if (watchId === null) {
        const id = watchUserLocation((newLocation) => {
          setUserLocation(newLocation);
          updateDistance(newLocation, accessibleDoors[0]?.companyid);
        });
        setWatchId(id);
      }
    } catch (error) {
      setLocationStatus("Failed");
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch location.";
      toast.error("Location Error", {
        description: errorMessage,
      });
    }
  };

  const validateGeolocation = async (companyId: number): Promise<boolean> => {
    const clubCoords = getClubCoordinates(companyId);
    if (!clubCoords) {
      console.warn("Club coordinates not found for companyId:", companyId);
      toast.error("Location Error", {
        description: "Club location data unavailable. Contact support.",
      });
      return false;
    }

    if (!userLocation) {
      toast.error("Location Required", {
        description: "Please fetch your location first.",
      });
      return false;
    }

    try {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        clubCoords.latitude,
        clubCoords.longitude
      );
      setDistanceToClub(distance);

      if (distance > 100) {
        toast.error("Failed to check in", {
          description: `You are ${distance.toFixed(0)} meters from the club. Must be within 100 meters.`,
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error("Geolocation validation error:", error);
      toast.error("Location Error", {
        description: "Unable to verify your location. Please try again.",
      });
      return false;
    }
  };

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
      const selectedDoor = accessibleDoors.find(
        (d) => d.id.toString() === data.door
      );
      if (!selectedDoor)
        throw new Error("Selected entry point is not accessible");

      const isNearClub = await validateGeolocation(selectedDoor.companyid);
      if (!isNearClub) {
        throw new Error("Must be near club to open door.");
      }

      const response = await kioskCheckin(token, selectedDoor.id);
      if (response.response.access_state === 1) {
        toast.success("Entry granted!", {
          description: `Checked in at ${selectedDoor.name}`,
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
          <p className="text-sm sm:text-base">
            Check in to your selected entry point
          </p>
        </div>

        <div className="flex items-center justify-center space-x-2">
          <MapPin
            className={`h-5 w-5 sm:h-6 sm:w-6 ${
              locationStatus === "Retrieved"
                ? "text-green-600"
                : locationStatus === "Failed"
                  ? "text-red-600"
                  : "text-gray-600"
            }`}
            aria-hidden="true"
          />
          <p className="text-sm sm:text-base">
            {locationStatus === "Retrieved"
              ? distanceToClub !== null
                ? `Location retrieved (${distanceToClub.toFixed(0)} meters from club)`
                : "Location retrieved"
              : locationStatus === "Fetching"
                ? "Fetching location..."
                : locationStatus === "Failed"
                  ? "Location unavailable"
                  : "Location not fetched"}
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleLocationRequest}
            className="w-full py-2.5 sm:py-3 text-sm sm:text-base"
            disabled={
              locationStatus === "Fetching" || isCheckingIn || isLoading
            }
            aria-label="Fetch your current location"
          >
            {locationStatus === "Fetching" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching Location...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Get My Location
              </>
            )}
          </Button>
        </motion.div>

        {accountStatus === "Bad" && (
          <p className="text-red-600 text-sm sm:text-base text-center">
            Please settle your outstanding balance to check in.
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
            <p className="text-sm sm:text-base text-gray-600">
              Loading entry points...
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="door"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Choose an Entry Point
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (userLocation && accessibleDoors.length > 0) {
                          const selectedDoor = accessibleDoors.find(
                            (d) => d.id.toString() === value
                          );
                          updateDistance(userLocation, selectedDoor?.companyid);
                        }
                      }}
                      defaultValue={field.value}
                      disabled={
                        accessibleDoors.length === 0 ||
                        isLoading ||
                        isCheckingIn ||
                        locationStatus !== "Retrieved"
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full sm:text-base">
                          <SelectValue placeholder="Choose an entry point" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accessibleDoors.map((door) => (
                          <SelectItem key={door.id} value={door.id.toString()}>
                            {door.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs sm:text-sm" />
                  </FormItem>
                )}
              />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  type="submit"
                  className="w-full py-2.5 sm:py-3 text-lg sm:text-base"
                  disabled={
                    isLoading ||
                    isCheckingIn ||
                    loading ||
                    accountStatus === null ||
                    accountStatus === "Bad" ||
                    accountStatus === "Unknown" ||
                    accessibleDoors.length === 0 ||
                    locationStatus !== "Retrieved"
                  }
                  aria-label="Check in to the selected entry point"
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
                  ) : accessibleDoors.length === 0 ? (
                    "No Accessible Entry Points"
                  ) : locationStatus !== "Retrieved" ? (
                    "Fetch Location First"
                  ) : (
                    "Open Door"
                  )}
                </Button>
              </motion.div>
            </form>
          </Form>
        )}
      </motion.div>
    </div>
  );
}
