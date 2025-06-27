"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import {
  fetchMemberDetails,
  resetMemberPassword,
  updateMemberProfile,
} from "@/api/gymmaster";

const GYMMASTER_USERNAME = "parclub247";

const profileSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phonecell: z
    .string()
    .min(10, "Phone number must be 10 digits")
    .max(10, "Phone number must be 10 digits")
    .regex(/^\d{10}$/, "Phone number must contain only digits")
    .optional(),
  dob: z.string().optional(),
  addressstreet: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function MyAccount() {
  const router = useRouter();

  const [iframeSrc, setIframeSrc] = useState("");
  const [loading, setLoading] = useState({
    token: true,
    profile: false,
    resetPassword: false,
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstname: "",
      surname: "",
      email: "",
      phonecell: "",
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

  useEffect(() => {
    const iframe = document.querySelector(".gmiframe");
    if (iframe) {
      setIframeSrc(iframe.getAttribute("src") || "");
      const observer = new MutationObserver(() => {
        const newSrc = iframe.getAttribute("src") || "";
        setIframeSrc(newSrc);
      });
      observer.observe(iframe, { attributes: true, attributeFilter: ["src"] });
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    if (iframeSrc.includes("addpaymentinfo")) {
      router.push("/account?tab=payment");
    } else if (iframeSrc.includes("success")) {
      router.push("/account?tab=profile");
      toast.success("Payment details updated!");
    } else if (iframeSrc.includes("error")) {
      router.push("/account?tab=payment");
      toast.error("Payment update failed.");
    }
  }, [iframeSrc, router]);

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

  const handleResetPassword = async () => {
    setLoading((prev) => ({ ...prev, resetPassword: true }));

    const token = localStorage.getItem("authToken");
    const expires = localStorage.getItem("tokenExpires");

    if (!token || (expires && Date.now() > Number(expires))) {
      router.push("/");
      return;
    }

    try {
      const email = profileForm.getValues("email");
      await resetMemberPassword(email);
      toast.success("Password reset link sent to your email!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to send password reset link", {
        description: message,
      });
    } finally {
      setLoading((prev) => ({ ...prev, resetPassword: false }));
    }
  };

  return (
    <div className="space-y-4">
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
                    placeholder: "1234567890",
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

                <div className="flex space-y-4 flex-col">
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
                  <Button
                    type="button"
                    className="w-full py-2.5 sm:py-3 text-lg"
                    onClick={handleResetPassword}
                    disabled={loading.resetPassword}
                  >
                    {loading.resetPassword ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="payment">
            {loading.token ? (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-center text-gray-500">
                  For security reasons, you need to log in again to update your
                  payment details. Use your email and password in the form
                  below. After logging in, you can update your card details.
                </p>
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
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
