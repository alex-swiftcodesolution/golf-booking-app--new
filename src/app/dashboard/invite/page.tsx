"use client";
import { useState } from "react";
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
import { Loader2 } from "lucide-react";

const inviteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cell: z.string().min(10, "Please enter a valid phone number"),
});

export default function Invite() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", cell: "" },
  });

  const onSubmit = async (data: z.infer<typeof inviteSchema>) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Invite sent!", {
      description: `Invitation sent to ${data.name} at ${data.cell}`,
    });
    setIsLoading(false);
  };

  return (
    <div className="space-y-8 p-6">
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Send Invite"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
