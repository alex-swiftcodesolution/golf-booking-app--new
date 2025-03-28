"use client";
import { useState } from "react";
import { useForm, useFormState } from "react-hook-form";
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

// Schema for booking tee time
const teeTimeSchema = z.object({
  location: z.string().min(1, "Please select a location"),
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

// Mock locations and bays
const locations = ["Location 1", "Location 2"];
const bays = ["Bay 1", "Bay 2", "Bay 3"];

// Mock unavailable slots
const unavailableSlots = new Set([
  "1:00 AM",
  "1:30 AM",
  "9:30 AM",
  "10:00 AM",
  "2:00 PM",
  "2:30 PM",
  "11:00 PM",
  "11:30 PM",
]);

// Mock guest passes (to be handled by backend later)
const freeGuestPassesPerMonth = 2;
const guestPassCharge = 10; // $10 per extra guest pass

export default function BookTeeTime() {
  const [selectedSlots, setSelectedSlots] = useState<
    { time: string; bay: string }[]
  >([]); // Store multiple selected time slots
  const [isLoading, setIsLoading] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);
  const [guestCount, setGuestCount] = useState(0);

  const { addBooking, bookings } = useBookings();

  const form = useForm<z.infer<typeof teeTimeSchema>>({
    resolver: zodResolver(teeTimeSchema),
    defaultValues: {
      location: "",
      date: "",
      timeSlots: [],
      guests: [],
    },
  });

  const { isValid } = useFormState({ control: form.control });

  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute} ${period}`;
  });

  const parseTimeSlot = (time: string) => {
    const [hourMinute, period] = time.split(" ");
    let hour = Number(hourMinute.split(":")[0]);
    const minute = Number(hourMinute.split(":")[1]);
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return { hour, minute };
  };

  const checkTimeSlotConflict = (startTime: string, bay: string) => {
    const { hour: startHour, minute: startMinute } = parseTimeSlot(startTime);
    const startMinutes = startHour * 60 + startMinute;

    // Check the next 30-minute slot for unavailability
    const slotMinutes = startMinutes + 30;
    const slotHour = Math.floor(slotMinutes / 60);
    const slotMinute = slotMinutes % 60;
    const period = slotHour >= 12 ? "PM" : "AM";
    const displayHour =
      slotHour > 12 ? slotHour - 12 : slotHour === 0 ? 12 : slotHour;
    const slotTime = `${displayHour}:${
      slotMinute === 0 ? "00" : "30"
    } ${period}`;

    // Check against existing bookings in BookingContext
    const conflictBooking = bookings.find(
      (booking) =>
        booking.date === form.getValues("date") &&
        booking.location === form.getValues("location") &&
        booking.bay === bay &&
        (booking.time === startTime || booking.time === slotTime)
    );

    if (conflictBooking) {
      return conflictBooking.time;
    }

    return unavailableSlots.has(startTime) || unavailableSlots.has(slotTime)
      ? slotTime
      : null;
  };

  const handleTimeSelect = (time: string, bay: string) => {
    if (!form.getValues("location")) {
      toast.error("Please select a location first");
      return;
    }

    const conflictSlot = checkTimeSlotConflict(time, bay);
    if (conflictSlot) {
      toast.error("Time slot conflict", {
        description: `The slot at ${time} or ${conflictSlot} in ${bay} is unavailable.`,
      });
      return;
    }

    // Check if the slot is already selected
    const slotIndex = selectedSlots.findIndex(
      (slot) => slot.time === time && slot.bay === bay
    );

    let updatedSlots;
    if (slotIndex >= 0) {
      // Deselect the slot
      updatedSlots = selectedSlots.filter(
        (slot) => !(slot.time === time && slot.bay === bay)
      );
      toast.info("Time slot deselected", {
        description: `Removed ${time} at ${bay}.`,
      });
    } else {
      // Select the slot
      updatedSlots = [...selectedSlots, { time, bay }];
      toast.info("Time slot chosen", {
        description: `Added ${time} at ${bay}.`,
      });
    }

    setSelectedSlots(updatedSlots);
    form.setValue("timeSlots", updatedSlots);
  };

  const handleGuestCountChange = (count: number) => {
    setGuestCount(count);
    const currentGuests = form.getValues("guests") || [];
    form.setValue(
      "guests",
      Array(count)
        .fill(null)
        .map((_, i) => currentGuests[i] || { name: "", cell: "" })
    );
    if (count === 0) {
      form.clearErrors("guests");
    }
  };

  const handleLocationChange = () => {
    setSelectedSlots([]);
    form.setValue("timeSlots", []);
  };

  const onSubmit = async (data: z.infer<typeof teeTimeSchema>) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const guests = data.guests || [];
      const extraGuests = Math.max(guests.length - freeGuestPassesPerMonth, 0);
      const extraCharge = extraGuests * guestPassCharge;

      // Add each selected time slot as a separate booking
      for (const slot of data.timeSlots) {
        addBooking({
          date: data.date,
          time: slot.time,
          location: data.location,
          bay: slot.bay,
          guests: guests,
          guestPassUsage: {
            free: Math.min(guests.length, freeGuestPassesPerMonth),
            charged: extraGuests,
          },
        });
      }

      if (guests.length > 0) {
        guests.forEach((guest) => {
          toast.info("SMS sent to guest", {
            description: `A link to sign the waiver was sent to ${guest.name} (${guest.cell})`,
          });
        });
      }

      toast.success("Tee times booked!", {
        description: `Booked ${data.timeSlots.length} time slot(s) at ${
          data.location
        } on ${data.date}${
          guests.length ? ` with ${guests.length} guest(s)` : ""
        }${extraCharge > 0 ? ` (Extra charge: $${extraCharge})` : ""}`,
      });

      // Reset the form and all states
      form.reset({
        location: "",
        date: "",
        timeSlots: [],
        guests: [],
      });
      setSelectedSlots([]);
      setGuestCount(0);
      setShowItinerary(false);
      form.clearErrors();
    } catch {
      toast.error("Failed to book tee times", {
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const values = form.watch();
    const requiredFieldsValid =
      values.location && values.date && values.timeSlots.length > 0;
    const valid = requiredFieldsValid && (guestCount === 0 || isValid);
    return valid;
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
            {/* Choose Date */}
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

            {/* Bring Guests */}
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

            {/* Choose Location */}
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
                    <select
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        handleLocationChange();
                      }}
                      className="w-full sm:w-64 p-2 border rounded-md"
                    >
                      <option value="">Select a location</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />

            {/* Available Times */}
            <FormField
              control={form.control}
              name="timeSlots"
              render={() => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    Available Times
                  </FormLabel>
                  <div className="mt-2 max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs w-[80px] sm:w-[100px] sticky top-0 bg-white">
                            Time
                          </TableHead>
                          {bays.map((bay) => (
                            <TableHead
                              key={bay}
                              className="text-center text-xs w-[60px] sm:w-[80px] sticky top-0 bg-white"
                            >
                              {bay}
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
                            {bays.map((bay) => {
                              const isSelected = selectedSlots.some(
                                (slot) => slot.time === time && slot.bay === bay
                              );
                              const isUnavailable = unavailableSlots.has(time);
                              return (
                                <TableCell
                                  key={`${bay}-${time}`}
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
                                    onClick={() => handleTimeSelect(time, bay)}
                                    className="w-full text-[10px] sm:text-xs py-0.5 sm:py-1 px-1 sm:px-2"
                                    disabled={
                                      isUnavailable || !form.watch("location")
                                    }
                                    aria-label={
                                      isSelected
                                        ? `Selected: ${time} at ${bay}`
                                        : isUnavailable
                                        ? `Unavailable: ${time} at ${bay}`
                                        : `Choose ${time} at ${bay}`
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
                  </div>
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />

            {/* Review Itinerary Button */}
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
                        freeGuestPassesPerMonth
                      )}{" "}
                      free pass(es) used.{" "}
                      {(form.getValues("guests") || []).length >
                      freeGuestPassesPerMonth
                        ? `Extra charge: $${
                            ((form.getValues("guests") || []).length -
                              freeGuestPassesPerMonth) *
                            guestPassCharge
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
