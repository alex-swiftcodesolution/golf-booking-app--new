/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  fetchMemberBenefitBalances,
  fetchProducts,
  purchaseProduct,
  reconcileGuestData,
} from "@/api/gymmaster";
import {
  Club,
  Resource,
  Service,
  MemberMembership,
  Product,
} from "@/lib/types";
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
  guest: z
    .object({
      name: z.string().min(1, "Guest name is required"),
      email: z.string().email("Please enter a valid email"),
      date: z.string().optional(),
    })
    .optional(),
});

export default function BookTeeTime() {
  const [isLoading, setIsLoading] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [guestPassProductId, setGuestPassProductId] = useState<number | null>(
    null
  );
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
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [membership, setMembership] = useState<MemberMembership | null>(null);
  const [isFetchingClubs, setIsFetchingClubs] = useState(false);
  const [isFetchingServices, setIsFetchingServices] = useState(false);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [hasFetchedClubs, setHasFetchedClubs] = useState(false);
  const [guestPassesUsed, setGuestPassesUsed] = useState(0);
  const [availableGuestPasses, setAvailableGuestPasses] = useState<number>(0);
  const [purchasedGuestPasses, setPurchasedGuestPasses] = useState<number>(0);
  const [referralCodes, setReferralCodes] = useState<string[]>([]);
  const [guestBookingIds, setGuestBookingIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<"self" | "guest">("self");
  const [activeResourceTab, setActiveResourceTab] = useState<string>("");
  const { addBooking } = useBookings();
  const router = useRouter();

  const form = useForm<z.infer<typeof teeTimeSchema>>({
    resolver: zodResolver(teeTimeSchema),
    defaultValues: {
      location: "",
      service: "",
      date: "",
      timeSlot: null,
      guest: undefined,
    },
  });

  const { location, date } = form.watch();

  const sendBookingConfirmationEmail = async (
    email: string,
    data: z.infer<typeof teeTimeSchema>,
    bookingIds: number[],
    availableGuestPasses: number,
    guestPassesUsed: number,
    purchasedGuestPasses: number
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
          guests: data.guest
            ? [
                {
                  name: data.guest.name,
                  email: data.guest.email,
                  date: data.guest.date,
                },
              ]
            : [],
          bookingIds,
          availableGuestPasses,
          guestPassesUsed,
          purchasedGuestPasses,
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

        const services = await fetchServices(
          token,
          undefined,
          fetchedClubs[0]?.id
        );
        setServices(services);

        const hasGuestService = services.some((s) =>
          s.servicename.toLowerCase().includes("guest")
        );

        let guestFreePassBenefit = null;

        if (hasGuestService) {
          const benefitBalances = await fetchMemberBenefitBalances(token);
          guestFreePassBenefit = benefitBalances.find(
            (benefit: any) =>
              benefit.benefitname.toLowerCase().includes("guest free visit") &&
              benefit.balance !== null
          );

          setAvailableGuestPasses(guestFreePassBenefit?.balance || 0);
          if (!guestFreePassBenefit && hasGuestService) {
            toast.warning("No guest pass benefits available", {
              description: "You may need to purchase guest passes.",
            });
          }
        } else {
          setAvailableGuestPasses(0);
        }

        const products = await fetchProducts();
        setProducts(products);
        const guestPassProduct = products.find((p) =>
          p.name.toLowerCase().includes("guest pass")
        );
        setGuestPassProductId(guestPassProduct?.productid || null);

        const {
          guestPassesUsed,
          referralCodes,
          guestBookingIds,
          guests,
          purchasedGuestPasses,
        } = await fetchGuestData(token);
        const reconciledData = await reconcileGuestData(
          token,
          guestPassesUsed,
          referralCodes,
          guestBookingIds,
          guests,
          purchasedGuestPasses
        );

        setGuestPassesUsed(reconciledData.guestPassesUsed);
        setReferralCodes(reconciledData.referralCodes);
        setGuestBookingIds(reconciledData.guestBookingIds);
        setPurchasedGuestPasses(reconciledData.purchasedGuestPasses);
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
        const benefitBalances = await fetchMemberBenefitBalances(
          localStorage.getItem("authToken")!
        );
        const memberServices = fetchedServices.map((s) => ({
          ...s,
          servicename: s.servicename.trim(),
          benefitBalance:
            benefitBalances.find((b: any) =>
              b.benefitname.toLowerCase().includes(s.servicename.toLowerCase())
            )?.balance ?? null,
        }));
        setServices(memberServices);

        if (activeTab === "guest" && !form.getValues("service")) {
          const guestFreeService = memberServices.find(
            (s) =>
              s.benefitid &&
              s.servicename.toLowerCase().includes("guest free visit") &&
              s.benefitBalance !== null &&
              s.benefitBalance > 0
          );
          const guestPaidService = memberServices.find(
            (s) =>
              s.servicename.toLowerCase().includes("guest paid visit") &&
              purchasedGuestPasses > 0
          );
          if (guestFreeService) {
            form.setValue("service", guestFreeService.servicename);
            setSelectedService(guestFreeService);
            setSelectedServiceId(guestFreeService.serviceid);
            setSelectedBenefitId(Number(guestFreeService.benefitid));
          } else if (guestPaidService) {
            form.setValue("service", guestPaidService.servicename);
            setSelectedService(guestPaidService);
            setSelectedServiceId(guestPaidService.serviceid);
            setSelectedBenefitId(
              guestPaidService.benefitid
                ? Number(guestPaidService.benefitid)
                : null
            );
          } else {
            form.setValue("service", "");
            setSelectedService(null);
            setSelectedServiceId(null);
            setSelectedBenefitId(null);
            setShowPurchaseDialog(true);
          }
        } else if (activeTab === "self" && !form.getValues("service")) {
          const defaultSelfService = memberServices.find(
            (s) => !s.servicename.toLowerCase().includes("guest")
          );
          if (defaultSelfService) {
            form.setValue("service", defaultSelfService.servicename);
            setSelectedService(defaultSelfService);
            setSelectedServiceId(defaultSelfService.serviceid);
            setSelectedBenefitId(
              defaultSelfService.benefitid
                ? Number(defaultSelfService.benefitid)
                : null
            );
          } else {
            form.setValue("service", "");
            setSelectedService(null);
            setSelectedServiceId(null);
            setSelectedBenefitId(null);
            toast.error("No self services available");
          }
        }
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
  }, [location, membership, activeTab, form, clubs, purchasedGuestPasses]);

  useEffect(() => {
    if (
      !form.getValues("service") ||
      !date ||
      !membership ||
      !selectedServiceId
    )
      return;

    const fetchSlotsData = async () => {
      try {
        setIsFetchingSlots(true);
        const selectedServiceName = form.getValues("service");
        const selectedService = services.find(
          (s) => s.servicename === selectedServiceName
        );
        if (!selectedService) throw new Error("Selected service not found");
        setSelectedService(selectedService);
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
          const firstResourceWithSlots = resources.find((r: any) =>
            slots.some((slot: any) => slot.rname === r.name)
          );
          setActiveResourceTab(
            firstResourceWithSlots ? firstResourceWithSlots.name : ""
          );
        } else {
          setTimeSlots([]);
          setActiveResourceTab("");
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
  }, [date, services, location, clubs, membership, form, selectedServiceId]);

  const debouncedCheckAvailability = debounce(async () => {
    if (!date || !location || !form.getValues("service") || !resources.length)
      return;
    try {
      const club = clubs.find((c) => c.name === location);
      const selectedServiceName = form.getValues("service");
      const selectedService = services.find(
        (s) => s.servicename === selectedServiceName
      );
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
        const firstResourceWithSlots = resources.find((r: any) =>
          slots.some((slot: any) => slot.rname === r.name)
        );
        if (
          firstResourceWithSlots &&
          !slots.some((slot: any) => slot.rname === activeResourceTab)
        ) {
          setActiveResourceTab(firstResourceWithSlots.name);
        }
      } else {
        setTimeSlots([]);
        setActiveResourceTab("");
      }
    } catch (error) {
      console.error("Error fetching slot availability:", error);
      setTimeSlots([]);
      setActiveResourceTab("");
    }
  }, 500);

  useEffect(() => {
    debouncedCheckAvailability();
    return () => debouncedCheckAvailability.cancel();
  }, [
    date,
    location,
    resources,
    clubs,
    services,
    activeResourceTab,
    debouncedCheckAvailability,
  ]);

  const handleGuestBooking = () => {
    if (activeTab !== "guest") {
      form.setValue("guest", undefined);
      form.clearErrors("guest");
      return;
    }
    form.setValue("guest", { name: "", email: "" });
  };

  const handleLocationChange = () => {
    form.setValue("service", "");
    form.setValue("timeSlot", null);
    setServices([]);
    setResources([]);
    setTimeSlots([]);
    setSelectedServiceId(null);
    setSelectedBenefitId(null);
    setSelectedService(null);
    setActiveResourceTab("");
    form.setValue("guest", undefined);
  };

  const handleServiceChange = (value: string) => {
    const selectedService = services.find((s) => s.servicename === value);
    if (
      activeTab === "guest" &&
      selectedService &&
      selectedService.servicename.toLowerCase().includes("guest free visit") &&
      selectedService.benefitBalance === 0
    ) {
      const guestPaidService = services.find(
        (s) =>
          s.servicename.toLowerCase().includes("guest paid visit") &&
          purchasedGuestPasses > 0
      );
      if (guestPaidService) {
        form.setValue("service", guestPaidService.servicename);
        setSelectedService(guestPaidService);
        setSelectedServiceId(guestPaidService.serviceid);
        setSelectedBenefitId(
          guestPaidService.benefitid ? Number(guestPaidService.benefitid) : null
        );
      } else {
        setShowPurchaseDialog(true);
        form.setValue("service", "");
        form.setValue("timeSlot", null);
        setResources([]);
        setTimeSlots([]);
        setSelectedServiceId(null);
        setSelectedBenefitId(null);
        setSelectedService(null);
        setActiveResourceTab("");
        form.setValue("guest", undefined);
        form.clearErrors("guest");
      }
      return;
    }
    form.setValue("timeSlot", null);
    setResources([]);
    setTimeSlots([]);
    setSelectedServiceId(selectedService?.serviceid || null);
    setSelectedBenefitId(
      selectedService?.benefitid ? Number(selectedService.benefitid) : null
    );
    setSelectedService(selectedService || null);
    setActiveResourceTab("");
    if (activeTab === "self") {
      form.setValue("guest", undefined);
      form.clearErrors("guest");
    } else {
      handleGuestBooking();
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "self" | "guest");
    form.setValue("service", "");
    form.setValue("timeSlot", null);
    setResources([]);
    setTimeSlots([]);
    setSelectedServiceId(null);
    setSelectedBenefitId(null);
    setSelectedService(null);
    setActiveResourceTab("");
    form.setValue("guest", undefined);
    form.clearErrors("guest");
    if (value === "guest") {
      handleGuestBooking();
    }
  };

  const handlePurchaseGuestPass = async () => {
    const token = localStorage.getItem("authToken");
    if (!token || !guestPassProductId) {
      toast.error("Unable to purchase guest pass", {
        description: "Product not available or not logged in.",
      });
      return;
    }

    try {
      setIsLoading(true);
      await purchaseProduct(token, guestPassProductId, 1);
      toast.success("Guest pass purchased successfully");

      const newPurchasedGuestPasses = purchasedGuestPasses + 1;
      setPurchasedGuestPasses(newPurchasedGuestPasses);
      await updateGuestData(
        token,
        guestPassesUsed,
        referralCodes,
        guestBookingIds,
        (await fetchGuestData(token)).guests,
        newPurchasedGuestPasses
      );

      const club = clubs.find((c) => c.name === location);
      if (club) {
        const fetchedServices = await fetchServices(token, undefined, club.id);
        const benefitBalances = await fetchMemberBenefitBalances(token);
        const memberServices = fetchedServices.map((s) => ({
          ...s,
          servicename: s.servicename.trim(),
          benefitBalance:
            benefitBalances.find((b: any) =>
              b.benefitname.toLowerCase().includes(s.servicename.toLowerCase())
            )?.balance ?? null,
        }));
        setServices(memberServices);

        const guestFreeService = memberServices.find(
          (s) =>
            s.benefitid &&
            s.servicename.toLowerCase().includes("guest free visit") &&
            s.benefitBalance !== null &&
            s.benefitBalance > 0
        );
        const guestPaidService = memberServices.find(
          (s) =>
            s.servicename.toLowerCase().includes("guest paid visit") &&
            newPurchasedGuestPasses > 0
        );
        if (guestFreeService) {
          form.setValue("service", guestFreeService.servicename);
          setSelectedService(guestFreeService);
          setSelectedServiceId(guestFreeService.serviceid);
          setSelectedBenefitId(Number(guestFreeService.benefitid));
          setShowPurchaseDialog(false);
          handleGuestBooking();
        } else if (guestPaidService) {
          form.setValue("service", guestPaidService.servicename);
          setSelectedService(guestPaidService);
          setSelectedServiceId(guestPaidService.serviceid);
          setSelectedBenefitId(
            guestPaidService.benefitid
              ? Number(guestPaidService.benefitid)
              : null
          );
          setShowPurchaseDialog(false);
          handleGuestBooking();
        } else {
          toast.warning("No guest services available after purchase", {
            description: "Please contact support.",
          });
        }
      }
    } catch (error: any) {
      console.error("Purchase guest pass error:", error);
      toast.error("Failed to purchase guest pass", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /*
  const onSubmit = async (data: z.infer<typeof teeTimeSchema>) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated - no token");
      if (!selectedServiceId) throw new Error("Service ID not loaded");
      if (!GYMMASTER_API_KEY) throw new Error("API key missing");
      if (!membership) throw new Error("No active membership found");
      if (!data.timeSlot) throw new Error("Please select a time slot");
      if (activeTab === "guest" && !data.guest)
        throw new Error("Guest details are required");

      const club = clubs.find((c) => c.name === data.location);
      if (!club) throw new Error("Selected club not found");

      const isGuestService = activeTab === "guest";
      const selectedService = services.find(
        (s) => s.servicename === data.service
      );
      if (
        isGuestService &&
        !selectedService?.servicename.toLowerCase().includes("guest")
      ) {
        throw new Error("Invalid guest service selected");
      }

      const isPaidGuestVisit = selectedService?.servicename
        .toLowerCase()
        .includes("guest paid visit");

      if (isPaidGuestVisit && purchasedGuestPasses <= 0) {
        throw new Error("No purchased guest passes available");
      }

      const newReferralCodes: string[] = [];
      const newBookingIds: number[] = [];
      const guestAssignments: number[] = [];

      const guestData = await fetchGuestData(token);

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
          guests: data.guest
            ? [
                {
                  name: data.guest.name,
                  email: data.guest.email,
                  date: data.guest.date,
                },
              ]
            : [],
          guestPassUsage: {
            free: data.service.toLowerCase().includes("guest free visit")
              ? 1
              : 0,
            charged: isPaidGuestVisit ? 1 : 0,
          },
          referralCodes: newReferralCodes,
          rid: data.timeSlot.rid,
          bookingstart: data.timeSlot.bookingstart,
          bookingend: data.timeSlot.bookingend,
          guestPassCharge: isPaidGuestVisit
            ? parseFloat(selectedService?.price.replace(/[^0-9.]/g, "") || "0")
            : 0,
        },
        token,
        selectedServiceId,
        data.timeSlot.rid,
        membership.id,
        selectedBenefitId || undefined
      );

      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        throw new Error(`Invalid booking ID: ${bookingId}`);
      }

      newBookingIds.push(bookingId);
      if (isGuestService && data.guest) {
        guestAssignments.push(bookingId);
        newReferralCodes.push(generateReferralCode());
      }

      if (isGuestService && data.guest) {
        const updatedGuestPassesUsed =
          guestData.guestPassesUsed +
          (data.service.toLowerCase().includes("guest free visit") ? 1 : 0);
        const updatedReferralCodes = [
          ...guestData.referralCodes,
          ...newReferralCodes,
        ];
        const updatedBookingIds = [
          ...guestData.guestBookingIds,
          ...guestAssignments,
        ].filter((id) => Number.isInteger(id) && id > 0);
        const updatedGuests = [
          ...guestData.guests,
          {
            name: data.guest.name,
            email: data.guest.email,
            date: data.guest.date,
          },
        ];

        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            await updateGuestData(
              token,
              updatedGuestPassesUsed,
              updatedReferralCodes,
              updatedBookingIds,
              updatedGuests,
              guestData.purchasedGuestPasses // Do not deduct purchasedGuestPasses
            );
            const reconciledData = await reconcileGuestData(
              token,
              updatedGuestPassesUsed,
              updatedReferralCodes,
              updatedBookingIds,
              updatedGuests,
              guestData.purchasedGuestPasses // Do not deduct purchasedGuestPasses
            );
            setGuestPassesUsed(reconciledData.guestPassesUsed);
            setReferralCodes(reconciledData.referralCodes);
            setGuestBookingIds(reconciledData.guestBookingIds);
            setPurchasedGuestPasses(reconciledData.purchasedGuestPasses);
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              console.warn(`Retry ${retryCount + 1} due to 413 error`);
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            console.error("Failed to update guest data:", error);
            toast.error("Failed to update guest pass data", {
              description:
                "Guest pass count may not be accurate. Please contact support.",
            });
            throw error;
          }
        }
      }

      const member = await fetchMemberDetails(token);
      await sendBookingConfirmationEmail(
        member.email,
        data,
        newBookingIds,
        availableGuestPasses,
        guestPassesUsed +
          (data.service.toLowerCase().includes("guest free visit") ? 1 : 0),
        purchasedGuestPasses // Send purchased passes without deduction
      );

      if (isGuestService && data.guest) {
        const referralCode = newReferralCodes[0];
        const referralLink = `${APP_URL}`;
        try {
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emailType: "invite",
              to: data.guest.email,
              name: data.guest.name || "Guest",
              referralCode,
              referralLink,
            }),
          });
          toast.success(`Invite email sent to ${data.guest.email}`);
        } catch (error) {
          console.error(
            `Failed to send invite email to ${data.guest.email}:`,
            error
          );
          toast.error(`Failed to send invite email to ${data.guest.email}`);
        }
      }

      const benefitBalances = await fetchMemberBenefitBalances(token);
      const updatedServices = services.map((s) => ({
        ...s,
        benefitBalance:
          benefitBalances.find((b: any) =>
            b.benefitname.toLowerCase().includes(s.servicename.toLowerCase())
          )?.balance ?? s.benefitBalance,
      }));
      setServices(updatedServices);
      const guestFreePassBenefit = benefitBalances.find(
        (benefit: any) =>
          benefit.benefitname.toLowerCase().includes("guest free visit") &&
          benefit.balance !== null
      );
      setAvailableGuestPasses(guestFreePassBenefit?.balance || 0);

      toast.success("Tee time booked!");

      form.reset({
        location: "",
        service: "",
        date: "",
        timeSlot: null,
        guest: undefined,
      });
      setTimeSlots([]);
      setShowItinerary(false);
      setActiveTab("self");
      setActiveResourceTab("");
      setSelectedService(null);
      setShowPurchaseDialog(false);
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
  */

  const onSubmit = async (data: z.infer<typeof teeTimeSchema>) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated - no token");
      if (!selectedServiceId) throw new Error("Service ID not loaded");
      if (!GYMMASTER_API_KEY) throw new Error("API key missing");
      if (!membership) throw new Error("No active membership found");
      if (!data.timeSlot) throw new Error("Please select a time slot");
      if (activeTab === "guest" && !data.guest)
        throw new Error("Guest details are required");

      const club = clubs.find((c) => c.name === data.location);
      if (!club) throw new Error("Selected club not found");

      const isGuestService = activeTab === "guest";
      const selectedService = services.find(
        (s) => s.servicename === data.service
      );
      if (
        isGuestService &&
        !selectedService?.servicename.toLowerCase().includes("guest")
      ) {
        throw new Error("Invalid guest service selected");
      }

      const isPaidGuestVisit = selectedService?.servicename
        .toLowerCase()
        .includes("guest paid visit");

      if (isPaidGuestVisit && purchasedGuestPasses <= 0) {
        throw new Error("No purchased guest passes available");
      }

      const newReferralCodes: string[] = [];
      const newBookingIds: number[] = [];
      const guestAssignments: number[] = [];

      const guestData = await fetchGuestData(token);

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
          guests: data.guest
            ? [
                {
                  name: data.guest.name,
                  email: data.guest.email,
                  date: data.guest.date,
                },
              ]
            : [],
          guestPassUsage: {
            free: data.service.toLowerCase().includes("guest free visit")
              ? 1
              : 0,
            charged: isPaidGuestVisit ? 1 : 0,
          },
          referralCodes: newReferralCodes,
          rid: data.timeSlot.rid,
          bookingstart: data.timeSlot.bookingstart,
          bookingend: data.timeSlot.bookingend,
          guestPassCharge: isPaidGuestVisit
            ? parseFloat(selectedService?.price.replace(/[^0-9.]/g, "") || "0")
            : 0,
        },
        token,
        selectedServiceId,
        data.timeSlot.rid,
        membership.id,
        selectedBenefitId || undefined
      );

      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        throw new Error(`Invalid booking ID: ${bookingId}`);
      }

      newBookingIds.push(bookingId);
      if (isGuestService && data.guest) {
        guestAssignments.push(bookingId);
        newReferralCodes.push(generateReferralCode());
      }

      if (isGuestService && data.guest) {
        const updatedGuestPassesUsed =
          guestData.guestPassesUsed +
          (data.service.toLowerCase().includes("guest free visit") ? 1 : 0);
        const updatedReferralCodes = [
          ...guestData.referralCodes,
          ...newReferralCodes,
        ];
        const updatedBookingIds = [
          ...guestData.guestBookingIds,
          ...guestAssignments,
        ].filter((id) => Number.isInteger(id) && id > 0);
        const updatedGuests = [
          ...guestData.guests,
          {
            name: data.guest.name,
            email: data.guest.email,
            date: data.guest.date,
          },
        ];
        const updatedPurchasedGuestPasses = isPaidGuestVisit
          ? Math.max(purchasedGuestPasses - 1, 0) // Deduct 1 from purchased passes
          : guestData.purchasedGuestPasses;

        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            await updateGuestData(
              token,
              updatedGuestPassesUsed,
              updatedReferralCodes,
              updatedBookingIds,
              updatedGuests,
              updatedPurchasedGuestPasses
            );
            const reconciledData = await reconcileGuestData(
              token,
              updatedGuestPassesUsed,
              updatedReferralCodes,
              updatedBookingIds,
              updatedGuests,
              updatedPurchasedGuestPasses
            );
            setGuestPassesUsed(reconciledData.guestPassesUsed);
            setReferralCodes(reconciledData.referralCodes);
            setGuestBookingIds(reconciledData.guestBookingIds);
            setPurchasedGuestPasses(reconciledData.purchasedGuestPasses);
            break;
          } catch (error: any) {
            if (error.response?.status === 413 && retryCount < maxRetries - 1) {
              console.warn(`Retry ${retryCount + 1} due to 413 error`);
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            console.error("Failed to update guest data:", error);
            toast.error("Failed to update guest pass data", {
              description:
                "Guest pass count may not be accurate. Please contact support.",
            });
            throw error;
          }
        }
      }

      const member = await fetchMemberDetails(token);
      await sendBookingConfirmationEmail(
        member.email,
        data,
        newBookingIds,
        availableGuestPasses,
        guestPassesUsed +
          (data.service.toLowerCase().includes("guest free visit") ? 1 : 0),
        purchasedGuestPasses - (isPaidGuestVisit ? 1 : 0) // Reflect deduction in email
      );

      if (isGuestService && data.guest) {
        const referralCode = newReferralCodes[0];
        const referralLink = `${APP_URL}`;
        try {
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emailType: "invite",
              to: data.guest.email,
              name: data.guest.name || "Guest",
              referralCode,
              referralLink,
            }),
          });
          toast.success(`Invite email sent to ${data.guest.email}`);
        } catch (error) {
          console.error(
            `Failed to send invite email to ${data.guest.email}:`,
            error
          );
          toast.error(`Failed to send invite email to ${data.guest.email}`);
        }
      }

      const benefitBalances = await fetchMemberBenefitBalances(token);
      const updatedServices = services.map((s) => ({
        ...s,
        benefitBalance:
          benefitBalances.find((b: any) =>
            b.benefitname.toLowerCase().includes(s.servicename.toLowerCase())
          )?.balance ?? s.benefitBalance,
      }));
      setServices(updatedServices);
      const guestFreePassBenefit = benefitBalances.find(
        (benefit: any) =>
          benefit.benefitname.toLowerCase().includes("guest free visit") &&
          benefit.balance !== null
      );
      setAvailableGuestPasses(guestFreePassBenefit?.balance || 0);

      toast.success("Tee time booked!");

      form.reset({
        location: "",
        service: "",
        date: "",
        timeSlot: null,
        guest: undefined,
      });
      setTimeSlots([]);
      setShowItinerary(false);
      setActiveTab("self");
      setActiveResourceTab("");
      setSelectedService(null);
      setShowPurchaseDialog(false);
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

  const selfServices = services.filter(
    (svc) => !svc.servicename.toLowerCase().includes("guest")
  );
  const guestServices = services.filter(
    (svc) =>
      svc.servicename.toLowerCase().includes("guest") &&
      (svc.servicename.toLowerCase().includes("guest free visit")
        ? svc.benefitBalance !== null && svc.benefitBalance > 0
        : purchasedGuestPasses > 0)
  );

  return (
    <div className="space-y-4">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center text-foreground"
      >
        Book a Tee Time
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 bg-background p-6 rounded-lg shadow-md"
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
                    <FormLabel className="text-sm sm:text-base flex items-center gap-2 text-foreground">
                      <Calendar
                        className="h-5 w-5 text-foreground"
                        aria-hidden="true"
                      />
                      Choose Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        min={new Date().toISOString().split("T")[0]}
                        className="border-input focus:border-primary focus:ring-primary"
                      />
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm text-destructive" />
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
                    <FormLabel className="text-sm sm:text-base flex items-center gap-2 text-foreground">
                      <MapPin
                        className="h-5 w-5 text-foreground"
                        aria-hidden="true"
                      />
                      Choose Location
                    </FormLabel>
                    <FormControl>
                      {isFetchingClubs ? (
                        <div className="flex items-center gap-2 w-full sm:w-64 p-2 border border-input rounded-md">
                          <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                          <span className="text-muted-foreground">
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
                          className="w-full sm:w-64 p-2 border border-input rounded-md focus:border-primary focus:ring-primary bg-background text-foreground"
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
                    <FormMessage className="text-xs sm:text-sm text-destructive" />
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
                    <FormLabel className="text-sm sm:text-base flex items-center gap-2 text-foreground">
                      <MapPin
                        className="h-5 w-5 text-foreground"
                        aria-hidden="true"
                      />
                      Choose Service
                    </FormLabel>
                    <Tabs
                      defaultValue="self"
                      value={activeTab}
                      onValueChange={handleTabChange}
                      className="w-full"
                    >
                      <TabsList className="grid w-full sm:w-64 grid-cols-2 mb-2">
                        <TabsTrigger value="self">Self</TabsTrigger>
                        <TabsTrigger value="guest">Guest</TabsTrigger>
                      </TabsList>
                      <TabsContent value="self">
                        <FormControl>
                          {isFetchingServices ? (
                            <div className="flex items-center gap-2 w-full sm:w-64 p-2 border border-input rounded-md">
                              <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                              <span className="text-muted-foreground">
                                Loading services...
                              </span>
                            </div>
                          ) : (
                            <select
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                handleServiceChange(e.target.value);
                              }}
                              className="w-full sm:w-64 p-2 border border-input rounded-md focus:border-primary focus:ring-primary bg-background text-foreground"
                              disabled={!location}
                            >
                              <option value="">Select a service</option>
                              {selfServices.map((svc) => (
                                <option
                                  key={svc.serviceid}
                                  value={svc.servicename}
                                >
                                  {svc.pricedescription || svc.servicename}
                                  {svc.benefitBalance !== null &&
                                  svc.benefitBalance !== undefined
                                    ? ` (${svc.benefitBalance} remaining)`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          )}
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm text-destructive" />
                      </TabsContent>
                      <TabsContent value="guest">
                        <FormControl>
                          {isFetchingServices ? (
                            <div className="flex items-center gap-2 w-full sm:w-64 p-2 border border-input rounded-md">
                              <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                              <span className="text-muted-foreground">
                                Loading services...
                              </span>
                            </div>
                          ) : (
                            <select
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                handleServiceChange(e.target.value);
                              }}
                              className="w-full sm:w-64 p-2 border border-input rounded-md focus:border-primary focus:ring-primary bg-background text-foreground"
                              disabled={!location}
                            >
                              <option value="">Select a guest service</option>
                              {guestServices.map((svc) => (
                                <option
                                  key={svc.serviceid}
                                  value={svc.servicename}
                                >
                                  {svc.pricedescription || svc.servicename}
                                  {svc.servicename
                                    .toLowerCase()
                                    .includes("guest free visit")
                                    ? ` (${svc.benefitBalance} remaining)`
                                    : ` (${purchasedGuestPasses} purchased)`}
                                </option>
                              ))}
                            </select>
                          )}
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm text-destructive" />
                      </TabsContent>
                    </Tabs>
                  </FormItem>
                )}
              />
            </motion.div>

            {activeTab === "guest" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              >
                <FormLabel className="text-sm sm:text-base flex items-center gap-2 text-foreground">
                  <Users
                    className="h-5 w-5 text-foreground"
                    aria-hidden="true"
                  />
                  Guest Details (Required)
                </FormLabel>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 border border-input p-4 rounded-md bg-muted"
                >
                  <h4 className="text-sm font-medium text-foreground">Guest</h4>
                  <FormField
                    control={form.control}
                    name="guest.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm text-muted-foreground">
                          Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Guest Name"
                            {...field}
                            className="border-input focus:border-primary focus:ring-primary bg-background text-foreground"
                          />
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm text-destructive" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guest.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm text-muted-foreground">
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="guest@example.com"
                            {...field}
                            className="border-input focus:border-primary focus:ring-primary bg-background text-foreground"
                          />
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm text-destructive" />
                      </FormItem>
                    )}
                  />
                </motion.div>
              </motion.div>
            )}

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
                    <FormLabel className="text-sm sm:text-base text-foreground">
                      Available Time Slots
                    </FormLabel>
                    <FormControl>
                      {isFetchingSlots ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
                          <span className="ml-2 text-muted-foreground">
                            Loading time slots...
                          </span>
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="text-center p-4 text-muted-foreground">
                          No available time slots for {date}
                        </div>
                      ) : (
                        <Tabs
                          value={activeResourceTab}
                          onValueChange={setActiveResourceTab}
                          className="w-full"
                        >
                          <TabsList className="w-full flex flex-wrap justify-start mb-4">
                            {resources
                              .filter((resource: any) =>
                                timeSlots.some(
                                  (slot) => slot.rname === resource.name
                                )
                              )
                              .map((resource: any) => (
                                <TabsTrigger
                                  key={resource.id}
                                  value={resource.name}
                                  className="text-sm"
                                >
                                  {resource.name}
                                </TabsTrigger>
                              ))}
                          </TabsList>
                          {resources
                            .filter((resource: any) =>
                              timeSlots.some(
                                (slot) => slot.rname === resource.name
                              )
                            )
                            .map((resource: any) => (
                              <TabsContent
                                key={resource.id}
                                value={resource.name}
                              >
                                <div className="border border-input p-4 rounded-md bg-muted">
                                  <h4 className="text-sm font-medium text-foreground mb-2">
                                    {resource.name}
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {timeSlots
                                      .filter(
                                        (slot) => slot.rname === resource.name
                                      )
                                      .map((slot) => (
                                        <Button
                                          key={`${slot.rid}-${slot.bookingstart}`}
                                          type="button"
                                          variant={
                                            form.getValues("timeSlot")
                                              ?.start_str === slot.start_str &&
                                            form.getValues("timeSlot")
                                              ?.rname === slot.rname
                                              ? "default"
                                              : "outline"
                                          }
                                          className="text-sm"
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
                              </TabsContent>
                            ))}
                        </Tabs>
                      )}
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm text-destructive" />
                  </FormItem>
                )}
              />
            </motion.div>

            <Dialog
              open={showPurchaseDialog}
              onOpenChange={setShowPurchaseDialog}
            >
              <DialogContent className="sm:max-w-lg">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-xl text-foreground">
                      No Guest Passes Available
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      You have no guest passes available. Purchase additional
                      guest passes to enable Guest Paid Visit bookings.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm sm:text-base text-foreground">
                      <strong>Available Product:</strong>{" "}
                      {guestPassProductId
                        ? products.find(
                            (p) => p.productid === guestPassProductId
                          )?.name || "Guest Pass Add-On"
                        : "No guest pass product available"}
                    </p>
                    <p className="text-sm sm:text-base text-foreground">
                      <strong>Price:</strong>{" "}
                      {guestPassProductId
                        ? products.find(
                            (p) => p.productid === guestPassProductId
                          )?.price || "Contact support"
                        : "Contact support"}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      disabled={isLoading || !guestPassProductId}
                      onClick={handlePurchaseGuestPass}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Purchase Guest Pass"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setShowPurchaseDialog(false);
                        setActiveTab("self");
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              </DialogContent>
            </Dialog>

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
              <DialogContent className="sm:max-w-lg">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-xl text-foreground">
                      Review Your Booking
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Confirm your tee time details below.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm sm:text-base text-foreground">
                      <strong>Location:</strong>{" "}
                      {form.getValues("location") || "Not selected"}
                    </p>
                    <p className="text-sm sm:text-base text-foreground">
                      <strong>Service:</strong>{" "}
                      {form.getValues("service") || "Not selected"}
                    </p>
                    <p className="text-sm sm:text-base text-foreground">
                      <strong>Date:</strong>{" "}
                      {form.getValues("date") || "Not selected"}
                    </p>
                    <div>
                      <strong className="text-sm sm:text-base text-foreground">
                        Time Slot:
                      </strong>
                      {form.getValues("timeSlot") ? (
                        <ul className="list-disc pl-5 mt-1">
                          <li className="text-sm sm:text-base text-muted-foreground">
                            {form.getValues("timeSlot")!.start_str} -{" "}
                            {form.getValues("timeSlot")!.end_str} at{" "}
                            {form.getValues("timeSlot")!.rname}
                          </li>
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">
                          Not selected
                        </span>
                      )}
                    </div>
                    {activeTab === "guest" && form.getValues("guest") && (
                      <div>
                        <strong className="text-sm sm:text-base text-foreground">
                          Guest:
                        </strong>
                        <ul className="list-disc pl-5 mt-1">
                          <li className="text-sm sm:text-base text-muted-foreground">
                            {form.getValues("guest")!.name} (
                            {form.getValues("guest")!.email})
                          </li>
                        </ul>
                      </div>
                    )}
                    {activeTab === "guest" && (
                      <p className="text-sm sm:text-base text-muted-foreground">
                        <strong>Guest Pass Usage:</strong>{" "}
                        {selectedService?.servicename
                          .toLowerCase()
                          .includes("guest free visit")
                          ? `1 free pass will be used (${selectedService?.benefitBalance} remaining).`
                          : selectedService?.servicename
                                .toLowerCase()
                                .includes("guest paid visit")
                            ? `1 purchased pass will be used.`
                            : "Please purchase a guest pass to continue."}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
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
                      className="w-full sm:w-auto"
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
