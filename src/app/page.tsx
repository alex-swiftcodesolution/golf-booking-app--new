"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
} from "@/api/gymmaster";

interface SquarePayments {
  card(): Promise<SquareCard>;
}

interface SquareCard {
  attach(element: string): Promise<void>;
  tokenize(): Promise<{
    status: string;
    token?: string;
    errors?: { message: string }[];
  }>;
}

declare global {
  interface Window {
    Square: {
      payments(appId: string, locationId: string): SquarePayments;
    };
  }
}

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
        const age = new Date().getFullYear() - birthDate.getFullYear();
        const monthDiff = new Date().getMonth() - birthDate.getMonth();
        return monthDiff < 0 ||
          (monthDiff === 0 && new Date().getDate() < birthDate.getDate())
          ? age - 1 >= 18
          : age >= 18;
      }, "You must be at least 18 years old"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password"),
    cell: z
      .string()
      .regex(
        /^\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/,
        "Invalid phone number"
      ),
    referringMemberName: z.string().min(1, "Referring member name is required"),
    location: z.string().min(1, "Select a location"),
    membershipType: z.string().min(1, "Select a membership type"),
    waiverSignature: z.string().min(1, "Sign the waiver"),
    billingAddress: z.string().min(1, "Billing address is required"),
    cardNonce: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    const price = parseFloat(
      membershipTypes
        .find((m) => m.id.toString() === data.membershipType)
        ?.price.replace("$", "") || "0"
    );
    if (price > 0 && !data.cardNonce) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payment info required",
        path: ["cardNonce"],
      });
    }
  });

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

export const membershipTypes: Membership[] = [];

