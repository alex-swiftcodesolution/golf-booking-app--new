"use client";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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

const teeTimeSchema = z.object({
  location: z.string().min(1, "Please select a location"),
  date: z.string().min(1, "Please select a date"),
  startTime: z.string().min(1, "Please select a start time"),
  duration: z.enum(["1hr", "2hr", "3hr", "4hr"]),
  guests: z
    .array(
      z.object({
        name: z.string().min(1, "Guest name is required"),
        cell: z.string().min(10, "Please enter a valid phone number"),
      })
    )
    .optional(),
});

// Mock unavailable slots (e.g., pre-booked times)
const unavailableSlots = new Set(["9:30 AM", "10:00 AM", "2:00 PM", "2:30 PM"]);

export default function BookTeeTime() {
  const [guestCount, setGuestCount] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);

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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "guests",
  });

  const onSubmit = async (data: z.infer<typeof teeTimeSchema>) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Tee time booked!", {
      description: `Booked at ${data.location} on ${data.date} at ${
        data.startTime
      } for ${data.duration}${
        data.guests?.length ? ` with ${data.guests.length} guest(s)` : ""
      }`,
    });
    setIsLoading(false);
    setShowItinerary(false);
  };

  const addGuest = (count: number) => {
    setGuestCount(count);
    const currentGuests = form.getValues("guests") || [];
    form.setValue(
      "guests",
      Array(count)
        .fill(null)
        .map((_, i) => currentGuests[i] || { name: "", cell: "" })
    );
  };

  const bays = ["Bay 1", "Bay 2", "Bay 3"];
  const timeSlots = Array.from({ length: 16 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
  });

  const handleTimeSelect = (time: string) => {
    if (!unavailableSlots.has(time)) {
      setSelectedTime(time);
      form.setValue("startTime", time);
    } else {
      toast.error("Slot unavailable", {
        description: "This time is already booked.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Book a Tee Time</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full max-w-md space-y-6"
        >
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Choose Location</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="loc1">Location 1</SelectItem>
                    <SelectItem value="loc2">Location 2</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Choose Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startTime"
            render={() => (
              <FormItem>
                <FormLabel>Available Times</FormLabel>
                <div className="mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        {bays.map((bay) => (
                          <TableHead key={bay} className="text-center">
                            {bay}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeSlots.map((time) => (
                        <TableRow key={time}>
                          <TableCell className="font-medium">{time}</TableCell>
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
                                className="w-full"
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
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration</FormLabel>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1hr" id="1hr" />
                    <Label htmlFor="1hr">1 hr</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2hr" id="2hr" />
                    <Label htmlFor="2hr">2 hr</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3hr" id="3hr" />
                    <Label htmlFor="3hr">3 hr</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4hr" id="4hr" />
                    <Label htmlFor="4hr">4 hr</Label>
                  </div>
                </RadioGroup>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <FormLabel>Bring a Guest</FormLabel>
            <div className="flex space-x-2 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => addGuest(1)}
              >
                1
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => addGuest(2)}
              >
                2
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => addGuest(3)}
              >
                3
              </Button>
            </div>
            {fields.length > 0 && (
              <div className="mt-4 space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-2">
                    <FormField
                      control={form.control}
                      name={`guests.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guest {index + 1} Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Guest Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`guests.${index}.cell`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guest {index + 1} Cell</FormLabel>
                          <FormControl>
                            <Input placeholder="123-456-7890" {...field} />
                          </FormControl>
                          <FormMessage />
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
              <Button type="button" className="w-full" disabled={!selectedTime}>
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
                  <strong>Date:</strong> {form.watch("date") || "Not selected"}
                </p>
                <p>
                  <strong>Start Time:</strong>{" "}
                  {form.watch("startTime") || "Not selected"}
                </p>
                <p>
                  <strong>Duration:</strong>{" "}
                  {form.watch("duration") || "Not selected"}
                </p>
                {form.watch("guests")?.length > 0 && (
                  <div>
                    <strong>Guests:</strong>
                    <ul className="list-disc pl-5">
                      {form.watch("guests").map((guest, index) => (
                        <li key={index}>
                          {guest.name} ({guest.cell})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !selectedTime}
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
                  onClick={() => setShowItinerary(false)}
                >
                  Edit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </form>
      </Form>
    </div>
  );
}
