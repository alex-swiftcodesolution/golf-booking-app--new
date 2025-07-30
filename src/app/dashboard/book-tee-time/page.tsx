/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { useState, useEffect, useCallback } from "react";
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
import { Loader2, Calendar, Users, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { useBookings } from "@/context/BookingContext";
import {
  fetchClubs,
  fetchResourcesAndSessions,
  fetchServices,
  fetchMemberMemberships,
  fetchGuestData,
  updateGuestData,
  fetchMemberDetails,
  updateMemberProfile,
  fetchMemberBenefitBalances,
  logGuestPassCharge,
} from "@/api/gymmaster";
import { Club, Resource, Service, MemberMembership } from "@/lib/types";
import { useRouter } from "next/navigation";
import { generateReferralCode } from "@/lib/utils";
import { debounce } from "lodash";

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://test-swiftcode.vercel.app/";

const teeTimeSchema = z.object({
  location: z.string().min(1, "Please select a location"),
  service: z.string().min(1, "Please select a service"),
  date: z.string().min(1, "Please select a date"),
  timeSlot: z
    .object({
      rid: z.number(),
      bookingstart: z.string(),
      bookingend: z.string(),
      start_str: z.string(),
      end_str: z.string(),
      rname: z.string(),
    })
    .nullable(),
  guests: z
    .array(
      z.object({
        name: z.string().optional(),
        email: z.string().email("Please enter a valid email").optional(),
      })
    )
    .optional(),
});

export default function BookTeeTime() {
  const [isLoading, setIsLoading] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null
  );
  const [selectedBenefitId, setSelectedBenefitId] = useState<number | null>(
    null
  );
  const [membership, setMembership] = useState<MemberMembership | null>(null);
  const [isFetchingClubs, setIsFetchingClubs] = useState(false);
  const [isFetchingServices, setIsFetchingServices] = useState(false);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [hasFetchedClubs, setHasFetchedClubs] = useState(false);
  const [guestPassesUsed, setGuestPassesUsed] = useState(0);
  const [availableGuestPasses, setAvailableGuestPasses] = useState<number>(0);
  const [guestPassCharge, setGuestPassCharge] = useState<number>(25); // Default to 25
  const [referralCodes, setReferralCodes] = useState<string[]>([]);
  const [guestBookingIds, setGuestBookingIds] = useState<number[]>([]);
  const [showChargeConfirmation, setShowChargeConfirmation] = useState(false);
  const [pendingGuestCount, setPendingGuestCount] = useState<number | null>(
    null
  );
  const { addBooking } = useBookings();
  const router = useRouter();

  const form = useForm<z.infer<typeof teeTimeSchema>>({
    resolver: zodResolver(teeTimeSchema),
    defaultValues: {
      location: "",
      service: "",
      date: "",
      timeSlot: null,
      guests: [],
    },
  });

  const { location, service, date } = form.watch();

  const sendBookingConfirmationEmail = async (
    email: string,
    data: z.infer<typeof teeTimeSchema>,
    bookingIds: number[],
    availableGuestPasses: number,
    guestPassesUsed: number,
    guestPassCharge: number
  ) => {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailType: "booking",
          to: email,
          date: data.date,
          location: data.location,
          service: data.service,
          timeSlots: data.timeSlot
            ? [{ time: data.timeSlot.start_str, bay: data.timeSlot.rname }]
            : [],
          guests: data.guests || [],
          bookingIds,
          availableGuestPasses,
          guestPassesUsed,
          guestPassCharge,
        }),
      });
      if (!response.ok) throw new Error("Failed to send confirmation email");
      toast.info("Confirmation email sent", {
        description: `A confirmation email was sent to ${email}`,
      });
    } catch (error) {
      console.error("Send confirmation email error:", error);
      toast.error("Failed to send confirmation email");
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem("authToken");
      const tokenExpires = localStorage.getItem("tokenExpires");

      if (!token || !tokenExpires || Date.now() > Number(tokenExpires)) {
        toast.error("Please log in");
        router.push("/");
        return;
      }

      if (hasFetchedClubs) return;

      try {
        setIsFetchingClubs(true);
        const fetchedClubs = await fetchClubs();
        setClubs(fetchedClubs);

        const memberships = await fetchMemberMemberships(token);
        const activeMembership = memberships.find(
          (m) =>
            m.enddate === "Open Ended" ||
            m.enddate === null ||
            new Date(m.enddate) > new Date()
        );
        if (!activeMembership) throw new Error("No active membership found");
        setMembership(activeMembership);

        // Check if member has access to Guest services
        const services = await fetchServices(
          token,
          undefined,
          fetchedClubs[0]?.id
        );
        const hasGuestService = services.some((s) =>
          s.servicename.toLowerCase().includes("guest")
        );

        let guestFreePassBenefit = null;
        let guestPaidPassBenefit = null;
        if (hasGuestService) {
          const benefitBalances = await fetchMemberBenefitBalances(token);
          guestFreePassBenefit = benefitBalances.find(
            (benefit: any) =>
              benefit.benefitname.toLowerCase().includes("guest free visit") &&
              benefit.balance !== null
          );
          guestPaidPassBenefit = benefitBalances.find(
            (benefit: any) =>
              benefit.benefitname.toLowerCase().includes("guest paid visit") &&
              benefit.price !== null
          );
        }

        if (guestFreePassBenefit && guestFreePassBenefit.balance !== null) {
          setAvailableGuestPasses(guestFreePassBenefit.balance);
        } else {
          setAvailableGuestPasses(0);
          if (hasGuestService) {
            toast.warning("No guest pass benefits available", {
              description:
                "You have no free guest passes. Additional guests will be charged.",
            });
          }
        }

        if (guestPaidPassBenefit && guestPaidPassBenefit.price) {
          const price = parseFloat(
            guestPaidPassBenefit.price.replace(/[^0-9.]/g, "")
          );
          setGuestPassCharge(isNaN(price) ? 25 : price);
        } else {
          setGuestPassCharge(hasGuestService ? 25 : 0); // Only set charge if Guest service exists
          if (hasGuestService) {
            toast.warning("Unable to fetch guest pass charge", {
              description: "Using default charge of $25 per additional guest.",
            });
          }
        }

        const { guestPassesUsed, referralCodes, guestBookingIds } =
          hasGuestService
            ? await fetchGuestData(token)
            : { guestPassesUsed: 0, referralCodes: [], guestBookingIds: [] };
        setGuestPassesUsed(guestPassesUsed);
        setReferralCodes(referralCodes);
        setGuestBookingIds(guestBookingIds);

        setHasFetchedClubs(true);
      } catch (err) {
        console.error("Initial Fetch Error:", err);
        toast.error("Failed to load data", {
          description: (err as Error).message,
        });
      } finally {
        setIsFetchingClubs(false);
      }
    };

    fetchInitialData();
  }, [router, hasFetchedClubs]);

  useEffect(() => {
    if (!location || !membership) return;

    const fetchServicesData = async () => {
      try {
        setIsFetchingServices(true);
        const club = clubs.find((c) => c.name === location);
        if (!club) throw new Error("Selected club not found");

        const fetchedServices = await fetchServices(
          localStorage.getItem("authToken")!,
          undefined,
          club.id
        );
        const memberServices = fetchedServices.map((s) => ({
          ...s,
          servicename: s.servicename.trim(),
        }));
        setServices(memberServices);
      } catch (err) {
        console.error("Services Fetch Error:", err);
        toast.error("Failed to load services", {
          description: (err as Error).message,
        });
      } finally {
        setIsFetchingServices(false);
      }
    };

    fetchServicesData();
  }, [location, clubs, membership]);

  useEffect(() => {
    if (!service || !date || !membership) return;

    const fetchSlotsData = async () => {
      try {
        setIsFetchingSlots(true);
        const selectedService = services.find((s) => s.servicename === service);
        if (!selectedService) throw new Error("Selected service not found");
        setSelectedServiceId(selectedService.serviceid);
        setSelectedBenefitId(
          selectedService.benefitid ? Number(selectedService.benefitid) : null
        );

        const club = clubs.find((c) => c.name === location);
        if (!club) throw new Error("Selected club not found");

        const { dates, resources } = await fetchResourcesAndSessions(
          localStorage.getItem("authToken")!,
          selectedService.serviceid,
          date,
          club.id,
          true
        );
        setResources(resources);
        const dateData = dates.find((d: any) => Object.keys(d)[0] === date);
        if (dateData) {
          const slots = dateData[date].filter((slot: any) => !slot.bookingid);
          setTimeSlots(slots);
        } else {
          setTimeSlots([]);
        }
      } catch (err) {
        console.error("Slots Fetch Error:", err);
        toast.error("Failed to load time slots", {
          description: (err as Error).message,
        });
      } finally {
        setIsFetchingSlots(false);
      }
    };

    fetchSlotsData();
  }, [service, date, services, location, clubs, membership]);

  const debouncedCheckAvailability = useCallback(
    debounce(async () => {
      if (!date || !location || !service || !resources.length) return;
      try {
        const club = clubs.find((c) => c.name === location);
        const selectedService = services.find((s) => s.servicename === service);
        if (!club || !selectedService) return;

        const { dates } = await fetchResourcesAndSessions(
          localStorage.getItem("authToken")!,
          selectedService.serviceid,
          date,
          club.id,
          true
        );
        const dateData = dates.find((d: any) => Object.keys(d)[0] === date);
        if (dateData) {
          const slots = dateData[date].filter((slot: any) => !slot.bookingid);
          setTimeSlots(slots);
        } else {
          setTimeSlots([]);
        }
      } catch (error) {
        console.error("Error fetching slot availability:", error);
        setTimeSlots([]);
      }
    }, 500),
    [date, location, service, resources, clubs, services]
  );

  useEffect(() => {
    debouncedCheckAvailability();
    return () => debouncedCheckAvailability.cancel();
  }, [debouncedCheckAvailability]);

  const handleGuestCountChange = (count: number) => {
    const isGuestService = service.toLowerCase().includes("guest");
    if (!isGuestService) {
      setGuestCount(0);
      form.setValue("guests", []);
      form.clearErrors("guests");
      if (count > 0) {
        toast.warning("Guests can only be added for Guest services");
      }
      return;
    }

    const freePassesAvailable = Math.max(
      availableGuestPasses - guestPassesUsed,
      0
    );
    if (count > freePassesAvailable) {
      setPendingGuestCount(count);
      setShowChargeConfirmation(true);
    } else {
      setGuestCount(count);
      const currentGuests = form.getValues("guests") || [];
      form.setValue(
        "guests",
        Array(count)
          .fill(null)
          .map((_, i) => currentGuests[i] || { name: "", email: "" })
      );
      if (count === 0) form.clearErrors("guests");
    }
  };

  const handleChargeConfirmation = (confirmed: boolean) => {
    if (confirmed && pendingGuestCount !== null) {
      setGuestCount(pendingGuestCount);
      const currentGuests = form.getValues("guests") || [];
      form.setValue(
        "guests",
        Array(pendingGuestCount)
          .fill(null)
          .map((_, i) => currentGuests[i] || { name: "", email: "" })
      );
      if (pendingGuestCount === 0) form.clearErrors("guests");
    } else {
      setGuestCount(0);
      form.setValue("guests", []);
      form.clearErrors("guests");
    }
    setShowChargeConfirmation(false);
    setPendingGuestCount(null);
  };

  const handleLocationChange = () => {
    form.setValue("service", "");
    form.setValue("timeSlot", null);
    setServices([]);
    setResources([]);
    setTimeSlots([]);
    setSelectedServiceId(null);
    setSelectedBenefitId(null);
  };

  const handleServiceChange = () => {
    form.setValue("timeSlot", null);
    setResources([]);
    setTimeSlots([]);
    setSelectedServiceId(null);
    setSelectedBenefitId(null);
  };

  const onSubmit = async (data: z.infer<typeof teeTimeSchema>) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated - no token");
      if (!selectedServiceId) throw new Error("Service ID not loaded");
      if (!GYMMASTER_API_KEY) throw new Error("API key missing in environment");
      if (!membership) throw new Error("No active membership found");
      if (!data.timeSlot) throw new Error("Please select a time slot");

      const club = clubs.find((c) => c.name === data.location);
      if (!club) throw new Error("Selected club not found");

      const isGuestService = data.service.toLowerCase().includes("guest");
      let guestPassUsage = { free: 0, charged: 0 };
      const newReferralCodes: string[] = [];
      const newBookingIds: number[] = [];
      const guestAssignments: number[] = [];
      let guestPassesUsed = 0;

      if (isGuestService && data.guests?.length) {
        const guestData = await fetchGuestData(token);
        guestPassesUsed = guestData.guestPassesUsed || 0;
        const freePassesAvailable = Math.max(
          availableGuestPasses - guestPassesUsed,
          0
        );
        guestPassUsage = {
          free: Math.min(data.guests.length, freePassesAvailable),
          charged: Math.max(data.guests.length - freePassesAvailable, 0),
        };

        data.guests.forEach(() => {
          const code = generateReferralCode();
          newReferralCodes.push(code);
        });
      }

      const bookingId = await addBooking(
        {
          date: data.date,
          day: new Date(data.date).toLocaleDateString("en-US", {
            weekday: "long",
          }),
          time: data.timeSlot.start_str,
          starttime: data.timeSlot.bookingstart,
          location: data.location,
          bay: data.timeSlot.rname,
          servicename: data.service,
          guests: (data.guests || []) as { name: string; email: string }[],
          guestPassUsage,
          referralCodes: newReferralCodes,
          rid: data.timeSlot.rid,
          bookingstart: data.timeSlot.bookingstart,
          bookingend: data.timeSlot.bookingend,
          guestPassCharge: isGuestService ? guestPassCharge : 0,
        },
        token,
        selectedServiceId,
        data.timeSlot.rid,
        membership.id,
        selectedBenefitId || undefined,
        isGuestService ? availableGuestPasses : 0,
        isGuestService ? guestPassCharge : 0
      );

      newBookingIds.push(bookingId);
      if (isGuestService && data.guests?.length) {
        data.guests.forEach(() => guestAssignments.push(bookingId));
      }

      if (isGuestService && guestPassUsage.charged > 0) {
        const totalCharge = guestPassUsage.charged * guestPassCharge;
        await logGuestPassCharge(
          token,
          totalCharge,
          `Guest PAID Visit for ${guestPassUsage.charged} guest(s) on ${data.date}`
        );
        toast.success("Guest pass charges applied", {
          description: `Charged $${totalCharge.toFixed(2)} for ${guestPassUsage.charged} extra guest(s).`,
        });
      }

      if (isGuestService && data.guests?.length) {
        const updatedReferralCodes = [...referralCodes, ...newReferralCodes];
        const updatedBookingIds = [
          ...guestBookingIds,
          ...guestAssignments,
        ].filter((id) => Number.isInteger(id) && id > 0);
        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            await updateMemberProfile(token, {
              customtext5: JSON.stringify(updatedBookingIds),
            });
            await updateGuestData(
              token,
              guestPassesUsed + guestPassUsage.free,
              updatedReferralCodes,
              [],
              (data.guests || []) as {
                name: string;
                email: string;
                date?: string;
              }[]
            );
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              console.warn(`Retry ${retryCount + 1} due to 413 error`);
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            throw error;
          }
        }
        setGuestPassesUsed(guestPassesUsed + guestPassUsage.free);
        setReferralCodes(updatedReferralCodes);
        setGuestBookingIds(updatedBookingIds);
      }

      const member = await fetchMemberDetails(token);
      await sendBookingConfirmationEmail(
        member.email,
        data,
        newBookingIds,
        isGuestService ? availableGuestPasses : 0,
        isGuestService ? guestPassesUsed : 0,
        isGuestService ? guestPassCharge : 0
      );

      if (isGuestService && data.guests?.length) {
        for (let i = 0; i < data.guests.length; i++) {
          const guest = data.guests[i];
          const referralCode = newReferralCodes[i];
          const referralLink = `${APP_URL}`;
          try {
            await fetch("/api/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                emailType: "invite",
                to: guest.email,
                name: guest.name || "Guest",
                referralCode,
                referralLink,
              }),
            });
            toast.success(`Invite email sent to ${guest.email}`);
          } catch (error) {
            console.error(
              `Failed to send invite email to ${guest.email}:`,
              error
            );
            toast.error(`Failed to send invite email to ${guest.email}`);
          }
        }
      }

      toast.success("Tee time booked!", {
        description:
          isGuestService && guestPassUsage.charged > 0
            ? `Charged $${(guestPassUsage.charged * guestPassCharge).toFixed(2)} for ${guestPassUsage.charged} extra guest(s).`
            : undefined,
      });

      form.reset({
        location: "",
        service: "",
        date: "",
        timeSlot: null,
        guests: [],
      });
      setTimeSlots([]);
      setGuestCount(0);
      setShowItinerary(false);
      setTimeout(() => {
        router.push("/dashboard/my-tee-times");
      }, 1000);
    } catch (err) {
      console.error("Booking Error:", err);
      toast.error("Failed to book tee time", {
        description: (err as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const values = form.watch();
    return values.location && values.service && values.date && values.timeSlot;
  };

  return (
    <div className="space-y-4">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center text-black"
      >
        Book a Tee Time
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 bg-white p-6 rounded-lg shadow-md"
      >
        <Form {...form}>
          <form className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base flex items-center gap-2 text-black">
                      <Calendar
                        className="h-5 w-5 text-black"
                        aria-hidden="true"
                      />{" "}
                      Choose Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        min={new Date().toISOString().split("T")[0]}
                        className="border-gray-300 focus:border-black focus:ring-black"
                      />
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm text-red-500" />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base flex items-center gap-2 text-black">
                      <MapPin
                        className="h-5 w-5 text-black"
                        aria-hidden="true"
                      />{" "}
                      Choose Location
                    </FormLabel>
                    <FormControl>
                      {isFetchingClubs ? (
                        <div className="flex items-center gap-2 w-full sm:w-64 p-2 border border-gray-300 rounded-md">
                          <Loader2 className="h-5 w-5 animate-spin text-black" />
                          <span className="text-gray-500">
                            Loading locations...
                          </span>
                        </div>
                      ) : (
                        <select
                          value={field.value}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            handleLocationChange();
                          }}
                          className="w-full sm:w-64 p-2 border border-gray-300 rounded-md focus:border-black focus:ring-black"
                        >
                          <option value="">Select a location</option>
                          {clubs.map((club) => (
                            <option key={club.id} value={club.name}>
                              {club.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm text-red-500" />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base flex items-center gap-2 text-black">
                      <MapPin
                        className="h-5 w-5 text-black"
                        aria-hidden="true"
                      />{" "}
                      Choose Service
                    </FormLabel>
                    <FormControl>
                      {isFetchingServices ? (
                        <div className="flex items-center gap-2 w-full sm:w-64 p-2 border border-gray-300 rounded-md">
                          <Loader2 className="h-5 w-5 animate-spin text-black" />
                          <span className="text-gray-500">
                            Loading services...
                          </span>
                        </div>
                      ) : (
                        <select
                          value={field.value}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            handleServiceChange();
                          }}
                          className="w-full sm:w-64 p-2 border border-gray-300 rounded-md focus:border-black focus:ring-black"
                          disabled={!location}
                        >
                          <option value="">Select a service</option>
                          {services.map((svc) => (
                            <option key={svc.serviceid} value={svc.servicename}>
                              {svc.servicename}
                            </option>
                          ))}
                        </select>
                      )}
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm text-red-500" />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <FormLabel className="text-sm sm:text-base flex items-center gap-2 text-black">
                <Users className="h-5 w-5 text-black" aria-hidden="true" />{" "}
                Invite Guests
              </FormLabel>
              <div className="flex gap-2 sm:gap-4">
                {[0, 1, 2, 3].map((count) => (
                  <Button
                    key={count}
                    type="button"
                    variant={guestCount === count ? "default" : "outline"}
                    onClick={() => handleGuestCountChange(count)}
                    className={`text-sm sm:text-base ${guestCount === count ? "bg-black text-white" : "border-gray-300 text-black hover:bg-gray-100"}`}
                  >
                    {count === 0 ? "None" : count}
                  </Button>
                ))}
              </div>
              {guestCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {Array.from({ length: guestCount }).map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * index }}
                      className="space-y-2 border p-4 rounded-md bg-gray-50"
                    >
                      <h4 className="text-sm font-medium text-black">
                        Guest {index + 1}
                      </h4>
                      <FormField
                        control={form.control}
                        name={`guests.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm text-gray-600">
                              Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Guest Name"
                                {...field}
                                className="border-gray-300 focus:border-black focus:ring-black"
                              />
                            </FormControl>
                            <FormMessage className="text-xs sm:text-sm text-red-500" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`guests.${index}.email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm text-gray-600">
                              Email
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="guest@example.com"
                                {...field}
                                className="border-gray-300 focus:border-black focus:ring-black"
                              />
                            </FormControl>
                            <FormMessage className="text-xs sm:text-sm text-red-500" />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>

            <Dialog
              open={showChargeConfirmation}
              onOpenChange={setShowChargeConfirmation}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl text-black">
                    Confirm Additional Guest Charges
                  </DialogTitle>
                  <DialogDescription className="text-gray-600">
                    {service.toLowerCase().includes("guest") ? (
                      <>
                        You have used {guestPassesUsed} of{" "}
                        {availableGuestPasses} free guest passes.
                        {pendingGuestCount &&
                        pendingGuestCount >
                          Math.max(
                            availableGuestPasses - guestPassesUsed,
                            0
                          ) ? (
                          <>
                            Adding {pendingGuestCount} guest(s) will use{" "}
                            {Math.min(
                              pendingGuestCount,
                              Math.max(
                                availableGuestPasses - guestPassesUsed,
                                0
                              )
                            )}{" "}
                            free pass(es) and charge $
                            {(
                              (pendingGuestCount -
                                Math.max(
                                  availableGuestPasses - guestPassesUsed,
                                  0
                                )) *
                              guestPassCharge
                            ).toFixed(2)}{" "}
                            for{" "}
                            {pendingGuestCount -
                              Math.max(
                                availableGuestPasses - guestPassesUsed,
                                0
                              )}{" "}
                            additional guest(s) at ${guestPassCharge.toFixed(2)}{" "}
                            each.
                          </>
                        ) : (
                          "Please confirm to proceed."
                        )}
                      </>
                    ) : (
                      "Guests can only be added for services with 'Guest' in the name."
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button
                    type="button"
                    className="w-full sm:w-auto bg-black text-white hover:bg-gray-800"
                    onClick={() => handleChargeConfirmation(true)}
                    disabled={!service.toLowerCase().includes("guest")}
                  >
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto border-gray-300 text-black hover:bg-gray-100"
                    onClick={() => handleChargeConfirmation(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <FormField
                control={form.control}
                name="timeSlot"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base text-black">
                      Available Time Slots
                    </FormLabel>
                    <FormControl>
                      {isFetchingSlots ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-8 w-8 animate-spin text-black" />
                          <span className="ml-2 text-gray-500">
                            Loading time slots...
                          </span>
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="text-center p-4 text-gray-500">
                          No available time slots for {date}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {resources.map((resource: any) => {
                            const resourceSlots = timeSlots.filter(
                              (slot) => slot.rname === resource.name
                            );
                            return (
                              resourceSlots.length > 0 && (
                                <div
                                  key={resource.id}
                                  className="border p-4 rounded-md bg-gray-50"
                                >
                                  <h4 className="text-sm font-medium text-black mb-2">
                                    {resource.name}
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {resourceSlots.map((slot) => (
                                      <Button
                                        key={`${slot.rid}-${slot.bookingstart}`}
                                        type="button"
                                        variant={
                                          form.getValues("timeSlot")
                                            ?.start_str === slot.start_str &&
                                          form.getValues("timeSlot")?.rname ===
                                            slot.rname
                                            ? "default"
                                            : "outline"
                                        }
                                        className={`text-sm ${
                                          form.getValues("timeSlot")
                                            ?.start_str === slot.start_str &&
                                          form.getValues("timeSlot")?.rname ===
                                            slot.rname
                                            ? "bg-black text-white"
                                            : "border-gray-300 text-black hover:bg-gray-100"
                                        }`}
                                        onClick={() => {
                                          form.setValue("timeSlot", {
                                            rid: slot.rid,
                                            bookingstart: slot.bookingstart,
                                            bookingend: slot.bookingend,
                                            start_str: slot.start_str,
                                            end_str: slot.end_str,
                                            rname: slot.rname,
                                          });
                                        }}
                                      >
                                        {`${slot.start_str} - ${slot.end_str}`}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )
                            );
                          })}
                        </div>
                      )}
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm text-red-500" />
                  </FormItem>
                )}
              />
            </motion.div>

            <Dialog open={showItinerary} onOpenChange={setShowItinerary}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  className="w-full py-2.5 sm:py-3 text-lg sm:text-base bg-black text-white hover:bg-gray-800"
                  disabled={!isFormValid() || isLoading}
                  onClick={() => setShowItinerary(true)}
                >
                  Review Itinerary
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-xl text-black">
                      Review Your Booking
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Confirm your tee time details below.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm sm:text-base">
                      <strong>Location:</strong>{" "}
                      {form.getValues("location") || "Not selected"}
                    </p>
                    <p className="text-sm sm:text-base">
                      <strong>Service:</strong>{" "}
                      {form.getValues("service") || "Not selected"}
                    </p>
                    <p className="text-sm sm:text-base">
                      <strong>Date:</strong>{" "}
                      {form.getValues("date") || "Not selected"}
                    </p>
                    <div>
                      <strong className="text-sm sm:text-base">
                        Time Slot:
                      </strong>
                      {form.getValues("timeSlot") ? (
                        <ul className="list-disc pl-5 mt-1">
                          <li className="text-sm sm:text-base text-gray-600">
                            {form.getValues("timeSlot")!.start_str} -{" "}
                            {form.getValues("timeSlot")!.end_str} at{" "}
                            {form.getValues("timeSlot")!.rname}
                          </li>
                        </ul>
                      ) : (
                        "Not selected"
                      )}
                    </div>
                    {form
                      .getValues("service")
                      ?.toLowerCase()
                      .includes("guest") &&
                      (form.getValues("guests") || []).length > 0 && (
                        <div>
                          <strong className="text-sm sm:text-base">
                            Guests:
                          </strong>
                          <ul className="list-disc pl-5 mt-1">
                            {(form.getValues("guests") || []).map(
                              (guest, index) => (
                                <li
                                  key={index}
                                  className="text-sm sm:text-base text-gray-600"
                                >
                                  {guest.name} ({guest.email})
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    {form
                      .getValues("service")
                      ?.toLowerCase()
                      .includes("guest") &&
                      (form.getValues("guests") || []).length > 0 && (
                        <p className="text-sm sm:text-base text-gray-600">
                          <strong>Guest Pass Usage:</strong>{" "}
                          {Math.min(
                            (form.getValues("guests") || []).length,
                            Math.max(availableGuestPasses - guestPassesUsed, 0)
                          )}{" "}
                          free pass(es) used.
                          {Math.max(
                            (form.getValues("guests") || []).length -
                              Math.max(
                                availableGuestPasses - guestPassesUsed,
                                0
                              ),
                            0
                          ) > 0
                            ? ` $${(
                                Math.max(
                                  (form.getValues("guests") || []).length -
                                    Math.max(
                                      availableGuestPasses - guestPassesUsed,
                                      0
                                    ),
                                  0
                                ) * guestPassCharge
                              ).toFixed(2)} for ${Math.max(
                                (form.getValues("guests") || []).length -
                                  Math.max(
                                    availableGuestPasses - guestPassesUsed,
                                    0
                                  ),
                                0
                              )} extra guest(s) at $${guestPassCharge.toFixed(2)} each.`
                            : ""}
                        </p>
                      )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button
                      type="button"
                      className="w-full sm:w-auto bg-black text-white hover:bg-gray-800"
                      disabled={isLoading}
                      onClick={form.handleSubmit(onSubmit)}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Confirm Booking"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto border-gray-300 text-black hover:bg-gray-100"
                      onClick={() => setShowItinerary(false)}
                      disabled={isLoading}
                    >
                      Edit
                    </Button>
                  </div>
                </motion.div>
              </DialogContent>
            </Dialog>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
