"use client";
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

// Define the form schema
const inviteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cell: z.string().min(10, "Please enter a valid phone number"),
});

export default function Invite() {
  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      name: "",
      cell: "",
    },
  });

  const onSubmit = (data: z.infer<typeof inviteSchema>) => {
    console.log("Invite data:", data);
    // Later: Send SMS via API
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Invite a New Member</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full max-w-md space-y-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cell"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cell</FormLabel>
                <FormControl>
                  <Input placeholder="123-456-7890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            Send Invite
          </Button>
        </form>
      </Form>
    </div>
  );
}
