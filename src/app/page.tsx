"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import SignatureCanvas from "react-signature-canvas";
import {
  fetchCompanies,
  fetchMemberships,
  signup,
  saveWaiver,
  login,
  fetchWaiver,
  validateReferral,
  type Club,
  type Membership,
  logMembershipAgreement,
  fetchMembershipAgreements,
} from "@/api/gymmaster";

const signUpSchema = z
  .object({
    referralCode: z.string().min(1, "Referral code is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dob: z
      .string()
      .min(1, "Date of birth is required")
      .refine((dob) => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }
        return age >= 18;
      }, "You must be at least 18 years old"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password"),
    // phoneCell: z
    //   .string()
    //   .regex(
    //     /^\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/,
    //     "Use format: +1-123-456-7890"
    //   ),
    phoneCell: z
      .string()
      .min(10, "Phone number must be 10 digits")
      .max(10, "Phone number must be 10 digits")
      .regex(/^\d{10}$/, "Phone number must contain only digits"),
    location: z.string().min(1, "Select a location"),
    membershipType: z.string().min(1, "Select a membership type"),
    waiverSignature: z.string().min(1, "Sign the waiver"),
    hasReadTerms: z
      .boolean()
      .refine((val) => val === true, "You must read the terms"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

function HomeContent() {
  const [loading, setLoading] = useState({ signup: false, login: false });
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirm: false,
  });
  const [step, setStep] = useState(1);
  const [isOver18, setIsOver18] = useState<boolean | null>(null);
  const [locations, setLocations] = useState<Club[]>([]);
  const [membershipTypes, setMembershipTypes] = useState<Membership[]>([]);
  const [waiverContent, setWaiverContent] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const sigCanvas = useRef<SignatureCanvas>(null);

  const referralCode = searchParams.get("referral");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hasReadTerms, setHasReadTerms] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      referralCode: "",
      firstName: "",
      lastName: "",
      dob: "",
      email: "",
      password: "",
      confirmPassword: "",
      phoneCell: "",
      location: "",
      membershipType: "",
      waiverSignature: "",
      hasReadTerms: false,
    },
  });

  // Pre-populate referral code from URL
  useEffect(() => {
    const referral = searchParams.get("referral");
    if (referral) {
      signUpForm.setValue("referralCode", referral);
    }
  }, [searchParams, signUpForm]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companies, memberships] = await Promise.all([
          fetchCompanies(),
          fetchMemberships(),
        ]);
        setLocations(companies || []);
        setMembershipTypes(memberships || []);
      } catch (error) {
        console.error("Fetch data error:", error);
        toast.error("Failed to load data", {
          description: String(error),
          duration: 30000,
        });
      }
    };

    fetchData();
  }, []);

  const onLoginSubmit = async (data: LoginFormData) => {
    setLoading((prev) => ({ ...prev, login: true }));
    try {
      const { token, memberid, expires } = await login(
        data.email,
        data.password
      );
      localStorage.setItem("authToken", token);
      localStorage.setItem("memberId", memberid.toString());
      localStorage.setItem(
        "tokenExpires",
        (Date.now() + expires * 1000).toString()
      );
      toast.success(`Welcome back, ${data.email}!`, { duration: 30000 });
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed", {
        description: String(error),
        duration: 30000,
      });
    } finally {
      setLoading((prev) => ({ ...prev, login: false }));
    }
  };

  /*
  const onSignUpSubmit = async (data: SignUpFormData) => {
    setLoading((prev) => ({ ...prev, signup: true }));
    try {
      // const token = localStorage.getItem("authToken") || "";
      // const inviterId = await validateReferral(data.referralCode, token);
      const signupData = {
        firstname: data.firstName,
        surname: data.lastName,
        dob: data.dob,
        email: data.email,
        password: data.password,
        phonecell: data.phoneCell,
        membershiptypeid: data.membershipType,
        companyid: data.location,
        startdate: new Date().toISOString().split("T")[0],
        firstpaymentdate: new Date().toISOString().split("T")[0],
        // ...(data.referralCode && { customtext4: data.referralCode }),
        ...((data.referralCode || referralCode) && {
          customtext4: data.referralCode || referralCode,
        }),
      };
      const {
        token: signupToken,
        memberid,
        membershipid,
        expires,
      } = await signup(signupData);
      localStorage.setItem("authToken", signupToken);
      localStorage.setItem("memberId", memberid);
      localStorage.setItem(
        "tokenExpires",
        (Date.now() + expires * 1000).toString()
      );

      if (!data.hasReadTerms) {
        throw new Error("You must read the terms");
      }

      await saveWaiver(data.waiverSignature, membershipid, signupToken);
      toast.success(`Welcome, ${data.firstName}! Your membership is set.`, {
        duration: 30000,
      });
      // setStep(4);
      router.push("/dashboard?newSignup=true");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Sign-up failed", {
        description: String(error),
        duration: 30000,
      });
      setStep(1);
    } finally {
      setLoading((prev) => ({ ...prev, signup: false }));
    }
  };
  */

  /*
  const onSignUpSubmit = async (data: SignUpFormData) => {
    setLoading((prev) => ({ ...prev, signup: true }));
    try {
      const signupData = {
        firstname: data.firstName,
        surname: data.lastName,
        dob: data.dob,
        email: data.email,
        password: data.password,
        phonecell: data.phoneCell,
        membershiptypeid: data.membershipType,
        companyid: data.location,
        startdate: new Date().toISOString().split("T")[0],
        firstpaymentdate: new Date().toISOString().split("T")[0],
        ...((data.referralCode || referralCode) && {
          customtext4: data.referralCode || referralCode,
        }),
      };
      const {
        token: signupToken,
        memberid,
        membershipid,
        expires,
      } = await signup(signupData);
      localStorage.setItem("authToken", signupToken);
      localStorage.setItem("memberId", memberid);
      localStorage.setItem(
        "tokenExpires",
        (Date.now() + expires * 1000).toString()
      );

      if (!data.hasReadTerms) {
        throw new Error("You must read the terms");
      }

      // Save the signature
      await saveWaiver(data.waiverSignature, membershipid, signupToken);

      // Log the membership agreement to update waiver status
      await logMembershipAgreement(membershipid, signupToken);

      toast.success(`Welcome, ${data.firstName}! Your membership is set.`, {
        duration: 30000,
      });
      router.push("/dashboard?newSignup=true");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Sign-up failed", {
        description: String(error),
        duration: 30000,
      });
      setStep(1);
    } finally {
      setLoading((prev) => ({ ...prev, signup: false }));
    }
  };
  */

  /*
  const onSignUpSubmit = async (data: SignUpFormData) => {
    setLoading((prev) => ({ ...prev, signup: true }));
    try {
      const signupData = {
        firstname: data.firstName,
        surname: data.lastName,
        dob: data.dob,
        email: data.email,
        password: data.password,
        phonecell: data.phoneCell,
        membershiptypeid: data.membershipType,
        companyid: data.location,
        startdate: new Date().toISOString().split("T")[0],
        firstpaymentdate: new Date().toISOString().split("T")[0],
        ...((data.referralCode || referralCode) && {
          customtext4: data.referralCode || referralCode,
        }),
      };
      const {
        token: signupToken,
        memberid,
        membershipid,
        expires,
      } = await signup(signupData);
      localStorage.setItem("authToken", signupToken);
      localStorage.setItem("memberId", memberid);
      localStorage.setItem(
        "tokenExpires",
        (Date.now() + expires * 1000).toString()
      );

      if (!data.hasReadTerms) {
        throw new Error("You must read the terms");
      }

      // Save the signature
      await saveWaiver(data.waiverSignature, membershipid, signupToken);

      // Log the membership agreement for the selected membership
      await logMembershipAgreement(membershipid, signupToken);

      // Check if the selected membership is a guest membership
      const selectedMembership = membershipTypes.find(
        (m) => m.id.toString() === data.membershipType
      );
      const isGuestMembership = selectedMembership?.name
        .toLowerCase()
        .includes("guest");

      if (isGuestMembership) {
        // Fetch member's memberships to find the guest membership
        const memberships = await fetchMemberMemberships(signupToken);
        const guestMembership = memberships.find((m) =>
          m.name.toLowerCase().includes("guest")
        );

        if (guestMembership) {
          // Log the guest membership agreement to mark Guest Waiver as Signed
          await logMembershipAgreement(
            guestMembership.id.toString(),
            signupToken
          );
        } else {
          console.warn("Guest membership not found for member after signup");
        }
      }

      toast.success(`Welcome, ${data.firstName}! Your membership is set.`, {
        duration: 30000,
      });
      router.push("/dashboard?newSignup=true");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Sign-up failed", {
        description: String(error),
        duration: 30000,
      });
      setStep(1);
    } finally {
      setLoading((prev) => ({ ...prev, signup: false }));
    }
  };
  */

  const onSignUpSubmit = async (data: SignUpFormData) => {
    setLoading((prev) => ({ ...prev, signup: true }));
    try {
      const signupData = {
        firstname: data.firstName,
        surname: data.lastName,
        dob: data.dob,
        email: data.email,
        password: data.password,
        phonecell: data.phoneCell,
        membershiptypeid: data.membershipType,
        companyid: data.location,
        startdate: new Date().toISOString().split("T")[0],
        firstpaymentdate: new Date().toISOString().split("T")[0],
        ...((data.referralCode || referralCode) && {
          customtext4: data.referralCode || referralCode,
        }),
      };
      console.log("Signup data:", signupData);
      const {
        token: signupToken,
        memberid,
        membershipid,
        expires,
      } = await signup(signupData);
      console.log("Signup response:", {
        token: signupToken,
        memberid,
        membershipid,
        expires,
      });
      localStorage.setItem("authToken", signupToken);
      localStorage.setItem("memberId", memberid);
      localStorage.setItem(
        "tokenExpires",
        (Date.now() + expires * 1000).toString()
      );

      if (!data.hasReadTerms) {
        throw new Error("You must read the terms");
      }

      // Save the signature
      console.log("Saving waiver signature for membership ID:", membershipid);
      await saveWaiver(data.waiverSignature, membershipid, signupToken);

      // Log the membership agreement for the selected membership
      console.log("Logging primary agreement for membership ID:", membershipid);
      await logMembershipAgreement(membershipid, signupToken, "Primary Waiver");

      // Check if the selected membership is a guest membership
      const selectedMembership = membershipTypes.find(
        (m) => m.id.toString() === data.membershipType
      );
      const isGuestMembership = selectedMembership?.name
        .toLowerCase()
        .includes("guest");

      if (isGuestMembership) {
        console.log(
          "Guest membership detected, using signup membership ID:",
          membershipid
        );
        // Directly log the Guest Waiver agreement using the signup membershipId
        await logMembershipAgreement(membershipid, signupToken, "Guest Waiver");

        // Verify the Guest Waiver status as a fallback
        try {
          const agreements = await fetchMembershipAgreements(
            membershipid,
            signupToken
          );
          const guestWaiver = agreements.find((a) =>
            a.name.toLowerCase().includes("guest waiver")
          );
          if (guestWaiver) {
            console.log("Guest Waiver status:", {
              id: guestWaiver.id,
              status: guestWaiver.status,
            });
            if (guestWaiver.status.toLowerCase() !== "signed") {
              console.warn("Guest Waiver not marked as Signed, retrying...");
              await logMembershipAgreement(
                membershipid,
                signupToken,
                "Guest Waiver Retry"
              );
            }
          } else {
            console.warn(
              "Guest Waiver not found in agreements for membership ID:",
              membershipid
            );
            toast.error(
              "Guest Waiver not linked to membership. Please contact support.",
              {
                duration: 30000,
              }
            );
          }
        } catch (error) {
          console.error("Error verifying Guest Waiver agreements:", error);
          toast.error(
            "Failed to verify Guest Waiver. Please contact support.",
            {
              duration: 30000,
            }
          );
        }
      }

      toast.success(`Welcome, ${data.firstName}! Your membership is set.`, {
        duration: 30000,
      });
      router.push("/dashboard?newSignup=true");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Sign-up failed", {
        description: String(error),
        duration: 30000,
      });
      setStep(1);
    } finally {
      setLoading((prev) => ({ ...prev, signup: false }));
    }
  };

  const nextStep = async () => {
    const fields: (keyof SignUpFormData)[][] = [
      [
        "firstName",
        "lastName",
        "dob",
        "email",
        "password",
        "confirmPassword",
        "phoneCell",
        "referralCode",
      ],
      ["location", "membershipType"],
      ["waiverSignature", "hasReadTerms"], // Include hasReadTerms
    ];
    if (!(await signUpForm.trigger(fields[step - 1]))) {
      toast.error("Please fix errors before proceeding", { duration: 30000 });
      return;
    }
    if (step === 1 && signUpForm.getValues("referralCode")) {
      try {
        const token = localStorage.getItem("authToken") || "";
        const isValid = await validateReferral(
          signUpForm.getValues("referralCode") || "",
          token
        );
        if (!isValid) {
          signUpForm.setError("referralCode", {
            message: "Invalid referral code",
          });
          toast.error("Invalid referral code", { duration: 30000 });
          return;
        }
        console.log("Referral validation result:", {
          code: signUpForm.getValues("referralCode"),
          isValid,
        });
      } catch (error) {
        console.error("Referral validation error:", error);
        signUpForm.setError("referralCode", {
          message: "Failed to validate referral code",
        });
        toast.error("Failed to validate referral code", { duration: 30000 });
        return;
      }
    }
    if (step === 2 && signUpForm.getValues("membershipType")) {
      try {
        const waiver = await fetchWaiver(
          signUpForm.getValues("membershipType")!,
          localStorage.getItem("authToken") || ""
        );
        setWaiverContent(waiver || "No waiver content");
      } catch (error) {
        console.error("Waiver fetch error:", error);
        setWaiverContent("No waiver content");
      }
    }
    if (step === 3) {
      await onSignUpSubmit(signUpForm.getValues()); // Call signup
      return; // Prevent step increment (signup handles redirect)
    }
    setStep((prev) => prev + 1);
  };

  const prevStep = () => setStep((prev) => prev - 1);

  const checkAge = (dob: string) => {
    if (!dob) {
      setIsOver18(null);
      return;
    }
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    setIsOver18(age >= 18);
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    signUpForm.setValue("waiverSignature", "");
  };

  const textInputFields: (keyof Pick<
    SignUpFormData,
    | "referralCode"
    | "firstName"
    | "lastName"
    | "dob"
    | "email"
    | "password"
    | "confirmPassword"
    | "phoneCell"
  >)[] = [
    "referralCode",
    "firstName",
    "lastName",
    "dob",
    "email",
    "password",
    "confirmPassword",
    "phoneCell",
  ];

  return (
    <div className="relative z-20 w-full max-w-md p-4 sm:p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-center"
      >
        <Image
          priority
          src="/logo-white.png"
          alt="Simcoquitos 24/7 Golf Club Logo"
          width={150}
          height={150}
          className="w-32 md:w-40"
        />
      </motion.div>

      <Tabs
        defaultValue={searchParams.get("referral") ? "signup" : "login"}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Form {...loginForm}>
            <form
              onSubmit={loginForm.handleSubmit(onLoginSubmit)}
              className="space-y-4 bg-white/90 p-6 rounded-lg shadow-lg"
            >
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="john@example.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Password"
                          type={showPasswords.password ? "text" : "password"}
                          {...field}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords((prev) => ({
                              ...prev,
                              password: !prev.password,
                            }))
                          }
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.password ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading.login}>
                {loading.login ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="signup">
          <Form {...signUpForm}>
            <form
              onSubmit={signUpForm.handleSubmit(onSignUpSubmit)}
              className="space-y-4 bg-white/90 p-6 rounded-lg shadow-lg"
            >
              {step === 1 && (
                <>
                  <h2 className="text-xl font-semibold">
                    Step 1: Personal Info
                  </h2>
                  {textInputFields.map((name) => (
                    <FormField
                      key={name}
                      control={signUpForm.control}
                      name={name as keyof SignUpFormData}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {name === "dob"
                              ? "Date of Birth"
                              : name === "phoneCell"
                                ? "Cell Phone"
                                : name === "referralCode"
                                  ? "Referral Code"
                                  : name.replace(/([A-Z])/g, " $1").trim()}
                          </FormLabel>
                          <FormControl>
                            {name === "dob" ? (
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="\d*"
                                maxLength={10}
                                placeholder="MM/DD/YYYY"
                                {...field}
                                value={String(field.value)}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/\D/g, ""); // remove non-digits
                                  if (value.length > 8)
                                    value = value.slice(0, 8); // limit to MMDDYYYY

                                  // Add slashes
                                  if (value.length > 4) {
                                    value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
                                  } else if (value.length > 2) {
                                    value = `${value.slice(0, 2)}/${value.slice(2)}`;
                                  }

                                  e.target.value = value;

                                  field.onChange(e);
                                  checkAge(e.target.value);
                                }}
                              />
                            ) : name === "password" ||
                              name === "confirmPassword" ? (
                              <div className="relative">
                                <Input
                                  placeholder={
                                    name === "password"
                                      ? "Password"
                                      : "Confirm Password"
                                  }
                                  type={
                                    showPasswords[
                                      name === "password"
                                        ? "password"
                                        : "confirm"
                                    ]
                                      ? "text"
                                      : "password"
                                  }
                                  {...field}
                                  value={String(field.value)}
                                  className="pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowPasswords((prev) => ({
                                      ...prev,
                                      [name === "password"
                                        ? "password"
                                        : "confirm"]:
                                        !prev[
                                          name === "password"
                                            ? "password"
                                            : "confirm"
                                        ],
                                    }))
                                  }
                                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                  {showPasswords[
                                    name === "password" ? "password" : "confirm"
                                  ] ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <Input
                                placeholder={
                                  name === "email"
                                    ? "john@example.com"
                                    : name === "phoneCell"
                                      ? "1234567890"
                                      : name === "referralCode"
                                        ? "Referral code"
                                        : name.replace(/([A-Z])/g, " $1").trim()
                                }
                                type={name === "email" ? "email" : "text"}
                                {...field}
                                value={String(field.value)}
                              />
                            )}
                          </FormControl>
                          {name === "dob" && isOver18 === false && (
                            <p className="text-red-600 text-sm">
                              You must be 18 or older
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="w-full"
                    disabled={isOver18 === false || isOver18 === null}
                  >
                    Next
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="text-xl font-semibold">
                    Step 2: Membership Details
                  </h2>
                  <FormField
                    control={signUpForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose a location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations.map((loc) => (
                              <SelectItem
                                key={loc.id}
                                value={loc.id.toString()}
                              >
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="membershipType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Membership Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose a membership" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {membershipTypes.map((type) => (
                              <SelectItem
                                key={type.id}
                                value={type.id.toString()}
                              >
                                {type.name} - {type.price} (
                                {type.promotional_period || "N/A"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {field.value && (
                          <div className="mt-2 p-3 bg-gray-100 rounded-md text-sm">
                            {[
                              "name",
                              "description",
                              "price",
                              "startdate",
                              "promotional_period",
                            ].map((key) => (
                              <p key={key}>
                                <strong>
                                  {key.replace(/([A-Z])/g, " $1").trim()}:
                                </strong>{" "}
                                {membershipTypes.find(
                                  (t) => t.id.toString() === field.value
                                )?.[key as keyof Membership] || "N/A"}
                              </p>
                            ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex space-x-2 flex-col-reverse md:flex-col gap-2 space-y-2">
                    <Button
                      type="button"
                      onClick={prevStep}
                      variant="outline"
                      className="w-full"
                    >
                      Back
                    </Button>
                    <Button type="button" onClick={nextStep} className="w-full">
                      Next
                    </Button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="text-xl font-semibold">Step 3: Sign Waiver</h2>
                  <FormField
                    control={signUpForm.control}
                    name="waiverSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sign the Waiver</FormLabel>
                        <FormControl>
                          <div className="border rounded-md">
                            <SignatureCanvas
                              ref={sigCanvas}
                              canvasProps={{ className: "w-full h-32" }}
                              onEnd={() =>
                                field.onChange(
                                  sigCanvas.current?.toDataURL() || ""
                                )
                              }
                            />
                          </div>
                        </FormControl>
                        <div className="mt-2 flex space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={clearSignature}
                          >
                            Clear
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setHasReadTerms(true)}
                              >
                                Read Terms
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Waiver</DialogTitle>
                              </DialogHeader>
                              <div
                                className="max-h-[60vh] overflow-y-auto"
                                dangerouslySetInnerHTML={{
                                  __html: waiverContent || "Loading...",
                                }}
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="hasReadTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => {
                                field.onChange(e.target.checked);
                                setHasReadTerms(e.target.checked);
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <FormLabel>
                              I have read and agree to the terms
                            </FormLabel>
                          </div>
                        </FormControl>
                        <FormMessage /> {/* Ensure error displays */}
                      </FormItem>
                    )}
                  />
                  <div className="flex space-x-2 flex-col-reverse md:flex-col gap-2 space-y-2">
                    <Button
                      type="button"
                      onClick={prevStep}
                      variant="outline"
                      className="w-full"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="w-full"
                      disabled={loading.signup}
                    >
                      {loading.signup ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  </div>
                </>
              )}

              {step === 4 && (
                <Dialog
                  open={step === 4}
                  onOpenChange={() => router.push("/dashboard")}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>
                        <strong>
                          Welcome, {signUpForm.getValues("firstName")}!
                        </strong>
                      </p>
                      <p>
                        Membership:{" "}
                        {
                          membershipTypes.find(
                            (t) =>
                              t.id.toString() ===
                              signUpForm.getValues("membershipType")
                          )?.name
                        }
                      </p>
                      <p>
                        Location:{" "}
                        {
                          locations.find(
                            (l) =>
                              l.id.toString() ===
                              signUpForm.getValues("location")
                          )?.name
                        }
                      </p>
                      <p>No payment required</p>
                      <Button onClick={() => router.push("/dashboard")}>
                        Go to Dashboard
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <video
        autoPlay
        loop
        muted
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/50 z-10" />
      <Suspense
        fallback={
          <div className="relative z-20 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        }
      >
        <HomeContent />
      </Suspense>
    </div>
  );
}
