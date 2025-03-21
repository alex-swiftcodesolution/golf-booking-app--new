// src/app/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Schema for login form
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Schema for sign-up form
const signupSchema = z.object({
  referralCode: z.string().min(1, "Referral code is required"),
  name: z.string().min(1, "Name is required"),
  email: z
    .string()
    .email("Please enter a valid email")
    .min(1, "Email is required"),
  membershipType: z.enum(["Basic", "Premium"], {
    required_error: "Please select a membership type",
  }),
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Sign-up form
  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      referralCode: "",
      name: "",
      email: "",
      membershipType: "Basic",
    },
  });

  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Login successful", {
        description: `Welcome back, ${data.username}!`,
      });
      router.push("/dashboard");
    } catch {
      toast.error("Login failed", {
        description: "Please check your credentials and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSignupSubmit = async (data: z.infer<typeof signupSchema>) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Sign-up successful", {
        description: `Welcome, ${data.name}! Your ${data.membershipType} membership has been created.`,
      });
      signupForm.reset();
      router.push("/dashboard");
    } catch {
      toast.error("Sign-up failed", {
        description: "Please check your referral code and try again.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl text-center">
              Member Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Login Form */}
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
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
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>

            {/* Sign Up with Referral Code */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Not a member?{" "}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" className="p-0">
                      Sign up with a referral code
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Sign Up with Referral Code</DialogTitle>
                      <DialogDescription>
                        Enter your referral code and details to sign up.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...signupForm}>
                      <form
                        onSubmit={signupForm.handleSubmit(onSignupSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={signupForm.control}
                          name="referralCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Referral Code</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter referral code"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signupForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signupForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your email"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signupForm.control}
                          name="membershipType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Membership Type</FormLabel>
                              <FormControl>
                                <select
                                  {...field}
                                  className="w-full p-2 border rounded-md"
                                >
                                  <option value="Basic">Basic</option>
                                  <option value="Premium">Premium</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full">
                          Sign Up
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
