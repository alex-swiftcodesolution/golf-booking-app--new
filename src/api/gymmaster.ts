import axios from "axios";

// Server-side env vars
const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;
const GYMMASTER_STAFF_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_STAFF_API_KEY;
const GATEKEEPER_USERNAME = process.env.NEXT_PUBLIC_GATEKEEPER_USERNAME;
const GATEKEEPER_API_KEY = process.env.NEXT_PUBLIC_GATEKEEPER_API_KEY;

// Static mapping of club coordinates (replace with actual club IDs and coordinates)
const CLUB_COORDINATES: Record<
  number,
  { latitude: number; longitude: number }
> = {
  // club data
  1: { latitude: 38.968933, longitude: -119.92855 },
};

export interface Club {
  id: number;
  name: string;
  billingprovider: string;
}

export interface Door {
  id: number;
  name: string;
  companyid: number;
  siteid: number;
  status: number;
}

export interface Membership {
  id: number;
  name: string;
  description: string;
  price: string;
  startdate: string;
  promotional_period: string | null;
}

export interface MemberMembership {
  id: number;
  name: string;
  price: string;
  startdate: string;
  enddate: string;
  visitsused: number;
  visitlimit: number;
  companyid?: number;
}

export interface SignupResponse {
  result: string;
  token: string;
  memberid: string;
  membershipid: string;
  expires: number;
  error?: string;
}

export interface LoginResponse {
  result: { token: string; memberid: number; expires: number };
  error?: string;
}

export interface SignatureResponse {
  result: string;
  error?: string;
}

export interface MemberChargeResponse {
  result: {
    postingid: number;
    occurred: string;
    note: string;
    total: string;
  }[];
  owingamount: string;
  error?: string;
}

export interface KioskCheckinResponse {
  result: {
    response: {
      denied_reason: string | null;
      access_state: number;
      message: string;
    };
  };
  error?: string;
}

export interface Member {
  memberid: string;
  firstname: string;
  surname: string;
  email?: string;
  dob?: string;
  gender?: string;
  phonecell?: string;
  phonehome?: string;
  addressstreet?: string;
  addresssuburb?: string;
  addresscity?: string;
  addresscountry?: string;
  addressareacode?: string;
  receivesms?: string;
  receiveemail?: string;
  goal?: string;
  joindate?: string;
  sourcepromotion?: string;
  memberphoto?: string;
  totalvisits?: number;
  totalpts?: number;
  totalclasses?: number;
  linked_members?: object[];
  "Referral Code"?: string;
  "Referral Code Generated"?: string;
  customtext1?: string;
  customtext2?: string;
  customtext3?: string;
  customtext4?: string;
  customtext5?: string;
  customtext6?: string;
  customtext7?: string;
}

export interface Resource {
  id: number;
  name: string;
  companyid: number;
}

export interface Session {
  day: string;
  rid: number;
  bookingstart: string;
  bookingend: string;
}

export interface Service {
  serviceid: number;
  servicename: string;
  membershipid?: number;
  benefitid?: number;
}

export interface MemberServiceBooking {
  id: number;
  day: string;
  starttime: string;
  start_str: string;
  endtime: string;
  name: string;
  type: string;
}

