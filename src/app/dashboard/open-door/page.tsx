"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const openDoorSchema = z.object({
  club: z.string().min(1, "Please select a club"),
});

export default function OpenDoor() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof openDoorSchema>>({
    resolver: zodResolver(openDoorSchema),
    defaultValues: { club: "" },
  });

  const onSubmit = async (data: z.infer<typeof openDoorSchema>) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Door opened!", {
      description: `Access granted to ${data.club}`,
    });
    setIsLoading(false);
  };

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold">Open the Door</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full max-w-md space-y-4"
        >
          <FormField
            control={form.control}
            name="club"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Choose a Club</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a club" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="club1">Club 1</SelectItem>
                    <SelectItem value="club2">Club 2</SelectItem>
                    <SelectItem value="club3">Club 3</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Open Door"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
