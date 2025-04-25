"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from "uuid";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { useBookings } from "@/context/BookingContext";
import {
  Club,
  Resource,
  Session,
  Service,
  fetchClubs,
  fetchResourcesAndSessions,
  fetchServices,
  fetchMemberMemberships,
  MemberMembership,
  fetchGuestData,
  updateGuestData,
  fetchMemberDetails,
} from "@/api/gymmaster";
import { useRouter } from "next/navigation";

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://test-swiftcode.vercel.app/";

const teeTimeSchema = z.object({
  location: z.string().min(1, "Please select a location"),
  service: z.string().min(1, "Please select a service"),
  date: z.string().min(1, "Please select a date"),
  timeSlots: z
    .array(
      z.object({
        time: z.string().min(1, "Time is required"),
        bay: z.string().min(1, "Bay is required"),
      })
    )
    .min(1, "Please select at least one time slot"),
  guests: z
    .array(
      z.object({
        name: z.string().min(1, "Guest name is required"),
        email: z.string().email("Please enter a valid email"),
      })
    )
    .optional(),
});

const freeGuestPassesPerMonth = 2;
const guestPassCharge = 10;

export default function BookTeeTime() {
  const [selectedSlots, setSelectedSlots] = useState<
    { time: string; bay: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
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
  const [referralCodes, setReferralCodes] = useState<string[]>([]);
  const [guestBookingIds, setGuestBookingIds] = useState<number[]>([]);
  const { addBooking, bookings } = useBookings();
  const router = useRouter();

  const form = useForm<z.infer<typeof teeTimeSchema>>({
    resolver: zodResolver(teeTimeSchema),
    defaultValues: {
      location: "",
      service: "",
      date: "",
      timeSlots: [],
      guests: [],
    },
  });

  const location = form.watch("location");
  const service = form.watch("service");
  const date = form.watch("date");

  // Generate unique referral code
  const generateReferralCode = () => {
    return `GUEST_${localStorage.getItem("memberId") || "123"}_${uuidv4().slice(
      0,
      6
    )}`;
  };

  // Send booking confirmation email to member
  const sendBookingConfirmationEmail = async (
    email: string,
    data: z.infer<typeof teeTimeSchema>,
    bookingIds: number[],
    freeGuestPassesPerMonth: number,
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
          timeSlots: data.timeSlots,
          guests: data.guests || [],
          bookingIds,
          freeGuestPassesPerMonth,
          guestPassesUsed,
          guestPassCharge,
        }),
      });
      if (!response.ok) throw new Error("Failed to send confirmation email");
      console.log("Confirmation email sent to:", email);
      toast.info("Confirmation email sent", {
        description: `A confirmation email was sent to ${email}`,
      });
    } catch (error) {
      console.error("Send confirmation email error:", error);
      toast.error("Failed to send confirmation email");
    }
  };

  // Initial fetch for clubs, memberships, and guest data
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

        const { guestPassesUsed, referralCodes, guestBookingIds } =
          await fetchGuestData(token);
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

  // Fetch services when location changes
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
        const memberServices = fetchedServices
          .filter((s) => s.servicename.includes("Member Golf Bay"))
          .map((s) => ({
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

  // Fetch slots when service or date changes
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
          club.id
        );
        setResources(resources);
        setSessions(dates);
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

  const getSlotDuration = () => {
    if (service.includes("1/2 hr")) return 30;
    if (service.includes("1 hr")) return 60;
    return 30;
  };

  const timeSlots = Array.from(
    { length: getSlotDuration() === 30 ? 48 : 24 },
    (_, i) => {
      const hour = Math.floor(i / (getSlotDuration() === 30 ? 2 : 1));
      const minute =
        getSlotDuration() === 30 ? (i % 2 === 0 ? "00" : "30") : "00";
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minute} ${period}`;
    }
  );

  const parseTimeSlot = (time: string) => {
    const [hourMinute, period] = time.split(" ");
    let hour = Number(hourMinute.split(":")[0]);
    const minute = Number(hourMinute.split(":")[1]);
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return { hour, minute };
  };

  const isSlotAvailable = (time: string, bay: string) => {
    const { hour, minute } = parseTimeSlot(time);
    const slotStart = `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}:00`;
    const resource = resources.find((r) => r.name === bay);
    return !sessions.some(
      (s) => s.rid === resource?.id && s.bookingstart === slotStart
    );
  };

  const checkTimeSlotConflict = (time: string, bay: string) => {
    const { hour: startHour, minute: startMinute } = parseTimeSlot(time);
    const startMinutes = startHour * 60 + startMinute;
    const slotDuration = getSlotDuration();
    const slotMinutes = startMinutes + slotDuration;
    const slotHour = Math.floor(slotMinutes / 60);
    const slotMinute = slotMinutes % 60;
    const period = slotHour >= 12 ? "PM" : "AM";
    const displayHour =
      slotHour > 12 ? slotHour - 12 : slotHour === 0 ? 12 : slotHour;
    const slotTime = `${displayHour}:${
      slotMinute === 0 ? "00" : "30"
    } ${period}`;

    return bookings.some(
      (booking) =>
        booking.date === date &&
        booking.location === location &&
        booking.bay === bay &&
        (booking.time === time || booking.time === slotTime)
    );
  };

  const handleTimeSelect = (time: string, bay: string) => {
    if (!location || !service || !date) {
      toast.error("Select location, service, and date first");
      return;
    }
    if (!isSlotAvailable(time, bay)) {
      toast.error("Slot unavailable");
      return;
    }
    if (checkTimeSlotConflict(time, bay)) {
      toast.error("Time slot conflict");
      return;
    }
    const slotIndex = selectedSlots.findIndex(
      (slot) => slot.time === time && slot.bay === bay
    );
    const updatedSlots =
      slotIndex >= 0
        ? selectedSlots.filter((s) => s.time !== time || s.bay !== bay)
        : [...selectedSlots, { time, bay }];
    setSelectedSlots(updatedSlots);
    form.setValue("timeSlots", updatedSlots);
    toast.info(slotIndex >= 0 ? "Time slot deselected" : "Time slot chosen", {
      description:
        slotIndex >= 0
          ? `Removed ${time} at ${bay}.`
          : `Added ${time} at ${bay}.`,
    });
  };

  const handleGuestCountChange = (count: number) => {
    if (
      count > freeGuestPassesPerMonth &&
      guestPassesUsed >= freeGuestPassesPerMonth
    ) {
      toast.warning("Guest pass limit reached", {
        description: `You've used ${guestPassesUsed} of ${freeGuestPassesPerMonth} free guest passes. Additional guests cost $${guestPassCharge} each.`,
      });
    }
    setGuestCount(count);
    const currentGuests = form.getValues("guests") || [];
    form.setValue(
      "guests",
      Array(count)
        .fill(null)
        .map((_, i) => currentGuests[i] || { name: "", email: "" })
    );
    console.log("Updated guests:", form.getValues("guests"));
    if (count === 0) form.clearErrors("guests");
  };

  const handleLocationChange = () => {
    setSelectedSlots([]);
    form.setValue("timeSlots", []);
    form.setValue("service", "");
    setServices([]);
    setSelectedServiceId(null);
    setSelectedBenefitId(null);
  };

  const handleServiceChange = () => {
    setSelectedSlots([]);
    form.setValue("timeSlots", []);
    setResources([]);
    setSessions([]);
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

      const resourceMap = Object.fromEntries(
        resources.map((r) => [r.name, r.id])
      );
      const club = clubs.find((c) => c.name === data.location);
      if (!club) throw new Error("Selected club not found");

      // Generate referral codes and collect booking IDs
      const newReferralCodes: string[] = [];
      const newBookingIds: number[] = [];
      const guestAssignments: number[] = []; // Tracks which booking ID each guest is assigned to
      if (data.guests?.length) {
        data.guests.forEach(() => {
          const code = generateReferralCode();
          newReferralCodes.push(code);
        });
      }

      // Book slots
      for (const slot of data.timeSlots) {
        const bookingId = await addBooking(
          {
            date: data.date,
            day: new Date(data.date).toLocaleDateString("en-US", {
              weekday: "long",
            }),
            time: slot.time,
            starttime: slot.time,
            location: data.location,
            bay: slot.bay,
            servicename: data.service, // Added service name
            guests: data.guests || [],
            guestPassUsage: {
              free: Math.min(
                (data.guests || []).length,
                Math.max(freeGuestPassesPerMonth - guestPassesUsed, 0)
              ),
              charged: Math.max(
                (data.guests || []).length -
                  Math.max(freeGuestPassesPerMonth - guestPassesUsed, 0),
                0
              ),
            },
          },
          token,
          selectedServiceId,
          resourceMap[slot.bay],
          membership.id,
          selectedBenefitId || undefined
        );

        newBookingIds.push(bookingId);
        // Assign each guest to this booking ID
        if (data.guests?.length) {
          data.guests.forEach(() => guestAssignments.push(bookingId));
        }
      }

      // Update guest passes, referral codes, and booking IDs
      if (data.guests?.length) {
        const newGuestPassesUsed = guestPassesUsed + data.guests.length;
        const updatedReferralCodes = [...referralCodes, ...newReferralCodes];
        const updatedBookingIds = [...guestBookingIds, ...guestAssignments];
        await updateGuestData(
          token,
          newGuestPassesUsed,
          updatedReferralCodes,
          updatedBookingIds,
          data.guests
        );
        setGuestPassesUsed(newGuestPassesUsed);
        setReferralCodes(updatedReferralCodes);
        setGuestBookingIds(updatedBookingIds);

        // Send email invites to guests
        for (let i = 0; i < data.guests.length; i++) {
          const guest = data.guests[i];
          const referralCode = newReferralCodes[i];
          const referralLink = `${APP_URL}?referral=${encodeURIComponent(
            referralCode
          )}`;
          const res = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emailType: "invite",
              to: guest.email,
              name: guest.name,
              referralCode,
              referralLink,
            }),
          });
          if (!res.ok) throw new Error(`Email failed for ${guest.name}`);
          toast.info("Email sent to guest", {
            description: `An invite with referral code ${referralCode} was sent to ${guest.name} (${guest.email})`,
          });
        }
      }

      // Send confirmation email to member
      const memberProfile = await fetchMemberDetails(token);
      const memberEmail = memberProfile.email || "member@example.com";
      await sendBookingConfirmationEmail(
        memberEmail,
        data,
        newBookingIds,
        freeGuestPassesPerMonth,
        guestPassesUsed,
        guestPassCharge
      );

      const extraCharge =
        Math.max(
          (data.guests || []).length -
            Math.max(freeGuestPassesPerMonth - guestPassesUsed, 0),
          0
        ) * guestPassCharge;
      toast.success("Tee times booked!", {
        description: `Booked ${data.timeSlots.length} time slot(s) at ${
          data.location
        } on ${data.date} with ${data.service}${
          data.guests?.length ? ` with ${data.guests.length} guest(s)` : ""
        }${extraCharge > 0 ? ` (Extra charge: $${extraCharge})` : ""}`,
      });

      form.reset({
        location: "",
        service: "",
        date: "",
        timeSlots: [],
        guests: [],
      });
      setSelectedSlots([]);
      setGuestCount(0);
      setShowItinerary(false);
      router.push("/dashboard/my-tee-times");
    } catch (err) {
      console.error("Booking Error:", err);
      toast.error("Failed to book tee times", {
        description: (err as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const values = form.watch();
    return (
      values.location &&
      values.service &&
      values.date &&
      values.timeSlots.length > 0
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 bg-gray-50 min-h-screen">
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
              transition={{ duration: 0.4, delay: 0.6 }}
              className="space-y-4"
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
                    className={`text-sm sm:text-base ${
                      guestCount === count
                        ? "bg-black text-white"
                        : "border-gray-300 text-black hover:bg-gray-100"
                    }`}
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <FormField
                control={form.control}
                name="timeSlots"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base text-black">
                      Available Times
                    </FormLabel>
                    <div className="mt-2 max-h-96 overflow-y-auto border rounded-md">
                      {isFetchingSlots ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-8 w-8 animate-spin text-black" />
                          <span className="ml-2 text-gray-500">
                            Loading time slots...
                          </span>
                        </div>
                      ) : resources.length === 0 ? (
                        <div className="text-center p-4 text-gray-500">
                          Select a location, service, and date to see available
                          times
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs w-[80px] sm:w-[100px] sticky top-0 bg-white">
                                Time
                              </TableHead>
                              {resources.map((r) => (
                                <TableHead
                                  key={r.id}
                                  className="text-center text-xs w-[60px] sm:w-[80px] sticky top-0 bg-white"
                                >
                                  {r.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {timeSlots.map((time) => (
                              <TableRow key={time}>
                                <TableCell className="font-medium text-xs text-black">
                                  {time}
                                </TableCell>
                                {resources.map((r) => {
                                  const isSelected = selectedSlots.some(
                                    (s) => s.time === time && s.bay === r.name
                                  );
                                  const isUnavailable = !isSlotAvailable(
                                    time,
                                    r.name
                                  );
                                  return (
                                    <TableCell
                                      key={`${r.id}-${time}`}
                                      className="text-center"
                                    >
                                      <Button
                                        type="button"
                                        variant={
                                          isSelected
                                            ? "default"
                                            : isUnavailable
                                              ? "destructive"
                                              : "outline"
                                        }
                                        onClick={() =>
                                          handleTimeSelect(time, r.name)
                                        }
                                        className={`w-full text-[10px] sm:text-xs py-0.5 sm:py-1 px-1 sm:px-2 ${
                                          isSelected
                                            ? "bg-black text-white"
                                            : isUnavailable
                                              ? "bg-red-500 text-white"
                                              : "border-gray-300 text-black hover:bg-gray-100"
                                        }`}
                                        disabled={
                                          isUnavailable || !location || !service
                                        }
                                        aria-label={
                                          isSelected
                                            ? `Selected: ${time} at ${r.name}`
                                            : isUnavailable
                                              ? `Unavailable: ${time} at ${r.name}`
                                              : `Choose ${time} at ${r.name}`
                                        }
                                      >
                                        {isSelected
                                          ? "Selected"
                                          : isUnavailable
                                            ? "N/A"
                                            : "Select"}
                                      </Button>
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                    <FormMessage className="text-xs sm:text-sm text-red-500" />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.8 }}
            >
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
                          Time Slots:
                        </strong>
                        {form.getValues("timeSlots").length > 0 ? (
                          <ul className="list-disc pl-5 mt-1">
                            {form.getValues("timeSlots").map((slot, index) => (
                              <li
                                key={index}
                                className="text-sm sm:text-base text-gray-600"
                              >
                                {slot.time} at {slot.bay}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "Not selected"
                        )}
                      </div>
                      {(form.getValues("guests") || []).length > 0 && (
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
                      {(form.getValues("guests") || []).length > 0 && (
                        <p className="text-sm sm:text-base text-gray-600">
                          <strong>Guest Pass Usage:</strong>{" "}
                          {Math.min(
                            (form.getValues("guests") || []).length,
                            Math.max(
                              freeGuestPassesPerMonth - guestPassesUsed,
                              0
                            )
                          )}{" "}
                          free pass(es) used.{" "}
                          {Math.max(
                            (form.getValues("guests") || []).length -
                              Math.max(
                                freeGuestPassesPerMonth - guestPassesUsed,
                                0
                              ),
                            0
                          ) > 0
                            ? `Extra charge: $${
                                Math.max(
                                  (form.getValues("guests") || []).length -
                                    Math.max(
                                      freeGuestPassesPerMonth - guestPassesUsed,
                                      0
                                    ),
                                  0
                                ) * guestPassCharge
                              }`
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
            </motion.div>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
