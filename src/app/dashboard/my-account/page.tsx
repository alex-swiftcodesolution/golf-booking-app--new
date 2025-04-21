"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchMemberDetails, updateMemberProfile } from "@/api/gymmaster";

const GYMMASTER_USERNAME = "parclub247";

const profileSchema = z
  .object({
    firstname: z.string().min(1, "First name is required"),
    surname: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    phonecell: z
      .string()
      .regex(
        /^\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/,
        "Please enter a valid cell number (e.g., +1-123-456-7890)"
      )
      .optional()
      .or(z.literal("")),
    password: z.string().min(6).optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
    dob: z.string().optional(),
    addressstreet: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password && data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ["confirmPassword"],
        code: z.ZodIssueCode.custom,
        message: "Passwords must match",
      });
    }
  });

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function MyAccount() {
  const router = useRouter();

  const [loading, setLoading] = useState({
    token: true,
    profile: false,
  });

  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });

  const profileForm = useForm<ProfileFormValues>({
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

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    const expires = localStorage.getItem("tokenExpires");

    if (!token || (expires && Date.now() > Number(expires))) {
      router.push("/");
      return;
    }

    try {
      const memberData = await fetchMemberDetails(token);
      profileForm.reset({
        firstname: memberData.firstname ?? "",
        surname: memberData.surname ?? "",
        email: memberData.email ?? "",
        phonecell: memberData.phonecell ?? "",
        dob: memberData.dob ?? "",
        addressstreet: memberData.addressstreet ?? "",
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading((prev) => ({ ...prev, token: false }));
    }
  }, [profileForm, router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onSubmit = async (data: ProfileFormValues) => {
    setLoading((prev) => ({ ...prev, profile: true }));

    const token = localStorage.getItem("authToken");
    const expires = localStorage.getItem("tokenExpires");

    if (!token || (expires && Date.now() > Number(expires))) {
      router.push("/");
      return;
    }

    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to update profile", { description: message });
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
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
            <TabsTrigger value="profile">Update Profile</TabsTrigger>
            <TabsTrigger value="payment">Update Payment</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {[
                  {
                    name: "firstname",
                    label: "First Name",
                    placeholder: "John",
                  },
                  { name: "surname", label: "Last Name", placeholder: "Doe" },
                  {
                    name: "email",
                    label: "Email Address",
                    placeholder: "john@example.com",
                    type: "email",
                  },
                  {
                    name: "phonecell",
                    label: "Cell",
                    placeholder: "123-456-7890",
                  },
                  { name: "dob", label: "Date of Birth", type: "date" },
                  {
                    name: "addressstreet",
                    label: "Address",
                    placeholder: "123 Main St",
                  },
                ].map(({ name, label, placeholder, type }) => (
                  <FormField
                    key={name}
                    control={profileForm.control}
                    name={name as keyof ProfileFormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={placeholder}
                            type={type}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}

                {/* Password Fields */}
                {["password", "confirmPassword"].map((fieldKey) => (
                  <FormField
                    key={fieldKey}
                    control={profileForm.control}
                    name={fieldKey as keyof ProfileFormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {fieldKey === "password"
                            ? "Password"
                            : "Confirm Password"}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={
                                passwordVisibility[
                                  fieldKey as "password" | "confirmPassword"
                                ]
                                  ? "text"
                                  : "password"
                              }
                              placeholder={
                                fieldKey === "password"
                                  ? "New password"
                                  : "Confirm new password"
                              }
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() =>
                                setPasswordVisibility((prev) => ({
                                  ...prev,
                                  [fieldKey]:
                                    !prev[
                                      fieldKey as "password" | "confirmPassword"
                                    ],
                                }))
                              }
                            >
                              {passwordVisibility[
                                fieldKey as "password" | "confirmPassword"
                              ] ? (
                                <EyeOff className="h-5 w-5 text-gray-500" />
                              ) : (
                                <Eye className="h-5 w-5 text-gray-500" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}

                <Button
                  type="submit"
                  className="w-full py-2.5 sm:py-3 text-lg"
                  disabled={loading.profile}
                >
                  {loading.profile ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Save Profile"
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment">
            {loading.token ? (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <iframe
                  className="gmiframe"
                  src={`https://${GYMMASTER_USERNAME}.gymmasteronline.com/portal/account/addpaymentinfo`}
                  style={{
                    width: "100%",
                    height: "600px",
                    overflow: "hidden",
                  }}
                  frameBorder="0"
                  allow="camera *"
                />
                <p className="text-sm text-gray-500">
                  For security reasons, you need to log in again to update your
                  payment details. Use your email and password in the form
                  below. After logging in, you can update your card details.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
