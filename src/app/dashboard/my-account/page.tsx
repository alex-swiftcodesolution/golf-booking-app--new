"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { fetchMemberDetails, updateMemberProfile } from "@/api/gymmaster"; // Import both
import { useRouter } from "next/navigation";

const profileSchema = z
  .object({
    firstname: z.string().min(1, "First name is required"),
    surname: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    phonecell: z
      .string()
      .min(10, "Please enter a valid phone number")
      .regex(
        /^\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/,
        "Please enter a valid phone number (e.g., +1-123-456-7890)"
      )
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional(),
    confirmPassword: z.string().optional(),
    dob: z.string().optional(),
    addressstreet: z.string().optional(),
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

const paymentSchema = z.object({
  cardName: z.string().min(1, "Name on card is required"),
  cardNumber: z
    .string()
    .transform((val) => val.replace(/[\s-]/g, ""))
    .refine((val) => val.length === 16, "Card number must be 16 digits"),
  exp: z.string().regex(/^\d{2}\/\d{2}$/, "Use MM/YY format"),
  cvv: z.string().min(3, "CVV must be 3 or 4 digits").max(4),
  billingAddress: z.string().min(1, "Billing address is required"),
});

export default function MyAccount() {
  const [profileLoading, setProfileLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstname: "",
      surname: "",
      email: "",
      phonecell: "",
      password: "",
      confirmPassword: "",
      dob: "",
      addressstreet: "",
    },
  });

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardName: "",
      cardNumber: "",
      exp: "",
      cvv: "",
      billingAddress: "",
    },
  });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/");
      return;
    }

    const loadProfile = async () => {
      try {
        const memberData = await fetchMemberDetails(token);
        profileForm.reset({
          firstname: memberData.firstname || "",
          surname: memberData.surname || "",
          email: memberData.email || "",
          phonecell: memberData.phonecell || "",
          dob: memberData.dob || "",
          addressstreet: memberData.addressstreet || "",
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast.error("Failed to load profile", {
          description: "Please try again later.",
        });
      }
    };

    loadProfile();
  }, [profileForm, router]);

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setProfileLoading(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      await updateMemberProfile(token, data);
      toast.success("Profile updated!", {
        description: `Changes saved for ${data.firstname} ${data.surname}`,
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile", {
        description: "Please try again later.",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const onPaymentSubmit = async (data: z.infer<typeof paymentSchema>) => {
    setPaymentLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Payment method updated!", {
        description: `Card ending in ${data.cardNumber.slice(-4)} saved`,
      });
    } catch {
      toast.error("Failed to update payment method", {
        description: "Please check your details and try again.",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-center md:text-left"
      >
        My Account
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-md mx-auto"
      >
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:flex sm:space-x-4 mb-6">
            <TabsTrigger
              value="profile"
              className="w-full sm:w-auto py-2 sm:py-2.5 text-sm sm:text-base"
              aria-label="Update profile information"
            >
              Update Profile
            </TabsTrigger>
            <TabsTrigger
              value="payment"
              className="w-full sm:w-auto py-2 sm:py-2.5 text-sm sm:text-base"
              aria-label="Update payment method"
            >
              Update Payment
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={profileForm.control}
                  name="firstname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        First Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="surname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        Last Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="john@example.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="phonecell"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        Cell
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="123-456-7890" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                {/* Password Field with Eye Icon */}
                <FormField
                  control={profileForm.control}
                  name="password"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">
                          Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="New password"
                              type={showPassword ? "text" : "password"}
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5 text-gray-500" />
                              ) : (
                                <Eye className="h-5 w-5 text-gray-500" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm" />
                      </FormItem>
                    );
                  }}
                />
                {/* Confirm Password Field with Eye Icon */}
                <FormField
                  control={profileForm.control}
                  name="confirmPassword"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">
                          Confirm Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Confirm new password"
                              type={showConfirmPassword ? "text" : "password"}
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-5 w-5 text-gray-500" />
                              ) : (
                                <Eye className="h-5 w-5 text-gray-500" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm" />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={profileForm.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        Date of Birth
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="addressstreet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        Address
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full py-2.5 sm:py-3 text-lg sm:text-base"
                  disabled={profileLoading}
                >
                  {profileLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Save Profile"
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="payment">
            <Form {...paymentForm}>
              <form
                onSubmit={paymentForm.handleSubmit(onPaymentSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={paymentForm.control}
                  name="cardName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        Name on Card
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        Card Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="1234 5678 9012 3456" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={paymentForm.control}
                    name="exp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">
                          Expiration
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="MM/YY" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={paymentForm.control}
                    name="cvv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">
                          CVV
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={paymentForm.control}
                  name="billingAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        Billing Address
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full py-2.5 sm:py-3 text-lg sm:text-base"
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Save Payment"
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
