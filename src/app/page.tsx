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
} from "@/api/gymmaster";

const signUpSchema = z
  .object({
    referralCode: z.string().optional(),
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
    phoneCell: z
      .string()
      .regex(
        /^\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/,
        "Use format: +1-123-456-7890"
      ),
    location: z.string().min(1, "Select a location"),
    membershipType: z.string().min(1, "Select a membership type"),
    waiverSignature: z.string().min(1, "Sign the waiver"),
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
        toast.error("Failed to load data", { description: String(error) });
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
      toast.success(`Welcome back, ${data.email}!`);
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed", { description: String(error) });
    } finally {
      setLoading((prev) => ({ ...prev, login: false }));
    }
  };

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
        ...(data.referralCode && { "Referral Code": data.referralCode }),
      };

      const { token, memberid, membershipid, expires } =
        await signup(signupData);
      localStorage.setItem("authToken", token);
      localStorage.setItem("memberId", memberid);
      localStorage.setItem(
        "tokenExpires",
        (Date.now() + expires * 1000).toString()
      );

      await saveWaiver(data.waiverSignature, membershipid, token);

      toast.success(`Welcome, ${data.firstName}! Your membership is set.`);
      setStep(4);
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Sign-up failed", { description: String(error) });
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
      ["waiverSignature"],
    ];
    if (!(await signUpForm.trigger(fields[step - 1]))) {
      toast.error("Please fix errors before proceeding");
      return;
    }
    if (step === 1 && signUpForm.getValues("referralCode")) {
      try {
        const token = localStorage.getItem("authToken") || "";
        const isValid = await validateReferral(
          signUpForm.getValues("referralCode") || "",
          token
        );
        console.log("Referral validation result:", {
          code: signUpForm.getValues("referralCode"),
          isValid,
        });
      } catch (error) {
        console.error("Referral validation error:", error);
      }
      // Clear any existing referral code errors and proceed regardless
      signUpForm.clearErrors("referralCode");
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
      return onSignUpSubmit(signUpForm.getValues());
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

  return (
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
                  {[
                    "referralCode",
                    "firstName",
                    "lastName",
                    "dob",
                    "email",
                    "password",
                    "confirmPassword",
                    "phoneCell",
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
                              : name === "phoneCell"
                                ? "Cell Phone"
                                : name === "referralCode"
                                  ? "Referral Code (Optional)"
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
                                      ? "+1-123-456-7890"
                                      : name === "referralCode"
                                        ? "Referral code (optional)"
                                        : name.replace(/([A-Z])/g, " $1").trim()
                                }
                                type={name === "email" ? "email" : "text"}
                                {...field}
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
                              <Button type="button" variant="outline">
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
