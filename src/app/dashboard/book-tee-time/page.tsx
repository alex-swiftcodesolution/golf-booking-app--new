"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
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
} from "@/api/gymmaster";
import { useRouter } from "next/navigation";

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://your-app.com";

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
        cell: z
          .string()
          .min(10, "Please enter a valid phone number with area code"),
      })
    )
    .optional(),
});

const freeGuestPassesPerMonth = 2;
const guestPassCharge = 10;

interface CustomField {
  fieldname: string;
  value: string;
}

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

  // Generate random referral code
  const generateReferralCode = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  // Fetch custom fields (guest passes, referral codes, booking IDs)
  const fetchCustomFields = async (token: string) => {
    // Temporarily disable broken API call
    // console.log("Skipping customfields fetch - endpoint not implemented");
    // return { guestPassesUsed: 0, referralCodes: [], guestBookingIds: [] };

    try {
      const response = await axios.get(
        "/api/gymmaster/v1/member/customfields",
        {
          params: { api_key: GYMMASTER_API_KEY, token },
        }
      );
      const fields: CustomField[] = response.data.customfields || [];
      console.log("Custom Fields:", fields);
      const passesField = fields.find(
        (f: CustomField) => f.fieldname === "guest_passes_used"
      );
      const codesField = fields.find(
        (f: CustomField) => f.fieldname === "referral_codes"
      );
      const bookingIdsField = fields.find(
        (f: CustomField) => f.fieldname === "guest_booking_ids"
      );
      return {
        guestPassesUsed: passesField ? Number(passesField.value) || 0 : 0,
        referralCodes: codesField ? JSON.parse(codesField.value || "[]") : [],
        guestBookingIds: bookingIdsField
          ? JSON.parse(bookingIdsField.value || "[]")
          : [],
      };
    } catch (err) {
      console.error("Custom Fields Error:", err);
      return { guestPassesUsed: 0, referralCodes: [], guestBookingIds: [] };
    }
  };

  // Update custom fields
  const updateCustomFields = async (
    token: string,
    guestPassesUsed: number,
    referralCodes: string[],
    guestBookingIds: number[]
  ) => {
    // Temporarily disable broken API call
    console.log("Skipping customfields update - endpoint not implemented", {
      guestPassesUsed,
      referralCodes,
      guestBookingIds,
    });

    try {
      await axios.put(
        "/api/gymmaster/v1/member/customfields",
        {
          customfields: [
            {
              fieldname: "guest_passes_used",
              value: guestPassesUsed.toString(),
            },
            {
              fieldname: "referral_codes",
              value: JSON.stringify(referralCodes),
            },
            {
              fieldname: "guest_booking_ids",
              value: JSON.stringify(guestBookingIds),
            },
          ],
        },
        {
          params: { api_key: GYMMASTER_API_KEY, token },
          headers: { "Content-Type": "application/json" },
        }
      );
      console.log("Updated Custom Fields:", {
        guestPassesUsed,
        referralCodes,
        guestBookingIds,
      });
    } catch (err) {
      console.error("Update Custom Fields Error:", err);
      toast.error("Failed to update guest data");
    }
  };

  // Initial fetch for clubs, memberships, and custom fields
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
        console.log("Memberships:", memberships);
        const activeMembership = memberships.find(
          (m) =>
            m.enddate === "Open Ended" ||
            m.enddate === null ||
            new Date(m.enddate) > new Date()
        );
        if (!activeMembership) throw new Error("No active membership found");
        setMembership(activeMembership);

        const { guestPassesUsed, referralCodes, guestBookingIds } =
          await fetchCustomFields(token);
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
        console.log("All Services:", fetchedServices);
        const memberServices = fetchedServices
          .filter((s) => s.servicename.includes("Member Golf Bay"))
          .map((s) => ({
            ...s,
            servicename: s.servicename.trim(),
          }));
        console.log(
          "Available Services:",
          memberServices.map((s) => ({
            id: s.serviceid,
            name: s.servicename,
            benefitid: s.benefitid,
          }))
        );
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
        console.log(
          "Fetched Resources for Service",
          selectedService.serviceid,
          ":",
          resources.map((r) => ({ id: r.id, name: r.name }))
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
        .map((_, i) => currentGuests[i] || { name: "", cell: "" })
    );
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

      const memberId = localStorage.getItem("memberId") || "123";
      const resourceMap = Object.fromEntries(
        resources.map((r) => [r.name, r.id])
      );
      const club = clubs.find((c) => c.name === data.location);
      if (!club) throw new Error("Selected club not found");

      // Generate referral codes and collect booking IDs
      const newReferralCodes: string[] = [];
      const newBookingIds: number[] = [];
      if (data.guests?.length) {
        data.guests.forEach(() => {
          const code = `GUEST_${memberId}_${generateReferralCode()}`;
          newReferralCodes.push(code);
        });
      }

      // Book slots
      for (const slot of data.timeSlots) {
        const { hour, minute } = parseTimeSlot(slot.time);
        const bookingstart = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}:00`;
        const duration = getSlotDuration();
        const endHour = Math.floor((hour * 60 + minute + duration) / 60);
        const endMinute = (minute + duration) % 60;
        const bookingend = `${endHour.toString().padStart(2, "0")}:${endMinute
          .toString()
          .padStart(2, "0")}:00`;

        const bookingParams: Record<string, string> = {
          api_key: GYMMASTER_API_KEY,
          token,
          resourceid: resourceMap[slot.bay].toString(),
          serviceid: selectedServiceId.toString(),
          day: data.date,
          bookingstart,
          bookingend,
          roomid: "",
          equipmentid: "",
          membershipid: membership.id.toString(),
        };
        if (selectedBenefitId) {
          bookingParams.benefitid = selectedBenefitId.toString();
        }
        console.log("Booking Request:", {
          ...bookingParams,
          serviceName: data.service,
          bayName: slot.bay,
        });

        const response = await axios.post(
          "/api/gymmaster/v1/booking/servicebookings",
          new URLSearchParams(bookingParams),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        console.log(
          "API Response Status:",
          response.status,
          "Data:",
          JSON.stringify(response.data, null, 2)
        );

        if (response.data.error || !response.data.result) {
          throw new Error(
            response.data.error || "Booking failed: No result returned"
          );
        }
        if (response.status !== 200) {
          throw new Error(
            response.data.error || "Booking failed, expected 200 OK"
          );
        }

        // Store booking ID
        const bookingId = response.data.result?.bookingid;
        if (bookingId) {
          newBookingIds.push(bookingId);
        }

        await addBooking({
          date: data.date,
          // addition
          day: new Date(data.date).toLocaleDateString("en-US", {
            weekday: "long",
          }),
          starttime: slot.time,
          // addition
          time: slot.time,
          location: data.location,
          bay: slot.bay,
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
        });
      }

      // Update guest passes, referral codes, and booking IDs
      if (data.guests?.length) {
        const newGuestPassesUsed = guestPassesUsed + data.guests.length;
        const updatedReferralCodes = [...referralCodes, ...newReferralCodes];
        const updatedBookingIds = [...guestBookingIds, ...newBookingIds];
        await updateCustomFields(
          token,
          newGuestPassesUsed,
          updatedReferralCodes,
          updatedBookingIds
        );
        setGuestPassesUsed(newGuestPassesUsed);
        setReferralCodes(updatedReferralCodes);
        setGuestBookingIds(updatedBookingIds);

        // Send app link to guests
        for (let i = 0; i < data.guests.length; i++) {
          const guest = data.guests[i];
          const referralCode = newReferralCodes[i];
          const appLink = `${APP_URL}?referral=${encodeURIComponent(
            referralCode
          )}`;
          const res = await fetch("/api/send-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phoneNumber: guest.cell,
              message: `Join my tee time at ${data.location}! Sign up or log in: ${appLink}`,
            }),
          });
          if (!res.ok) throw new Error(`SMS failed for ${guest.name}`);
          toast.info("SMS sent to guest", {
            description: `A link with referral code ${referralCode} was sent to ${guest.name} (${guest.cell})`,
          });
        }
      }

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
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center"
      >
        Book a Tee Time
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8"
      >
        <Form {...form}>
          <form className="space-y-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base flex items-center gap-2">
                    <Calendar className="h-5 w-5" aria-hidden="true" /> Choose
                    Date
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </FormControl>
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base flex items-center gap-2">
                    <MapPin className="h-5 w-5" aria-hidden="true" /> Choose
                    Location
                  </FormLabel>
                  <FormControl>
                    {isFetchingClubs ? (
                      <div className="flex items-center gap-2 w-full sm:w-64 p-2 border rounded-md">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading locations...</span>
                      </div>
                    ) : (
                      <select
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          handleLocationChange();
                        }}
                        className="w-full sm:w-64 p-2 border rounded-md"
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
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="service"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base flex items-center gap-2">
                    <MapPin className="h-5 w-5" aria-hidden="true" /> Choose
                    Service
                  </FormLabel>
                  <FormControl>
                    {isFetchingServices ? (
                      <div className="flex items-center gap-2 w-full sm:w-64 p-2 border rounded-md">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading services...</span>
                      </div>
                    ) : (
                      <select
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          handleServiceChange();
                        }}
                        className="w-full sm:w-64 p-2 border rounded-md"
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
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel className="text-sm sm:text-base flex items-center gap-2">
                <Users className="h-5 w-5" aria-hidden="true" /> Bring a Guest
              </FormLabel>
              <div className="flex gap-2 sm:gap-4">
                {[0, 1, 2, 3].map((count) => (
                  <Button
                    key={count}
                    type="button"
                    variant={guestCount === count ? "default" : "outline"}
                    onClick={() => handleGuestCountChange(count)}
                    className="text-sm sm:text-base"
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
                    <div
                      key={index}
                      className="space-y-2 border p-4 rounded-md"
                    >
                      <h4 className="text-sm font-medium">Guest {index + 1}</h4>
                      <FormField
                        control={form.control}
                        name={`guests.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">
                              Name
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Guest Name" {...field} />
                            </FormControl>
                            <FormMessage className="text-xs sm:text-sm" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`guests.${index}.cell`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">
                              Cell
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="+1-123-456-7890" {...field} />
                            </FormControl>
                            <FormMessage className="text-xs sm:text-sm" />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            <FormField
              control={form.control}
              name="timeSlots"
              render={() => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    Available Times
                  </FormLabel>
                  <div className="mt-2 max-h-96 overflow-y-auto">
                    {isFetchingSlots ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading time slots...</span>
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
                              <TableCell className="font-medium text-xs">
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
                                      className="w-full text-[10px] sm:text-xs py-0.5 sm:py-1 px-1 sm:px-2"
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
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />

            <Dialog open={showItinerary} onOpenChange={setShowItinerary}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  className="w-full py-2.5 sm:py-3 text-lg sm:text-base"
                  disabled={!isFormValid() || isLoading}
                  onClick={() => setShowItinerary(true)}
                >
                  Review Itinerary
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Review Your Booking</DialogTitle>
                  <DialogDescription>
                    Review your booking details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <p>
                    <strong>Location:</strong>{" "}
                    {form.getValues("location") || "Not selected"}
                  </p>
                  <p>
                    <strong>Service:</strong>{" "}
                    {form.getValues("service") || "Not selected"}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {form.getValues("date") || "Not selected"}
                  </p>
                  <div>
                    <strong>Time Slots:</strong>
                    {form.getValues("timeSlots").length > 0 ? (
                      <ul className="list-disc pl-5">
                        {form.getValues("timeSlots").map((slot, index) => (
                          <li key={index} className="text-sm sm:text-base">
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
                      <strong>Guests:</strong>
                      <ul className="list-disc pl-5">
                        {(form.getValues("guests") || []).map(
                          (guest, index) => (
                            <li key={index} className="text-sm sm:text-base">
                              {guest.name} ({guest.cell})
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
                        Math.max(freeGuestPassesPerMonth - guestPassesUsed, 0)
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
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={isLoading}
                    onClick={form.handleSubmit(onSubmit)}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Confirm"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setShowItinerary(false)}
                    disabled={isLoading}
                  >
                    Edit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
