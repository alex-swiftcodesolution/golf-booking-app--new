import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;
const GYMMASTER_STAFF_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_STAFF_API_KEY;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// API Helpers
export const getConfig = (params?: object, useStaffKey: boolean = false) => {
  const apiKey = useStaffKey ? GYMMASTER_STAFF_API_KEY : GYMMASTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      `${useStaffKey ? "Staff" : "Regular"} API key is missing in environment`
    );
  }
  return {
    params: { api_key: apiKey, ...params },
  };
};

export const postConfig = {
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  transformRequest: [
    (data: Record<string, unknown>) => {
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (value != null) {
          params.append(key, String(value));
        }
      });
      return params.toString();
    },
  ],
};

export const generateReferralCode = () => {
  const start = 102000;
  const key = "referralCounter";
  const current = parseInt(localStorage.getItem(key) || start.toString(), 10);
  localStorage.setItem(key, (current + 1).toString());
  return current.toString();
};
