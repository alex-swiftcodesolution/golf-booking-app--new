"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion"; // For animations

const teeTimeSchema = z.object({
  location: z.string().min(1, "Please select a location"),
  date: z.string().min(1, "Please select a date"),
  startTime: z.string().min(1, "Please select a start time"),
  duration: z.enum(["1hr", "2hr", "3hr", "4hr"]),
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

// Mock unavailable slots
const unavailableSlots = new Set(["9:30 AM", "10:00 AM", "2:00 PM", "2:30 PM"]);

// Mock guest passes (to be handled by backend later)
const freeGuestPassesPerMonth = 2;
const guestPassCharge = 10; // $10 per extra guest pass

export default function BookTeeTime() {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);
  const [guestCount, setGuestCount] = useState(0); // Track guest count separately

  const form = useForm<z.infer<typeof teeTimeSchema>>({
    resolver: zodResolver(teeTimeSchema),
    defaultValues: {
      location: "",
      date: "",
      startTime: "",
      duration: "1hr",
      guests: [],
    },
  });

  const bays = ["Bay 1", "Bay 2", "Bay 3"];
  const timeSlots = Array.from({ length: 16 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute} ${period}`;
  });

  const parseTimeSlot = (time: string) => {
    const [hourMinute, period] = time.split(" ");
    let hour = Number(hourMinute.split(":")[0]); // Extract and convert hour
    const minute = Number(hourMinute.split(":")[1]); // Extract and convert minute
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return { hour, minute };
  };

  const checkTimeSlotConflict = (startTime: string, duration: string) => {
    const { hour: startHour, minute: startMinute } = parseTimeSlot(startTime);
    const durationHours = parseInt(duration);
    const startMinutes = startHour * 60 + startMinute;

    for (let i = 0; i < durationHours * 2; i++) {
      const slotMinutes = startMinutes + i * 30;
      const slotHour = Math.floor(slotMinutes / 60);
      const slotMinute = slotMinutes % 60;
      const period = slotHour >= 12 ? "PM" : "AM";
      const displayHour =
        slotHour > 12 ? slotHour - 12 : slotHour === 0 ? 12 : slotHour;
      const slotTime = `${displayHour}:${
        slotMinute === 0 ? "00" : "30"
      } ${period}`;
      if (unavailableSlots.has(slotTime)) {
        return slotTime;
      }
    }
    return null;
  };

  const handleTimeSelect = (time: string) => {
    const duration = form.getValues("duration");
    const conflictSlot = checkTimeSlotConflict(time, duration);
    if (conflictSlot) {
      toast.error("Time slot conflict", {
        description: `The slot at ${conflictSlot} is unavailable for your selected duration.`,
      });
      setSelectedTime(null);
      form.setValue("startTime", "");
    } else {
      setSelectedTime(time);
      form.setValue("startTime", time);
    }
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
  };

  const onSubmit = async (data: z.infer<typeof teeTimeSchema>) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock guest pass logic
    const guests = data.guests || [];
    const extraGuests = Math.max(guests.length - freeGuestPassesPerMonth, 0);
    const extraCharge = extraGuests * guestPassCharge;

    // Mock sending SMS to guests
    if (guests.length > 0) {
      guests.forEach((guest) => {
        toast.info("SMS sent to guest", {
          description: `A link to sign the waiver was sent to ${guest.name} (${guest.cell})`,
        });
      });
    }

    toast.success("Tee time booked!", {
      description: `Booked at ${data.location} on ${data.date} at ${
        data.startTime
      } for ${data.duration}${
        guests.length ? ` with ${guests.length} guest(s)` : ""
      }${extraCharge > 0 ? ` (Extra charge: $${extraCharge})` : ""}`,
    });
    setIsLoading(false);
    setShowItinerary(false);
    form.reset();
    setSelectedTime(null);
    setGuestCount(0);
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
        className="w-full max-w-3xl mx-auto space-y-6 sm:space-y-8"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Choose Location
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full sm:text-base">
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="loc1">Location 1</SelectItem>
                        <SelectItem value="loc2">Location 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs sm:text-sm" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Choose Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="w-full sm:text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="startTime"
              render={() => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    Available Times
                  </FormLabel>
                  <div className="mt-2 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">
                            Time
                          </TableHead>
                          {bays.map((bay) => (
                            <TableHead
                              key={bay}
                              className="text-center text-xs sm:text-sm"
                            >
                              {bay}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeSlots.map((time) => (
                          <TableRow key={time}>
                            <TableCell className="font-medium text-xs sm:text-sm">
                              {time}
                            </TableCell>
                            {bays.map((bay) => (
                              <TableCell
                                key={`${bay}-${time}`}
                                className="text-center"
                              >
                                <Button
                                  variant={
                                    selectedTime === time
                                      ? "default"
                                      : unavailableSlots.has(time)
                                      ? "destructive"
                                      : "outline"
                                  }
                                  onClick={() => handleTimeSelect(time)}
                                  className="w-full text-xs sm:text-sm py-1 sm:py-2"
                                  disabled={
                                    (selectedTime && selectedTime !== time) ||
                                    unavailableSlots.has(time)
                                  }
                                >
                                  {selectedTime === time
                                    ? "Selected"
                                    : unavailableSlots.has(time)
                                    ? "Unavailable"
                                    : "Book"}
                                </Button>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    Duration
                  </FormLabel>
                  <RadioGroup
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (selectedTime) {
                        handleTimeSelect(selectedTime); // Recheck conflicts
                      }
                    }}
                    defaultValue={field.value}
                    className="flex flex-wrap gap-2 sm:gap-4 mt-2"
                  >
                    {["1hr", "2hr", "3hr", "4hr"].map((duration) => (
                      <div
                        key={duration}
                        className="flex items-center space-x-2"
                      >
                        <RadioGroupItem value={duration} id={duration} />
                        <Label
                          htmlFor={duration}
                          className="text-sm sm:text-base"
                        >
                          {duration}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <FormMessage className="text-xs sm:text-sm" />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="text-sm sm:text-base">
                Bring a Guest
              </FormLabel>
              <div className="flex gap-2 sm:gap-4 mt-2">
                {[1, 2, 3].map((count) => (
                  <Button
                    key={count}
                    type="button"
                    variant={guestCount === count ? "default" : "outline"}
                    onClick={() => handleGuestCountChange(count)}
                    className="text-sm sm:text-base"
                  >
                    {count}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleGuestCountChange(0)}
                  className="text-sm sm:text-base"
                >
                  None
                </Button>
              </div>
              {guestCount > 0 && (
                <div className="mt-4 space-y-4">
                  {Array.from({ length: guestCount }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <FormField
                        control={form.control}
                        name={`guests.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base">
                              Guest {index + 1} Name
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
                            <FormLabel className="text-sm sm:text-base">
                              Guest {index + 1} Cell
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
                </div>
              )}
            </div>

            <Dialog open={showItinerary} onOpenChange={setShowItinerary}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  className="w-full py-2.5 sm:py-3 text-lg sm:text-base"
                  disabled={
                    !form.watch("location") ||
                    !form.watch("date") ||
                    !selectedTime ||
                    form.formState.isSubmitting
                  }
                  onClick={() => {
                    if (form.formState.isValid) {
                      setShowItinerary(true);
                    } else {
                      toast.error("Please fill all required fields");
                    }
                  }}
                >
                  Review Itinerary
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Itinerary</DialogTitle>
                  <DialogDescription>
                    Review your booking details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <p>
                    <strong>Location:</strong>{" "}
                    {form.watch("location") || "Not selected"}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {form.watch("date") || "Not selected"}
                  </p>
                  <p>
                    <strong>Start Time:</strong>{" "}
                    {form.watch("startTime") || "Not selected"}
                  </p>
                  <p>
                    <strong>Duration:</strong>{" "}
                    {form.watch("duration") || "Not selected"}
                  </p>
                  {(form.watch("guests") || []).length > 0 && (
                    <div>
                      <strong>Guests:</strong>
                      <ul className="list-disc pl-5">
                        {(form.watch("guests") || []).map((guest, index) => (
                          <li key={index} className="text-sm sm:text-base">
                            {guest.name} ({guest.cell})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(form.watch("guests") || []).length > 0 && (
                    <p className="text-sm sm:text-base text-gray-600">
                      <strong>Guest Pass Usage:</strong>{" "}
                      {Math.min(
                        (form.watch("guests") || []).length,
                        freeGuestPassesPerMonth
                      )}{" "}
                      free pass(es) used.{" "}
                      {(form.watch("guests") || []).length >
                      freeGuestPassesPerMonth
                        ? `Extra charge: $${
                            ((form.watch("guests") || []).length -
                              freeGuestPassesPerMonth) *
                            guestPassCharge
                          }`
                        : ""}
                    </p>
                  )}
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="submit"
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
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setShowItinerary(false)}
                  >
                    Edit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
