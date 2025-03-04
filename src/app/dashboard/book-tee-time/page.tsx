"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function BookTeeTime() {
  const [guestCount, setGuestCount] = useState(0);

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

  const onSubmit = (data: z.infer<typeof teeTimeSchema>) => {
    console.log("Tee Time data:", data);
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Available Times</FormLabel>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => field.onChange("9:00 AM")}
                  >
                    9:00 AM
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => field.onChange("9:30 AM")}
                  >
                    9:30 AM
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => field.onChange("10:00 AM")}
                  >
                    10:00 AM
                  </Button>
                </div>
                <FormControl>
                  <Input type="hidden" {...field} />
                </FormControl>
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
            <Label>Bring a Guest</Label>
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
            {guestCount > 0 && (
              <div className="mt-4 space-y-4">
                {Array.from({ length: guestCount }).map((_, index) => (
                  <div key={index} className="space-y-2">
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
          <Button type="submit" className="w-full">
            Confirm Booking
          </Button>
        </form>
      </Form>
    </div>
  );
}