export default function Home() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
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
  const [squarePayments, setSquarePayments] = useState<SquarePayments | null>(
    null
  );
  const router = useRouter();
  const sigCanvas = useRef<SignatureCanvas>(null);

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
      cell: "",
      referringMemberName: "",
      location: "",
      membershipType: "",
      waiverSignature: "",
      billingAddress: "",
      cardNonce: "",
    },
  });

  const isPaymentRequired = useCallback(() => {
    return (
      parseFloat(
        membershipTypes
          .find(
            (m) => m.id.toString() === signUpForm.getValues("membershipType")
          )
          ?.price.replace("$", "") || "0"
      ) > 0
    );
  }, [membershipTypes, signUpForm]);

  useEffect(() => {
    const fetchAdminToken = async () => {
      try {
        const res = await fetch("/api/get-admin-token");
        const data = await res.json();
        console.log("Admin token:", data);
        if (!res.ok) throw new Error(data.error || "Admin token fetch failed");
        setAdminToken(data.token);
      } catch (error) {
        console.error("Admin token error:", error);
        toast.error("Admin login failed - referral validation unavailable");
      }
    };

    const loadSquareSdk = async () => {
      if (!window.Square) {
        const script = document.createElement("script");
        script.src = "https://sandbox.web.squarecdn.com/v1/square.js";
        script.async = true;
        script.onload = () =>
          setSquarePayments(
            window.Square.payments(
              process.env.NEXT_PUBLIC_SQUARE_APP_ID!,
              process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!
            )
          );
        script.onerror = () => toast.error("Failed to load Square SDK");
        document.body.appendChild(script);
      }
    };

    const fetchData = async () => {
      try {
        setLocations((await fetchCompanies()) || []);
        setMembershipTypes((await fetchMemberships()) || []);
      } catch (error) {
        toast.error("Failed to load data", { description: String(error) });
        setLocations([]);
        setMembershipTypes([]);
      }
    };

    fetchAdminToken();
    loadSquareSdk();
    fetchData();
  }, []);

  useEffect(() => {
    if (squarePayments && step === 4 && isPaymentRequired()) {
      const initCard = async () => {
        try {
          const card = await squarePayments.card();
          await card.attach("#card-container");
          const tokenize = async () => {
            const result = await card.tokenize();
            if (result.status === "OK" && result.token)
              signUpForm.setValue("cardNonce", result.token);
            else
              toast.error("Payment failed", {
                description: result.errors?.[0]?.message,
              });
          };
          const submitBtn = document.getElementById("card-submit");
          submitBtn?.addEventListener("click", tokenize);
          return () => submitBtn?.removeEventListener("click", tokenize);
        } catch (error) {
          toast.error("Payment init failed", { description: String(error) });
        }
      };
      initCard();
    }
  }, [squarePayments, step, signUpForm, isPaymentRequired]);

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
      toast.success(`Welcome back, ${data.email}!`);
      router.push("/dashboard");
    } catch (error) {
      toast.error("Login failed", { description: String(error) });
    } finally {
      setLoading((prev) => ({ ...prev, login: false }));
    }
  };

  const onSignUpSubmit = async (data: SignUpFormData) => {
    setLoading((prev) => ({ ...prev, signup: true }));
    try {
      if (!adminToken) throw new Error("Admin token missing");
      const isReferralValid = await validateReferral(
        data.referralCode,
        adminToken
      );
      if (!isReferralValid) throw new Error("Invalid referral code");

      const price = parseFloat(
        membershipTypes
          .find((m) => m.id.toString() === data.membershipType)
          ?.price.replace("$", "") || "0"
      );
      if (price > 0) {
        const paymentRes = await fetch("/api/process-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nonce: data.cardNonce,
            amount: price.toString(),
          }),
        });
        if (!paymentRes.ok)
          throw new Error((await paymentRes.json()).error || "Payment failed");
      }

      const signupData = {
        firstname: data.firstName,
        surname: data.lastName,
        dob: data.dob,
        email: data.email,
        password: data.password,
        phonecell: data.cell,
        addressstreet: data.billingAddress,
        membershiptypeid: data.membershipType,
        companyid: data.location,
        startdate: new Date().toISOString().split("T")[0],
        firstpaymentdate: new Date().toISOString().split("T")[0],
        "Referral Code": data.referralCode,
      };
      const { token, memberid, membershipid, expires } = await signup(
        signupData
      );
      localStorage.setItem("authToken", token);
      localStorage.setItem("memberId", memberid);
      localStorage.setItem(
        "tokenExpires",
        (Date.now() + expires * 1000).toString()
      );

      await saveWaiver(data.waiverSignature, membershipid, token);
      toast.success(
        `Welcome, ${data.firstName}! Your ${
          price > 0 ? "payment and " : ""
        }membership is set.`
      );
      setStep(5);
    } catch (error) {
      toast.error("Sign-up failed", { description: String(error) });
      setStep(1);
    } finally {
      setLoading((prev) => ({ ...prev, signup: false }));
    }
  };

  const nextStep = async () => {
    const fields = [
      [
        "referralCode",
        "firstName",
        "lastName",
        "dob",
        "email",
        "password",
        "confirmPassword",
        "cell",
      ],
      ["referringMemberName", "location", "membershipType"],
      ["waiverSignature"],
      ["billingAddress", ...(isPaymentRequired() ? ["cardNonce"] : [])],
    ][step - 1] as (keyof SignUpFormData)[];
    if (!(await signUpForm.trigger(fields))) {
      toast.error("Fix errors before proceeding");
      return;
    }
    if (step === 2)
      setWaiverContent(
        (await fetchWaiver(signUpForm.getValues("membershipType"))) ||
          "No waiver"
      );
    if (step === 4) return onSignUpSubmit(signUpForm.getValues());
    setStep((prev) => prev + 1);
  };

  const prevStep = () => setStep((prev) => prev - 1);

  const checkAge = (dob: string) => {
    if (!dob) return setIsOver18(null);
    const birthDate = new Date(dob);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    const monthDiff = new Date().getMonth() - birthDate.getMonth();
    setIsOver18(
      monthDiff < 0 ||
        (monthDiff === 0 && new Date().getDate() < birthDate.getDate())
        ? age - 1 >= 18
        : age >= 18
    );
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    signUpForm.setValue("waiverSignature", "");
  };

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
      <div className="relative z-20 w-full max-w-md p-4 sm:p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <Image
            src="/logo-white.png"
            alt="Simcoquitos 24/7 Golf Club Logo"
            width={150}
            height={150}
            className="w-32 md:w-40"
          />
        </motion.div>

        <Tabs defaultValue="login" className="w-full">
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
                              setShowPasswords((p) => ({
                                ...p,
                                password: !p.password,
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading.login}
                >
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
                    {[
                      "referralCode",
                      "firstName",
                      "lastName",
                      "dob",
                      "email",
                      "password",
                      "confirmPassword",
                      "cell",
                    ].map((name) => (
                      <FormField
                        key={name}
                        control={signUpForm.control}
                        name={name as keyof SignUpFormData}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {name === "dob"
                                ? "Date of Birth"
                                : name === "cell"
                                ? "Cell Phone"
                                : name.replace(/([A-Z])/g, " $1").trim()}
                            </FormLabel>
                            <FormControl>
                              {name === "dob" ? (
                                <Input
                                  type="date"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    checkAge(e.target.value);
                                  }}
                                />
                              ) : name === "password" ||
                                name === "confirmPassword" ? (
                                <div className="relative">
                                  <Input
                                    placeholder={name.replace(
                                      "confirm",
                                      "Confirm "
                                    )}
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
                                    className="pr-10"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowPasswords((p) => ({
                                        ...p,
                                        [name === "password"
                                          ? "password"
                                          : "confirm"]:
                                          !p[
                                            name === "password"
                                              ? "password"
                                              : "confirm"
                                          ],
                                      }))
                                    }
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                  >
                                    {showPasswords[
                                      name === "password"
                                        ? "password"
                                        : "confirm"
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
                                      : name === "cell"
                                      ? "+1-123-456-7890"
                                      : name
                                  }
                                  type={name === "email" ? "email" : "text"}
                                  {...field}
                                />
                              )}
                            </FormControl>
                            {name === "dob" && isOver18 === false && (
                              <p className="text-red-600 text-sm">
                                Must be 18+
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
                      name="referringMemberName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referring Member Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                              <SelectTrigger>
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
                              <SelectTrigger>
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
                    <div className="flex space-x-2">
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
                      >
                        Next
                      </Button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <h2 className="text-xl font-semibold">
                      Step 3: Sign Waiver
                    </h2>
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
                                <Button type="button" variant="outline">
                                  Read Terms
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Waiver</DialogTitle>
                                </DialogHeader>
                                <div className="max-h-[60vh] overflow-y-auto">
                                  <p>{waiverContent || "Loading..."}</p>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex space-x-2">
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
                      >
                        Next
                      </Button>
                    </div>
                  </>
                )}

                {step === 4 && (
                  <>
                    <h2 className="text-xl font-semibold">
                      Step 4: {isPaymentRequired() ? "Payment" : "Billing Info"}
                    </h2>
                    <FormField
                      control={signUpForm.control}
                      name="billingAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {isPaymentRequired() && (
                      <FormField
                        control={signUpForm.control}
                        name="cardNonce"
                        render={() => (
                          <FormItem>
                            <FormLabel>Card Info</FormLabel>
                            <FormControl>
                              <div
                                id="card-container"
                                className="border p-4 rounded-md"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        onClick={prevStep}
                        variant="outline"
                        className="w-full"
                      >
                        Back
                      </Button>
                      <Button
                        id="card-submit"
                        type="button"
                        onClick={nextStep}
                        className="w-full"
                        disabled={loading.signup}
                      >
                        {loading.signup ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : isPaymentRequired() ? (
                          "Submit Payment"
                        ) : (
                          "Submit"
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {step === 5 && (
                  <Dialog
                    open={step === 5}
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
                        <p>
                          {isPaymentRequired()
                            ? "Payment: Processed"
                            : "No payment required"}
                        </p>
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
    </div>
  );
}