// API Helpers
const getConfig = (params?: object, useStaffKey: boolean = false) => {
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

const postConfig = {
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

export const fetchCompanies = async (): Promise<Club[]> => {
  try {
    const res = await axios.get<{ result: Club[]; error?: string }>(
      "/api/gymmaster/v1/companies",
      getConfig()
    );
    if (res.data.error) throw new Error(res.data.error);
    return res.data.result;
  } catch (error) {
    console.error("Fetch companies error:", error);
    throw error;
  }
};

export const fetchMemberships = async (): Promise<Membership[]> => {
  try {
    const res = await axios.get<{ result: Membership[]; error?: string }>(
      "/api/gymmaster/v1/memberships",
      getConfig()
    );
    if (res.data.error) throw new Error(res.data.error);
    return res.data.result;
  } catch (error) {
    console.error("Fetch memberships error:", error);
    throw error;
  }
};

export const fetchWaiver = async (
  membershipTypeId: string,
  token?: string
): Promise<string> => {
  try {
    const res = await axios.get<{ result: { body: string }[]; error?: string }>(
      `/api/gymmaster/v2/membership/${membershipTypeId}/agreement`,
      getConfig({ token })
    );
    if (res.data.error) throw new Error(res.data.error);
    return res.data.result[0]?.body || "No waiver content";
  } catch (error) {
    console.error("Fetch waiver error:", error);
    throw error;
  }
};

export const saveWaiver = async (
  signature: string,
  membershipId: string,
  token: string
): Promise<string> => {
  try {
    const base64Data = signature.replace(/^data:image\/\w+;base64,/, "");
    const res = await axios.post<SignatureResponse>(
      "/api/gymmaster/v2/member/signature",
      {
        api_key: GYMMASTER_API_KEY,
        token,
        file: base64Data,
        membershipid: membershipId,
        source: "Signup Form",
      },
      postConfig
    );
    if (res.data.error) throw new Error(res.data.error);
    return res.data.result;
  } catch (error) {
    console.error("Save waiver error:", error);
    throw error;
  }
};

// 24 JUNE
const generateDeviceIdentifier = async (userId: string): Promise<string> => {
  try {
    // Collect stable browser and device attributes
    const attributes = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      userId, // Include user-specific data to ensure uniqueness per user
    };

    // Convert attributes to a stable string (sorted keys for consistency)
    const attributeString = JSON.stringify(
      attributes,
      Object.keys(attributes).sort()
    );

    // Use Web Crypto API to generate SHA-256 hash
    const msgBuffer = new TextEncoder().encode(attributeString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hashHex;
  } catch (error) {
    console.error("Device identifier generation error:", error);
    // Fallback: Retrieve or generate a persistent UUID-like string
    let fallbackId = localStorage.getItem("deviceIdentifier");
    if (!fallbackId) {
      fallbackId = crypto.randomUUID
        ? crypto.randomUUID()
        : generateRandomUUID();
      localStorage.setItem("deviceIdentifier", fallbackId);
    }
    return fallbackId;
  }
};

// Utility to generate a random UUID (polyfill for older browsers)
const generateRandomUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Helper to fetch current session fingerprint from customtext7
const fetchSessionFingerprint = async (
  token: string
): Promise<string | null> => {
  try {
    const res = await axios.get("/api/gymmaster/v1/member/profile", {
      params: { api_key: GYMMASTER_API_KEY, token },
    });
    const customtext7 = res.data.result.customtext7;
    if (customtext7) {
      const parsed = JSON.parse(customtext7);
      return parsed.activeFingerprint || null;
    }
    return null;
  } catch (error) {
    console.error("Fetch session fingerprint error:", error);
    return null;
  }
};

// Helper to store session fingerprint in customtext7
const storeSessionFingerprint = async (
  token: string,
  fingerprint: string
): Promise<void> => {
  try {
    const res = await axios.get("/api/gymmaster/v1/member/profile", {
      params: { api_key: GYMMASTER_API_KEY, token },
    });
    let customData = {};
    if (res.data.result.customtext7) {
      customData = JSON.parse(res.data.result.customtext7);
    }
    customData = { ...customData, activeFingerprint: fingerprint };
    await axios.post(
      "/api/gymmaster/v1/member/profile",
      {
        api_key: GYMMASTER_API_KEY,
        token,
        customtext7: JSON.stringify(customData),
      },
      postConfig
    );
    console.log("Stored session fingerprint:", fingerprint);
  } catch (error) {
    console.error("Store session fingerprint error:", error);
    throw new Error("Failed to store session fingerprint");
  }
};
// 24 JUNE

/*
// Helper to generate a unique fingerprint
const generateFingerprint = async (): Promise<string> => {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.error("Fingerprint error: ", error);
    const fallback = Math.random().toString(36).substring(2, 15);
    return fallback;
  }
};
*/

/*
// Helper to fetch current session fingerprint from customtext7
const fetchSessionFingerprint = async (
  token: string
): Promise<string | null> => {
  try {
    const res = await axios.get("/api/gymmaster/v1/member/profile", {
      params: { api_key: GYMMASTER_API_KEY, token },
    });
    const customtext7 = res.data.result.customtext7;
    if (customtext7) {
      const parsed = JSON.parse(customtext7);
      return parsed.activeFingerprint || null;
    }
    return null;
  } catch (error) {
    console.error("Fetch session fingerprint error:", error);
    return null; // Fallback to null if error occurs
  }
};
*/

/*
const storeSessionFingerprint = async (
  token: string,
  fingerprint: string
): Promise<void> => {
  try {
    // Fetch existing customtext7 to preserve other data (e.g., guest data)
    const res = await axios.get("/api/gymmaster/v1/member/profile", {
      params: { api_key: GYMMASTER_API_KEY, token },
    });
    let customData = {};
    if (res.data.result.customtext7) {
      customData = JSON.parse(res.data.result.customtext7);
    }
    customData = { ...customData, activeFingerprint: fingerprint };
    await axios.post(
      "/api/gymmaster/v1/member/profile",
      {
        api_key: GYMMASTER_API_KEY,
        token,
        customtext7: JSON.stringify(customData),
      },
      postConfig
    );
    console.log("Stored session fingerprint:", fingerprint);
  } catch (error) {
    console.error("Store session fingerprint error:", error);
    throw new Error("Failed to store session fingerprint");
  }
};
*/

// interface FingerprintData {
//   activeFingerprint?: string;
//   [key: string]: unknown;
// }

// Helper to clear fingerprint from customtext7 on logout
// export const clearSessionFingerprint = async (token: string): Promise<void> => {
//   try {
//     const res = await axios.get("/api/gymmaster/v1/member/profile", {
//       params: { api_key: GYMMASTER_API_KEY, token },
//     });
//     let customData: FingerprintData = {};
//     if (res.data.result.customtext7) {
//       customData = JSON.parse(res.data.result.customtext7);
//       delete customData.activeFingerprint; // Remove fingerprint
//     }
//     await axios.post(
//       "/api/gymmaster/v1/member/profile",
//       {
//         api_key: GYMMASTER_API_KEY,
//         token,
//         customtext7: JSON.stringify(customData),
//       },
//       postConfig
//     );
//     console.log("Cleared session fingerprint");
//   } catch (error) {
//     console.error("Clear session fingerprint error:", error);
//     // Log error but don't throw, as logout should proceed
//   }
// };

export const login = async (
  email: string,
  password: string
): Promise<LoginResponse["result"]> => {
  try {
    // const fingerprint = await generateFingerprint();
    // console.log("Member login attempt:", {
    //   email,
    //   api_key: GYMMASTER_API_KEY,
    //   fingerprint,
    // });

    const fingerprint = await generateDeviceIdentifier(email);
    console.log("Member login attempt:", {
      email,
      api_key: GYMMASTER_API_KEY,
      fingerprint,
    });

    const res = await axios.post<LoginResponse>(
      "/api/gymmaster/v1/login",
      { api_key: GYMMASTER_API_KEY, email, password, fingerprint },
      postConfig
    );
    console.log("Member login response:", res.data);
    if (res.data.error) {
      if (res.data.error.toLowerCase().includes("fingerprint")) {
        throw new Error(
          "Access to this account is only allowed on one device at a time. Please contact support if you have changed devices."
        );
      }
      throw new Error(res.data.error);
    }

    const existingFingerprint = await fetchSessionFingerprint(
      res.data.result.token
    );
    if (existingFingerprint && existingFingerprint !== fingerprint) {
      throw new Error(
        "Access to this account is only allowed on one device at a time. Please contact support if you have changed devices."
      );
    }

    // If no fingerprint exists, store the new one
    if (!existingFingerprint) {
      await storeSessionFingerprint(res.data.result.token, fingerprint);
    }

    localStorage.setItem("deviceFingerprint", fingerprint);

    localStorage.setItem("authToken", res.data.result.token);
    localStorage.setItem("memberId", res.data.result.memberid.toString());
    localStorage.setItem(
      "tokenExpires",
      (Date.now() + res.data.result.expires * 1000).toString()
    );
    document.cookie = `tokenExpires=${
      Date.now() + res.data.result.expires * 1000
    }; path=/; SameSite=Strict`;

    return res.data.result;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const adminLogin = async (
  memberid: string
): Promise<LoginResponse["result"]> => {
  try {
    console.log("Admin login attempt:", {
      memberid,
      api_key: GYMMASTER_STAFF_API_KEY,
    });
    const res = await axios.post<LoginResponse>(
      "/api/gymmaster/v1/login",
      { api_key: GYMMASTER_STAFF_API_KEY, memberid },
      postConfig
    );
    console.log("Admin login response:", res.data);
    if (res.data.error) throw new Error(res.data.error);
    return res.data.result;
  } catch (error) {
    console.error("Admin login error:", error);
    throw error;
  }
};

export const signup = async (data: {
  firstname: string;
  surname: string;
  dob: string;
  email: string;
  password: string;
  phonecell: string;
  phonehome?: string;
  gender?: string;
  addressstreet?: string;
  addresssuburb?: string;
  addresscity?: string;
  addresscountry?: string;
  addressareacode?: string;
  membershiptypeid: string;
  companyid: string;
  startdate: string;
  firstpaymentdate: string;
  "Referral Code"?: string;
}): Promise<SignupResponse> => {
  try {
    // Generate fingerprint during signup
    const fingerprint = await generateDeviceIdentifier(data.email);
    console.log("Signup fingerprint generated:", fingerprint);

    const res = await axios.post<SignupResponse>(
      "/api/gymmaster/v1/signup",
      { api_key: GYMMASTER_API_KEY, ...data },
      postConfig
    );
    if (res.data.error) throw new Error(res.data.error);

    // Store fingerprint in customtext7
    await storeSessionFingerprint(res.data.token, fingerprint);
    localStorage.setItem("deviceIdentifier", fingerprint);

    localStorage.setItem("authToken", res.data.token);
    localStorage.setItem("memberId", res.data.memberid);
    localStorage.setItem(
      "tokenExpires",
      (Date.now() + res.data.expires * 1000).toString()
    );
    document.cookie = `tokenExpires=${
      Date.now() + res.data.expires * 1000
    }; path=/; SameSite=Strict`;

    return res.data;
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
};

export const fetchOutstandingBalance = async (
  token: string
): Promise<MemberChargeResponse> => {
  try {
    const res = await axios.get<MemberChargeResponse>(
      "/api/gymmaster/v1/member/outstandingbalance",
      getConfig({ token })
    );
    if (res.data.error) throw new Error(res.data.error);
    return res.data;
  } catch (error) {
    console.error("Fetch outstanding balance error:", error);
    throw error;
  }
};

export const kioskCheckin = async (
  token: string,
  doorid: number
): Promise<KioskCheckinResponse["result"]> => {
  try {
    const res = await axios.post<KioskCheckinResponse>(
      "/api/gymmaster/v2/member/kiosk/checkin",
      { api_key: GYMMASTER_API_KEY, token, doorid },
      { headers: { "Content-Type": "application/json" } }
    );
    if (res.data.error) throw new Error(res.data.error);
    return res.data.result;
  } catch (error) {
    console.error("Kiosk checkin error:", error);
    throw error;
  }
};

export const fetchMemberMemberships = async (
  token: string
): Promise<MemberMembership[]> => {
  try {
    const res = await axios.get<{
      result: MemberMembership[];
      error: string | null;
    }>("/api/gymmaster/v1/member/memberships", getConfig({ token }));
    if (res.data.error) throw new Error(res.data.error);
    return res.data.result;
  } catch (error) {
    console.error("Fetch member memberships error:", error);
    throw error;
  }
};

export const fetchDoors = async (): Promise<Door[]> => {
  try {
    const auth = Buffer.from(
      `${GATEKEEPER_USERNAME}:${GATEKEEPER_API_KEY}`
    ).toString("base64");
    const res = await axios.get<{ doors: Door[]; error: string | null }>(
      "/api/gatekeeper/doors",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (res.data.error) throw new Error(res.data.error);
    return res.data.doors;
  } catch (error) {
    console.error("Fetch doors error:", error);
    throw error;
  }
};

export const fetchMemberDetails = async (token: string): Promise<Member> => {
  try {
    const res = await axios.get<{ result: Member; error: string | null }>(
      "/api/gymmaster/v1/member/profile",
      getConfig({ token })
    );
    if (res.data.error) throw new Error(res.data.error);
    return res.data.result;
  } catch (error) {
    console.error("Fetch member details error:", error);
    throw error;
  }
};

export const updateMemberProfile = async (
  token: string,
  data: Partial<Member>
): Promise<string> => {
  try {
    if (!GYMMASTER_API_KEY) {
      throw new Error("GYMMASTER_API_KEY is missing in environment");
    }

    const formData = new FormData();
    formData.append("api_key", GYMMASTER_API_KEY);
    formData.append("token", token);
    Object.entries(data).forEach(([key, value]) => {
      if (value != null) {
        formData.append(key, String(value));
      }
    });

    const res = await axios.post<{ result: string; error: string | null }>(
      "/api/gymmaster/v1/member/profile",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    if (res.data.error) throw new Error(res.data.error);
    return res.data.result;
  } catch (error) {
    console.error("Update member profile error:", error);
    throw error;
  }
};

export const fetchClubs = fetchCompanies; // Alias

export const fetchServices = async (
  token: string,
  resourceid?: number,
  companyid?: number
): Promise<Service[]> => {
  try {
    const res = await axios.get<{ result: Service[]; error: string | null }>(
      "/api/gymmaster/v1/booking/services",
      getConfig({ token, resourceid, companyid })
    );
    if (res.data.error) throw new Error(res.data.error);
    return res.data.result;
  } catch (error) {
    console.error("Fetch services error:", error);
    throw error;
  }
};

export const fetchResourcesAndSessions = async (
  token: string,
  serviceid: number,
  day: string,
  companyid: number
): Promise<{ dates: Session[]; resources: Resource[] }> => {
  try {
    const res = await axios.get<{
      result: { dates: Session[]; resources: Resource[] };
      error: string | null;
    }>(
      "/api/gymmaster/v1/booking/resources_and_sessions",
      getConfig({ token, serviceid, day, companyid })
    );
    if (res.data.error) throw new Error(res.data.error);
    return res.data.result;
  } catch (error) {
    console.error("Fetch resources and sessions error:", error);
    throw error;
  }
};

export const fetchMemberBookings = async (
  token: string
): Promise<MemberServiceBooking[]> => {
  try {
    const res = await axios.get<{
      servicebookings: MemberServiceBooking[];
      error: string | null;
    }>("/api/gymmaster/v2/member/bookings", getConfig({ token }));
    if (res.data.error) throw new Error(res.data.error);
    return res.data.servicebookings;
  } catch (error) {
    console.error("Fetch member bookings error:", error);
    throw error;
  }
};

// export const storeReferralCode = async (
//   code: string,
//   memberId: string,
//   token: string
// ): Promise<void> => {
//   try {
//     if (!code || !memberId || !token) {
//       throw new Error("Missing required parameters: code, memberId, or token");
//     }

//     // Fetch current member profile
//     const profile = await fetchMemberDetails(token);
//     const currentCodes = profile["Referral Code Generated"] || "";

//     // Append new code with comma separator
//     const updatedCodes = currentCodes ? `${currentCodes},${code}` : code;

//     // Update profile
//     const result = await updateMemberProfile(token, {
//       memberid: memberId,
//       "Referral Code Generated": updatedCodes,
//     });

//     console.log("Stored referral code:", { code, memberId, result });
//   } catch (error) {
//     console.error("Store referral code error:", error);
//     throw new Error(`Failed to store referral code: ${String(error)}`);
//   }
// };

/*
export const storeReferralCode = async (
  code: string,
  memberId: string,
  token: string
): Promise<void> => {
  try {
    if (!code || !memberId || !token) {
      throw new Error("Missing required parameters: code, memberId, or token");
    }

    // Fetch current profile to get existing referral codes
    const profile = await fetchMemberDetails(token);

    let existingCodes: string[] = [];
    try {
      existingCodes = profile.customtext4
        ? JSON.parse(profile.customtext4)
        : [];
    } catch (parseError) {
      console.error("Error parsing customtext4 (referralCodes):", parseError);
    }

    // Merge and deduplicate
    const updatedCodes = Array.from(new Set([...existingCodes, code]));

    // Update customtext4
    const result = await updateMemberProfile(token, {
      memberid: memberId,
      customtext4: JSON.stringify(updatedCodes),
    });

    console.log("Stored referral code:", { code, memberId, result });
  } catch (error) {
    console.error("Store referral code error:", error);
    throw new Error(`Failed to store referral code: ${String(error)}`);
  }
};
*/

// 24 JUNE
// src/api/gymmaster.ts
export const storeReferralCode = async (
  code: string,
  memberId: string,
  token: string
): Promise<void> => {
  try {
    if (!code || !memberId || !token) {
      throw new Error("Missing required parameters: code, memberId, or token");
    }

    const profile = await fetchMemberDetails(token);
    let existingCodes: string[] = [];
    try {
      if (profile.customtext4) {
        const parsed = JSON.parse(profile.customtext4);
        existingCodes = Array.isArray(parsed) ? parsed : [profile.customtext4]; // Handle non-array case
      }
    } catch (parseError) {
      console.error("Error parsing customtext4:", parseError);
      existingCodes = profile.customtext4 ? [profile.customtext4] : []; // Fallback to single code
    }

    const updatedCodes = Array.from(new Set([...existingCodes, code]));
    const result = await updateMemberProfile(token, {
      memberid: memberId,
      customtext4: JSON.stringify(updatedCodes),
    });

    console.log("Stored referral code:", { code, memberId, result });
  } catch (error) {
    console.error("Store referral code error:", error);
    throw new Error(`Failed to store referral code: ${String(error)}`);
  }
};
// 24 JUNE

// export const validateReferral = async (
//   referralCode: string | undefined,
//   token: string
// ): Promise<boolean> => {
//   try {
//     if (!referralCode) throw new Error("Referral code is required");

//     const res = await axios.get<{ result: Member[]; error?: string }>(
//       "/api/gymmaster/v1/members",
//       getConfig({ token }, true) // Use staff key
//     );
//     if (res.data.error) throw new Error(res.data.error);

//     // Check both fields for the referral code
//     const isValid = res.data.result.some((member) => {
//       const generatedCodes =
//         member["Referral Code Generated"]?.split(",") || [];
//       return (
//         member["Referral Code"] === referralCode ||
//         generatedCodes.includes(referralCode)
//       );
//     });

//     console.log("Referral validation:", { referralCode, isValid });
//     return isValid;
//   } catch (error) {
//     console.error("Referral validation failed:", error);
//     throw new Error(`Failed to validate referral code: ${String(error)}`);
//   }
// };

// export const fetchGuestData = async (
//   token: string
// ): Promise<{
//   guestPassesUsed: number;
//   referralCodes: string[];
//   guestBookingIds: number[];
//   guests: { name: string; email: string }[];
// }> => {
//   try {
//     const profile = await fetchMemberDetails(token);
//     console.log("Raw customtext1:", profile.customtext1); // Debug log
//     let customData = {
//       guestPassesUsed: 0,
//       referralCodes: [],
//       guestBookingIds: [],
//       guests: [],
//     };
//     try {
//       customData = profile.customtext1
//         ? JSON.parse(profile.customtext1)
//         : customData;
//     } catch (parseError) {
//       console.error("Error parsing customtext1:", parseError);
//     }
//     return {
//       guestPassesUsed: Number(customData.guestPassesUsed) || 0,
//       referralCodes: Array.isArray(customData.referralCodes)
//         ? customData.referralCodes
//         : [],
//       guestBookingIds: Array.isArray(customData.guestBookingIds)
//         ? customData.guestBookingIds.map(Number)
//         : [],
//       guests: Array.isArray(customData.guests) ? customData.guests : [],
//     };
//   } catch (error) {
//     console.error("Fetch guest data error:", error);
//     return {
//       guestPassesUsed: 0,
//       referralCodes: [],
//       guestBookingIds: [],
//       guests: [],
//     };
//   }
// };

// export const validateReferral = async (
//   referralCode: string | undefined,
//   token: string
// ): Promise<string> => {
//   if (!referralCode) throw new Error("Referral code is required");
//   const res = await axios.get<{ result: Member[]; error?: string }>(
//     "/api/gymmaster/v1/members",
//     getConfig({ token }, true)
//   );
//   if (res.data.error) throw new Error(res.data.error);
//   const inviter = res.data.result.find((member) => {
//     const generatedCodes = member.customtext4
//       ? JSON.parse(member.customtext4)
//       : [];
//     return (
//       member["Referral Code"] === referralCode ||
//       generatedCodes.includes(referralCode)
//     );
//   });
//   if (!inviter) throw new Error("Invalid referral code");
//   console.log("Referral validation:", {
//     referralCode,
//     memberid: inviter.memberid,
//   });
//   return inviter.memberid;
// };

export const validateReferral = async (
  referralCode: string | undefined,
  token: string
): Promise<boolean> => {
  if (!referralCode) return false;
  const res = await axios.get<{ result: Member[]; error?: string }>(
    "/api/gymmaster/v1/members",
    getConfig({ token }, true)
  );
  if (res.data.error) return false;
  const hasCode = res.data.result.some((member) => {
    const generatedCodes = member.customtext4
      ? JSON.parse(member.customtext4)
      : [];
    return (
      member["Referral Code"] === referralCode ||
      generatedCodes.includes(referralCode)
    );
  });
  return hasCode;
};

/*
export const fetchGuestData = async (
  token: string
): Promise<{
  guestPassesUsed: number;
  referralCodes: string[];
  guestBookingIds: number[];
  guests: { name: string; email: string; date?: string }[];
}> => {
  try {
    const profile = await fetchMemberDetails(token);

    // Parse each field separately, with fallbacks
    let guestPassesUsed = 0;
    let referralCodes: string[] = [];
    let guestBookingIds: number[] = [];
    let guests: { name: string; email: string; date?: string }[] = [];

    try {
      guestPassesUsed = profile.customtext3
        ? Number(JSON.parse(profile.customtext3))
        : 0;
    } catch (e) {
      console.error("Error parsing customtext3 (guestPassesUsed):", e);
    }

    try {
      referralCodes = profile.customtext4
        ? JSON.parse(profile.customtext4)
        : [];
    } catch (e) {
      console.error("Error parsing customtext4 (referralCodes):", e);
    }

    try {
      guestBookingIds = profile.customtext5
        ? JSON.parse(profile.customtext5).map(Number)
        : [];
    } catch (e) {
      console.error("Error parsing customtext5 (guestBookingIds):", e);
    }

    try {
      guests = profile.customtext6 ? JSON.parse(profile.customtext6) : [];
    } catch (e) {
      console.error("Error parsing customtext6 (guests):", e);
    }

    return {
      guestPassesUsed,
      referralCodes,
      guestBookingIds,
      guests,
    };
  } catch (error) {
    console.error("Fetch guest data error:", error);
    return {
      guestPassesUsed: 0,
      referralCodes: [],
      guestBookingIds: [],
      guests: [],
    };
  }
};
*/

// 24 JUNE
// src/api/gymmaster.ts
export const fetchGuestData = async (
  token: string
): Promise<{
  guestPassesUsed: number;
  referralCodes: string[];
  guestBookingIds: number[];
  guests: { name: string; email: string; date?: string }[];
}> => {
  try {
    const profile = await fetchMemberDetails(token);

    let guestPassesUsed = 0;
    let referralCodes: string[] = [];
    let guestBookingIds: number[] = [];
    let guests: { name: string; email: string; date?: string }[] = [];

    try {
      guestPassesUsed = profile.customtext3
        ? Number(JSON.parse(profile.customtext3))
        : 0;
    } catch (e) {
      console.error("Error parsing customtext3 (guestPassesUsed):", e);
    }

    try {
      if (profile.customtext4) {
        const parsed = JSON.parse(profile.customtext4);
        referralCodes = Array.isArray(parsed) ? parsed : [profile.customtext4]; // Handle non-array
      }
    } catch (e) {
      console.error("Error parsing customtext4 (referralCodes):", e);
      referralCodes = profile.customtext4 ? [profile.customtext4] : []; // Fallback
    }

    try {
      guestBookingIds = profile.customtext5
        ? JSON.parse(profile.customtext5).map(Number)
        : [];
    } catch (e) {
      console.error("Error parsing customtext5 (guestBookingIds):", e);
    }

    try {
      guests = profile.customtext6 ? JSON.parse(profile.customtext6) : [];
    } catch (e) {
      console.error("Error parsing customtext6 (guests):", e);
    }

    return {
      guestPassesUsed,
      referralCodes,
      guestBookingIds,
      guests,
    };
  } catch (error) {
    console.error("Fetch guest data error:", error);
    return {
      guestPassesUsed: 0,
      referralCodes: [],
      guestBookingIds: [],
      guests: [],
    };
  }
};
// 24 JUNE

// export const updateGuestData = async (
//   token: string,
//   guestPassesUsed: number,
//   referralCodes: string[],
//   guestBookingIds: number[],
//   guests: { name: string; email: string }[]
// ): Promise<void> => {
//   try {
//     // Fetch existing guest data to merge
//     const existingData = await fetchGuestData(token);
//     const customData = {
//       guestPassesUsed: guestPassesUsed || existingData.guestPassesUsed,
//       referralCodes:
//         referralCodes.length > 0
//           ? [...new Set([...existingData.referralCodes, ...referralCodes])]
//           : existingData.referralCodes,
//       guestBookingIds:
//         guestBookingIds.length > 0
//           ? [...existingData.guestBookingIds, ...guestBookingIds]
//           : existingData.guestBookingIds,
//       guests:
//         guests.length > 0
//           ? [...existingData.guests, ...guests]
//           : existingData.guests,
//     };
//     await updateMemberProfile(token, {
//       customtext1: JSON.stringify(customData),
//     });
//     console.log("Updated customtext1:", customData); // Debug log
//   } catch (error) {
//     console.error("Update guest data error:", error);
//     throw new Error("Failed to update guest data");
//   }
// };

// export const updateGuestData = async (
//   token: string,
//   guestPassesUsed: number,
//   referralCodes: string[],
//   guestBookingIds: number[],
//   guests: { name: string; email: string; date?: string }[] // Add date field
// ): Promise<void> => {
//   try {
//     // Fetch existing guest data to merge
//     const existingData = await fetchGuestData(token);
//     const customData = {
//       guestPassesUsed: guestPassesUsed || existingData.guestPassesUsed,
//       referralCodes:
//         referralCodes.length > 0
//           ? [...new Set([...existingData.referralCodes, ...referralCodes])]
//           : existingData.referralCodes,
//       guestBookingIds:
//         guestBookingIds.length > 0
//           ? [...existingData.guestBookingIds, ...guestBookingIds]
//           : existingData.guestBookingIds,
//       guests:
//         guests.length > 0
//           ? [...existingData.guests, ...guests]
//           : existingData.guests,
//     };
//     await updateMemberProfile(token, {
//       customtext1: JSON.stringify(customData),
//     });
//     console.log("Updated customtext1:", customData); // Debug log
//   } catch (error) {
//     console.error("Update guest data error:", error);
//     throw new Error("Failed to update guest data");
//   }
// };

export const updateGuestData = async (
  token: string,
  guestPassesUsed: number,
  referralCodes: string[],
  guestBookingIds: number[],
  guests: { name: string; email: string; date?: string }[]
): Promise<void> => {
  try {
    // Fetch existing guest data to merge
    const existingData = await fetchGuestData(token);

    const updatedGuestPassesUsed =
      guestPassesUsed ?? existingData.guestPassesUsed;

    const updatedReferralCodes =
      referralCodes.length > 0
        ? [...new Set([...existingData.referralCodes, ...referralCodes])]
        : existingData.referralCodes;

    const updatedBookingIds =
      guestBookingIds.length > 0
        ? [...existingData.guestBookingIds, ...guestBookingIds]
        : existingData.guestBookingIds;

    const updatedGuests =
      guests.length > 0
        ? [...existingData.guests, ...guests]
        : existingData.guests;

    // Send separate fields to updateMemberProfile
    await updateMemberProfile(token, {
      customtext3: JSON.stringify(updatedGuestPassesUsed), // guestPassesUsed
      customtext4: JSON.stringify(updatedReferralCodes), // referralCodes
      customtext5: JSON.stringify(updatedBookingIds), // guestBookingIds
      customtext6: JSON.stringify(updatedGuests), // guests
    });

    console.log("Updated guest data fields:", {
      customtext3: updatedGuestPassesUsed,
      customtext4: updatedReferralCodes,
      customtext5: updatedBookingIds,
      customtext6: updatedGuests,
    });
  } catch (error) {
    console.error("Update guest data error:", error);
    throw new Error("Failed to update guest data");
  }
};

// Enhanced getBrowserGeolocation with retry logic
export const getBrowserGeolocation = (): Promise<{
  latitude: number;
  longitude: number;
}> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Geolocation is not supported by this browser"));
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Please enable location services to proceed."));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Location information is unavailable."));
            break;
          case error.TIMEOUT:
            navigator.geolocation.getCurrentPosition(
              (position) =>
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                }),
              () =>
                reject(new Error("Failed to retrieve location after retry.")),
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
            );
            break;
          default:
            reject(new Error("An error occurred while fetching location."));
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });

export const getIPGeolocation = async (): Promise<{
  latitude: number;
  longitude: number;
}> => {
  try {
    const res = await axios.get("https://api.locationiq.com/v1/reverse", {
      params: {
        key: "pk.eab60eb12b9ee67087005ac83be5f4f5",
        lat: 38.968933,
        lon: -119.92855,
        format: "json",
      },
    });
    if (!res.data.lat || !res.data.lon) {
      throw new Error("Invalid geolocation data received.");
    }
    return {
      latitude: parseFloat(res.data.lat),
      longitude: parseFloat(res.data.lon),
    };
  } catch (error) {
    console.error("IP geolocation error:", error);
    throw new Error("Failed to fetch IP-based geolocation. Please try again.");
  }
};

// Combined geolocation function with caching
export const getCachedLocation = (): {
  latitude: number;
  longitude: number;
  timestamp: number;
} | null => {
  const cached = localStorage.getItem("userLocation");
  if (!cached) return null;
  const parsed = JSON.parse(cached);
  const age = Date.now() - parsed.timestamp;
  if (age > 5 * 60 * 1000) return null; // Expire after 5 minutes
  return parsed;
};

export const cacheLocation = (location: {
  latitude: number;
  longitude: number;
}): void => {
  localStorage.setItem(
    "userLocation",
    JSON.stringify({ ...location, timestamp: Date.now() })
  );
};

export const getUserLocation = async (): Promise<{
  latitude: number;
  longitude: number;
}> => {
  const cached = getCachedLocation();
  if (cached) return { latitude: cached.latitude, longitude: cached.longitude };
  const location = await (async () => {
    try {
      return await getBrowserGeolocation();
    } catch (browserError) {
      console.warn(
        "Browser geolocation failed, falling back to IP:",
        browserError
      );
      return await getIPGeolocation();
    }
  })();
  cacheLocation(location);
  return location;
};

// Real-time location watching
export const watchUserLocation = (
  onUpdate: (location: { latitude: number; longitude: number }) => void
): number => {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser");
  }
  return navigator.geolocation.watchPosition(
    (position) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      cacheLocation(location); // Cache real-time updates
      onUpdate(location);
    },
    (error) => console.error("Location watch error:", error),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
};

