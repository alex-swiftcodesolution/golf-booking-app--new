"use client";
import { useState, useRef, useEffect } from "react";
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
  fetchWaiver,
  saveWaiver,
  login,
  signup,
  Club,
  Membership,
} from "@/api/gymmaster";

const signUpSchema = z
  .object({
    referralCode: z.string().min(1, "Referral code is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dob: z
      .string()
      .min(1, "Date of birth is required")
      .refine(
        (dob) => {
          const today = new Date();
          const birthDate = new Date(dob);
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          return monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
            ? age - 1 >= 18
            : age >= 18;
        },
        { message: "You must be at least 18 years old" }
      ),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
    cell: z
      .string()
      .min(10, "Please enter a valid phone number")
      .regex(
        /^\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/,
        "Please enter a valid phone number (e.g., +1-123-456-7890)"
      ),
    referringMemberName: z.string().min(1, "Referring member name is required"),
    location: z.string().min(1, "Please select a location"),
    membershipType: z.string().min(1, "Please select a membership type"),
    waiverSignature: z.string().min(1, "Please sign the waiver"),
    billingAddress: z.string().min(1, "Billing address is required"),
    // cardNonce: z.string().min(1, "Payment information is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

export default function Home() {
  const [isSignUpLoading, setIsSignUpLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isOver18, setIsOver18] = useState<boolean | null>(null);
  const [locations, setLocations] = useState<Club[]>([]);
  const [membershipTypes, setMembershipTypes] = useState<Membership[]>([]);
  const [waiverContent, setWaiverContent] = useState("");
  // const [paymentClient, setPaymentClient] = useState<any>(null);
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
      // cardNonce: "",
    },
  });

  useEffect(() => {
    // const loadSquareSdk = async () => {
    //   if (!window.Square) {
    //     const script = document.createElement("script");
    //     script.src = "https://js.squarecdn.com/square.js";
    //     script.async = true;
    //     script.onload = () => {
    //       const client = new window.Square.payments(
    //         process.env.NEXT_PUBLIC_SQUARE_APP_ID,
    //         process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
    //       );
    //       setPaymentClient(client);
    //     };
    //     document.body.appendChild(script);
    //   }
    // };

    const fetchData = async () => {
      try {
        const companies = await fetchCompanies();
        setLocations(companies);
        const memberships = await fetchMemberships();
        setMembershipTypes(memberships);
      } catch (error) {
        toast.error("Failed to load data", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    // loadSquareSdk();
    fetchData();
  }, []);

  // useEffect(() => {
  //   if (paymentClient && currentStep === 3) {
  //     const initializeCard = async () => {
  //       try {
  //         const card = await paymentClient.card();
  //         await card.attach("#card-container");
  //         signUpForm.register("cardNonce");
  //         card.addEventListener("submit", async () => {
  //           const result = await card.tokenize();
  //           if (result.status === "OK") {
  //             signUpForm.setValue("cardNonce", result.token);
  //           } else {
  //             toast.error("Payment initialization failed", {
  //               description: result.errors?.[0]?.message || "Unknown error",
  //             });
  //           }
  //         });
  //       } catch (error) {
  //         toast.error("Failed to initialize payment", {
  //           description: error instanceof Error ? error.message : "Unknown error",
  //         });
  //       }
  //     };
  //     initializeCard();
  //   }
  // }, [paymentClient, currentStep, signUpForm]);

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoginLoading(true);
    try {
      const { token, memberid, expires } = await login(
        data.email,
        data.password
      );
      localStorage.setItem("authToken", token);
      localStorage.setItem("memberId", memberid.toString());
      const expiresInMs = expires * 1000;
      localStorage.setItem(
        "tokenExpires",
        (Date.now() + expiresInMs).toString()
      );

      toast.success("Logged in!", {
        description: `Welcome back, ${data.email}!`,
      });
      router.push("/dashboard");
    } catch (error) {
      toast.error("Login failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoginLoading(false);
    }
  };

  const onSignUpSubmit = async (data: SignUpFormData) => {
    setIsSignUpLoading(true);
    try {
      const validReferralCode = "REF12345"; // Only mocked part
      if (data.referralCode !== validReferralCode) {
        signUpForm.setError("referralCode", {
          message: "Invalid referral code",
        });
        setCurrentStep(1);
        setIsSignUpLoading(false);
        return;
      }

      const signupData = {
        firstname: data.firstName,
        surname: data.lastName,
        dob: data.dob,
        email: data.email,
        password: data.password,
        phonecell: data.cell,
        membershiptypeid: data.membershipType,
        companyid: data.location,
        addressstreet: data.billingAddress,
        startdate: new Date().toISOString().split("T")[0],
        firstpaymentdate: new Date().toISOString().split("T")[0],
      };
      const {
        token: authToken,
        memberid,
        membershipid,
        expires,
      } = await signup(signupData);

      localStorage.setItem("authToken", authToken);
      localStorage.setItem("memberId", memberid);
      const expiresInMs = expires * 1000;
      localStorage.setItem(
        "tokenExpires",
        (Date.now() + expiresInMs).toString()
      );

      await saveWaiver(data.waiverSignature, membershipid, authToken);

      // const owingAmount = await chargeMember(memberid, authToken);
      // const squarePaymentId = await processPayment(owingAmount, data.cardNonce);
      // toast.success("Payment processed via Square!", {
      //   description: `Payment ID: ${squarePaymentId}`,
      // });

      toast.success("Sign-up successful!", {
        description: `Welcome aboard, ${data.firstName}! Your membership is active.`,
      });
      signUpForm.reset();
      setCurrentStep(1);
      setIsOver18(null);
      router.push("/dashboard");
    } catch (error) {
      toast.error("Sign-up failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSignUpLoading(false);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate: (keyof SignUpFormData)[] =
      currentStep === 1
        ? [
            "referralCode",
            "firstName",
            "lastName",
            "dob",
            "email",
            "password",
            "confirmPassword",
            "cell",
          ]
        : currentStep === 2
        ? ["referringMemberName", "location", "membershipType"]
        : [];

    const isValid = await signUpForm.trigger(fieldsToValidate);
    if (!isValid) {
      toast.error("Please fix errors in this step before proceeding.");
      return;
    }

    if (currentStep === 2 && signUpForm.getValues("membershipType")) {
      const waiver = await fetchWaiver(signUpForm.getValues("membershipType"));
      setWaiverContent(waiver);
    }
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const checkAge = (dob: string) => {
    if (!dob) {
      setIsOver18(null);
      return;
    }
    const today = new Date();
    const birthDate = new Date(dob);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    setIsOver18(
      monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
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
      <div className="relative z-20 w-full max-w-md p-4 sm:p-6 space-y-6 sm:space-y-8">
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
            className="w-24 sm:w-32 md:w-40"
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
                className="space-y-4 bg-white/90 p-4 sm:p-6 rounded-lg shadow-lg"
              >
                <FormField
                  control={loginForm.control}
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
                          className="text-sm sm:text-base"
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Password"
                            type={showPassword ? "text" : "password"}
                            {...field}
                            className="text-sm sm:text-base pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full py-2.5 sm:py-3 text-sm sm:text-base"
                  disabled={isLoginLoading}
                >
                  {isLoginLoading ? (
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
                className="space-y-4 bg-white/90 p-4 sm:p-6 rounded-lg shadow-lg overflow-x-auto"
              >
                {currentStep === 1 && (
                  <>
                    <h2 className="text-lg sm:text-xl font-semibold">
                      Step 1: Personal Information
                    </h2>
                    <FormField
                      control={signUpForm.control}
                      name="referralCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            Referral Code
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter referral code"
                              {...field}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            First Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              {...field}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            Last Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              {...field}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            Date of Birth
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                checkAge(e.target.value);
                              }}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          {isOver18 === false && (
                            <p className="text-xs sm:text-sm text-red-600">
                              You must be at least 18 years old to proceed.
                            </p>
                          )}
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
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
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Password"
                                type={showPassword ? "text" : "password"}
                                {...field}
                                className="text-sm sm:text-base pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-500" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            Confirm Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Confirm Password"
                                type={showConfirmPassword ? "text" : "password"}
                                {...field}
                                className="text-sm sm:text-base pr-10"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-500" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="cell"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            Cell Phone
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+1-123-456-7890"
                              {...field}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="w-full py-2.5 sm:py-3 text-sm sm:text-base"
                      disabled={isOver18 === false || isOver18 === null}
                    >
                      Next
                    </Button>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <h2 className="text-lg sm:text-xl font-semibold">
                      Step 2: Membership Details
                    </h2>
                    <FormField
                      control={signUpForm.control}
                      name="referringMemberName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            Referring Member Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Jane Smith"
                              {...field}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            Location
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full text-sm sm:text-base">
                                <SelectValue placeholder="Choose a location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md">
                              {locations.map((loc) => (
                                <SelectItem
                                  key={loc.id}
                                  value={loc.id.toString()}
                                  className="text-sm sm:text-base"
                                >
                                  {loc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="membershipType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            Membership Type
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              fetchWaiver(value).then(setWaiverContent);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full text-sm sm:text-base">
                                <SelectValue placeholder="Choose a membership type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md">
                              {membershipTypes.map((type) => (
                                <SelectItem
                                  key={type.id}
                                  value={type.id.toString()}
                                  className="text-sm sm:text-base whitespace-normal"
                                >
                                  {type.name} - {type.price} (
                                  {type.promotional_period || "N/A"})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {field.value && (
                            <div className="mt-2 p-3 bg-gray-100 rounded-md text-sm sm:text-base">
                              <p>
                                <strong>Name:</strong>{" "}
                                {
                                  membershipTypes.find(
                                    (type) => type.id.toString() === field.value
                                  )?.name
                                }
                              </p>
                              <p>
                                <strong>Description:</strong>{" "}
                                {
                                  membershipTypes.find(
                                    (type) => type.id.toString() === field.value
                                  )?.description
                                }
                              </p>
                              <p>
                                <strong>Price:</strong>{" "}
                                {
                                  membershipTypes.find(
                                    (type) => type.id.toString() === field.value
                                  )?.price
                                }
                              </p>
                              <p>
                                <strong>Start Date:</strong>{" "}
                                {
                                  membershipTypes.find(
                                    (type) => type.id.toString() === field.value
                                  )?.startdate
                                }
                              </p>
                              <p>
                                <strong>Length:</strong>{" "}
                                {membershipTypes.find(
                                  (type) => type.id.toString() === field.value
                                )?.promotional_period || "N/A"}
                              </p>
                            </div>
                          )}
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col space-y-2">
                      <Button
                        type="button"
                        onClick={prevStep}
                        variant="outline"
                        className="w-full py-2.5 sm:py-3 text-sm sm:text-base"
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="w-full py-2.5 sm:py-3 text-sm sm:text-base"
                      >
                        Next
                      </Button>
                    </div>
                  </>
                )}

                {currentStep === 3 && (
                  <>
                    <h2 className="text-lg sm:text-xl font-semibold">
                      Step 3: Waiver and Billing
                    </h2>
                    <FormField
                      control={signUpForm.control}
                      name="waiverSignature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            Sign the Waiver
                          </FormLabel>
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
                              Clear Signature
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button type="button" variant="outline">
                                  Read Terms & Conditions
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    Terms & Conditions and Waiver
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="max-h-[60vh] overflow-y-auto">
                                  <p>
                                    {waiverContent ||
                                      "Loading waiver content..."}
                                  </p>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="billingAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">
                            Billing Address
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123 Main St"
                              {...field}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    {/* <FormField
                      control={signUpForm.control}
                      name="cardNonce"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Payment Information</FormLabel>
                          <FormControl>
                            <div id="card-container" className="border p-4 rounded-md"></div>
                          </FormControl>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    /> */}
                    <div className="flex flex-col space-y-2">
                      <Button
                        type="button"
                        onClick={prevStep}
                        variant="outline"
                        className="w-full py-2.5 sm:py-3 text-sm sm:text-base"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="w-full py-2.5 sm:py-3 text-sm sm:text-base"
                        disabled={isSignUpLoading}
                      >
                        {isSignUpLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          "Sign Up"
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
