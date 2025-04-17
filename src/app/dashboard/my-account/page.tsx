"use client";
import { useState, useEffect, useCallback } from "react";
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
import { fetchMemberDetails, updateMemberProfile } from "@/api/gymmaster";
import { useRouter } from "next/navigation";
import axios from "axios";

const profileSchema = z
  .object({
    firstname: z.string().min(1, "First name is required"),
    surname: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    phonecell: z
      .string()
      .min(10, "Please enter a valid cell number")
      .regex(
        /^\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/,
        "Please enter a valid cell number (e.g., +1-123-456-7890)"
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
  billingAddress: z.string().min(1, "Billing address is required"),
});

interface PaymentMethodResponse {
  result?: string;
  error?: string | null;
}
interface PaymentLogResponse {
  result?: string;
  error?: string | null;
}

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
      billingAddress: "",
    },
  });

  const loadProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/");
        return;
      }
      const memberData = await fetchMemberDetails(token);
      profileForm.reset({
        firstname: memberData.firstname ?? "",
        surname: memberData.surname ?? "",
        email: memberData.email ?? "",
        phonecell: memberData.phonecell ?? "",
        dob: memberData.dob ?? "",
        addressstreet: memberData.addressstreet ?? "",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to fetch profile:", errorMessage);
      toast.error("Failed to load profile", { description: errorMessage });
    }
  }, [profileForm, router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setProfileLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/");
        return;
      }

      const updateData = {
        firstname: data.firstname,
        surname: data.surname,
        email: data.email,
        phonecell: data.phonecell,
        dob: data.dob,
        addressstreet: data.addressstreet,
        ...(data.password && { password: data.password }),
      };

      await updateMemberProfile(token, updateData);
      toast.success("Profile updated!", {
        description: `Changes saved for ${data.firstname} ${data.surname}`,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to update profile:", errorMessage);
      toast.error("Failed to update profile", { description: errorMessage });
    } finally {
      setProfileLoading(false);
    }
  };

  const onPaymentSubmit = async (data: z.infer<typeof paymentSchema>) => {
    setPaymentLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/");
        return;
      }

      const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY as
        | string
        | undefined;
      if (!GYMMASTER_API_KEY) throw new Error("GYMMASTER_API_KEY is missing");

      // Placeholder: Mock Square iframe nonce
      const mockNonce = `mock_square_nonce_${Math.random()
        .toString(36)
        .slice(2)}`;
      const mockLast4 = "1111"; // Test card last4 (e.g., 4111 1111 1111 1111)

      // Attempt to store card via GymMaster
      try {
        const response = await axios.post<PaymentMethodResponse>(
          "/api/gymmaster/v1/member/paymentmethod",
          new URLSearchParams({
            api_key: GYMMASTER_API_KEY,
            token,
            card_nonce: mockNonce,
            card_name: data.cardName,
            billing_address: data.billingAddress,
          }),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        if (response.data.error) throw new Error(response.data.error);
      } catch (cardError: unknown) {
        const cardErrorMessage =
          cardError instanceof Error ? cardError.message : "Unknown card error";
        console.warn(
          "GymMaster payment endpoint failed, logging:",
          cardErrorMessage
        );
        // Fallback: Store last4 in customtext1
        await updateMemberProfile(token, {
          customtext1: `card_last4_${mockLast4}`,
        });
      }

      // Log to GymMaster
      const logResponse = await axios.post<PaymentLogResponse>(
        "/api/gymmaster/v2/payment/log",
        new URLSearchParams({
          api_key: GYMMASTER_API_KEY,
          token,
          amount: "0.00",
          paymentmethod_name: `Card ending ${mockLast4}`,
          note: `Updated payment method for ${data.cardName}`,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      if (logResponse.data.error) throw new Error(logResponse.data.error);

      toast.success("Payment method updated!", {
        description: `Card ending in ${mockLast4} saved`,
      });
      paymentForm.reset();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to update payment method:", errorMessage);
      toast.error("Failed to update payment method", {
        description: "Awaiting GymMaster API details. Please try again later.",
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
                        Email Address
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
                <FormField
                  control={profileForm.control}
                  name="password"
                  render={({ field }) => (
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
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
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
                  )}
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
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    Card Details
                  </FormLabel>
                  <FormControl>
                    <div className="border rounded-md p-3 bg-gray-100">
                      <p className="text-sm text-gray-500">
                        Square iframe placeholder (awaiting GymMaster API
                        details)
                      </p>
                    </div>
                  </FormControl>
                </FormItem>
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
                    "Save Payment Method"
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