export const stopWatchingLocation = (watchId: number): void => {
  navigator.geolocation.clearWatch(watchId);
};

// Haversine formula to calculate distance (in meters)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Export CLUB_COORDINATES for use in validation
export const getClubCoordinates = (companyId: number) =>
  CLUB_COORDINATES[companyId];

/*
export const logMembershipAgreement = async (
  membershipId: string,
  token: string
): Promise<string> => {
  try {
    const res = await axios.post<SignatureResponse>(
      `/api/gymmaster/v2/member/membership/${membershipId}/agreement`,
      {
        api_key: GYMMASTER_API_KEY,
        token,
      },
      postConfig
    );
    if (res.data.error) throw new Error(res.data.error);
    return res.data.result;
  } catch (error) {
    console.error("Log membership agreement error:", error);
    throw error;
  }
};
*/

export const logMembershipAgreement = async (
  membershipId: string,
  token: string,
  agreementType: string = "default" // Optional parameter to indicate agreement type (e.g., "Guest Waiver")
): Promise<string> => {
  try {
    const res = await axios.post<SignatureResponse>(
      `/api/gymmaster/v2/member/membership/${membershipId}/agreement`,
      {
        api_key: GYMMASTER_API_KEY,
        token,
      },
      postConfig
    );
    if (res.data.error) throw new Error(res.data.error);
    console.log(
      `Logged ${agreementType} agreement for membership ID: ${membershipId}`
    );
    return res.data.result;
  } catch (error) {
    console.error(
      `Error logging ${agreementType} agreement for membership ID ${membershipId}:`,
      error
    );
    throw new Error(
      `Failed to log ${agreementType} agreement: ${String(error)}`
    );
  }
};

export const fetchMembershipAgreements = async (
  membershipId: string,
  token: string
): Promise<
  { id: string; name: string; status: string; lastSigned: string }[]
> => {
  try {
    const res = await axios.get<{
      result: {
        id: string;
        name: string;
        status: string;
        lastSigned: string;
      }[];
      error?: string;
    }>(
      `/api/gymmaster/v2/membership/${membershipId}/agreement`,
      getConfig({ token })
    );
    if (res.data.error) throw new Error(res.data.error);
    console.log(
      `Fetched agreements for membership ID ${membershipId}:`,
      res.data.result
    );
    return res.data.result;
  } catch (error) {
    console.error("Fetch membership agreements error:", error);
    throw error;
  }
};

export const logSpecificAgreement = async (
  memberId: string,
  token: string,
  agreementName: string
): Promise<string> => {
  try {
    // First, fetch all member agreements to find the Guest Waiver
    const agreements = await fetchAllMemberAgreements(token);
    console.log(`All agreements for member:`, agreements);
    const targetAgreement = agreements.find((a) =>
      a.name.toLowerCase().includes(agreementName.toLowerCase())
    );

    if (!targetAgreement) {
      throw new Error(`Agreement "${agreementName}" not found for member`);
    }

    console.log(`Found ${agreementName}, ID:`, targetAgreement.id);

    // Hypothetical endpoint to log a specific agreement; confirm with GymMaster
    const res = await axios.post<SignatureResponse>(
      `/api/gymmaster/v2/member/agreement/${targetAgreement.id}`, // Adjust endpoint as needed
      {
        api_key: GYMMASTER_API_KEY,
        token,
        memberid: memberId,
      },
      postConfig
    );

    if (res.data.error) throw new Error(res.data.error);
    console.log(`Logged ${agreementName} agreement for member ID: ${memberId}`);
    return res.data.result;
  } catch (error) {
    console.error(
      `Error logging ${agreementName} agreement for member ID ${memberId}:`,
      error
    );
    throw new Error(
      `Failed to log ${agreementName} agreement: ${String(error)}`
    );
  }
};

export const fetchAllMemberAgreements = async (
  token: string
): Promise<
  { id: string; name: string; status: string; lastSigned: string }[]
> => {
  try {
    const res = await axios.get<{
      result: {
        id: string;
        name: string;
        status: string;
        lastSigned: string;
      }[];
      error?: string;
    }>(
      `/api/gymmaster/v2/member/agreements`, // Hypothetical endpoint; confirm with GymMaster
      getConfig({ token })
    );
    if (res.data.error) throw new Error(res.data.error);
    console.log("Fetched all member agreements:", res.data.result);
    return res.data.result;
  } catch (error) {
    console.error("Fetch all member agreements error:", error);
    return []; // Return empty array to avoid breaking the flow
  }
};

export const resetMemberPassword = async (email: string): Promise<string> => {
  try {
    const res = await axios.post<{ result: string; error: string | null }>(
      "/api/gymmaster/v1/email/resetpassword",
      { api_key: GYMMASTER_API_KEY, email },
      postConfig
    );
    if (res.data.error) throw new Error(res.data.error);
    return res.data.result;
  } catch (error) {
    console.error("Reset password error:", error);
    throw error;
  }
};
