import axios from "axios";

// Server-side env vars (no NEXT_PUBLIC_ unless client-side)
const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;
const GYMMASTER_STAFF_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_STAFF_API_KEY;
const GATEKEEPER_USERNAME = process.env.NEXT_PUBLIC_GATEKEEPER_USERNAME;
const GATEKEEPER_API_KEY = process.env.NEXT_PUBLIC_GATEKEEPER_API_KEY;

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
  memberid: string;
  "Referral Code"?: string;
  "Referral Code Generated"?: string; // Added to fix type errors
  customtext1?: string;
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
const getConfig = (params?: object) => ({
  params: { api_key: GYMMASTER_API_KEY, ...params },
});
const postConfig = {
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  transformRequest: [
    (data: Record<string, string>) => new URLSearchParams(data).toString(),
  ],
};

export const fetchCompanies = async (): Promise<Club[]> =>
  (
    await axios.get<{ result: Club[] }>(
      "/api/gymmaster/v1/companies",
      getConfig()
    )
  ).data.result;

export const fetchMemberships = async (): Promise<Membership[]> =>
  (
    await axios.get<{ result: Membership[] }>(
      "/api/gymmaster/v1/memberships",
      getConfig()
    )
  ).data.result;

export const fetchWaiver = async (
  membershipTypeId: string,
  token?: string
): Promise<string> =>
  (
    await axios.get<{ result: { body: string }[] }>(
      `/api/gymmaster/v2/membership/${membershipTypeId}/agreement`,
      getConfig({ token })
    )
  ).data.result[0]?.body || "No waiver content";

export const saveWaiver = async (
  signature: string,
  membershipId: string,
  token: string
): Promise<string> => {
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
};

export const login = async (
  email: string,
  password: string
): Promise<LoginResponse["result"]> => {
  console.log("Member login attempt:", {
    email,
    api_key: GYMMASTER_API_KEY,
  });
  const res = await axios.post<LoginResponse>(
    "/api/gymmaster/v1/login",
    { api_key: GYMMASTER_API_KEY, email, password },
    postConfig
  );
  console.log("Member login response:", res.data);
  if (res.data.error) throw new Error(res.data.error);
  return res.data.result;
};

export const adminLogin = async (
  memberid: string
): Promise<LoginResponse["result"]> => {
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
};

export const signup = async (data: {
  firstname: string;
  surname: string;
  dob: string;
  email: string;
  password: string;
  phonecell: string;
  membershiptypeid: string;
  companyid: string;
  addressstreet: string;
  startdate: string;
  firstpaymentdate: string;
  "Referral Code"?: string;
}): Promise<SignupResponse> => {
  const res = await axios.post<SignupResponse>(
    "/api/gymmaster/v1/signup",
    { api_key: GYMMASTER_API_KEY, ...data },
    postConfig
  );
  if (res.data.error) throw new Error(res.data.error);
  return res.data;
};

export const fetchOutstandingBalance = async (
  token: string
): Promise<MemberChargeResponse> => {
  const res = await axios.get<MemberChargeResponse>(
    "/api/gymmaster/v1/member/outstandingbalance",
    getConfig({ token })
  );
  if (res.data.error) throw new Error(res.data.error);
  return res.data;
};

export const kioskCheckin = async (
  token: string,
  doorid: number
): Promise<KioskCheckinResponse["result"]> => {
  const res = await axios.post<KioskCheckinResponse>(
    "/api/gymmaster/v2/member/kiosk/checkin",
    { api_key: GYMMASTER_API_KEY, token, doorid },
    { headers: { "Content-Type": "application/json" } }
  );
  if (res.data.error) throw new Error(res.data.error);
  return res.data.result;
};

export const fetchMemberMemberships = async (
  token: string
): Promise<MemberMembership[]> => {
  const res = await axios.get<{
    result: MemberMembership[];
    error: string | null;
  }>("/api/gymmaster/v1/member/memberships", getConfig({ token }));
  if (res.data.error) throw new Error(res.data.error);
  return res.data.result;
};

export const fetchDoors = async (): Promise<Door[]> => {
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
};

export const fetchMemberDetails = async (token: string): Promise<Member> => {
  const res = await axios.get<{ result: Member; error: string | null }>(
    "/api/gymmaster/v1/member/profile",
    getConfig({ token })
  );
  if (res.data.error) throw new Error(res.data.error);
  return res.data.result;
};

export const updateMemberProfile = async (
  token: string,
  data: Partial<Member>
): Promise<string> => {
  if (!GYMMASTER_API_KEY) {
    throw new Error("GYMMASTER_API_KEY is missing in environment");
  }

  const formData = new FormData();
  formData.append("api_key", GYMMASTER_API_KEY); // Now guaranteed to be string
  formData.append("token", token); // Token is already string from param
  Object.entries(data).forEach(([key, value]) => {
    if (value != null) {
      formData.append(key, String(value)); // String() ensures no undefined
    }
  });

  const res = await axios.post<{ result: string; error: string | null }>(
    "/api/gymmaster/v1/member/profile",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  if (res.data.error) throw new Error(res.data.error);
  return res.data.result;
};

export const fetchClubs = fetchCompanies; // Alias

export const fetchServices = async (
  token: string,
  resourceid?: number,
  companyid?: number
): Promise<Service[]> => {
  const res = await axios.get<{ result: Service[]; error: string | null }>(
    "/api/gymmaster/v1/booking/services",
    getConfig({ token, resourceid, companyid })
  );
  if (res.data.error) throw new Error(res.data.error);
  return res.data.result;
};

export const fetchResourcesAndSessions = async (
  token: string,
  serviceid: number,
  day: string,
  companyid: number
): Promise<{ dates: Session[]; resources: Resource[] }> => {
  const res = await axios.get<{
    result: { dates: Session[]; resources: Resource[] };
    error: string | null;
  }>(
    "/api/gymmaster/v1/booking/resources_and_sessions",
    getConfig({ token, serviceid, day, companyid })
  );
  if (res.data.error) throw new Error(res.data.error);
  return res.data.result;
};

export const fetchMemberBookings = async (
  token: string
): Promise<MemberServiceBooking[]> => {
  const res = await axios.get<{
    servicebookings: MemberServiceBooking[];
    error: string | null;
  }>("/api/gymmaster/v2/member/bookings", getConfig({ token }));
  if (res.data.error) throw new Error(res.data.error);
  return res.data.servicebookings;
};

export const storeReferralCode = async (
  code: string,
  memberId: string,
  token: string
): Promise<void> => {
  const profile = await fetchMemberDetails(token);
  const currentCodes = profile["Referral Code Generated"] || "";
  await updateMemberProfile(token, {
    memberid: memberId,
    "Referral Code Generated": currentCodes ? `${currentCodes}\n${code}` : code,
  });
};

export const validateReferral = async (
  referralCode: string,
  token: string
): Promise<boolean> => {
  try {
    const res = await axios.get<{ result: Member[] }>(
      "/api/gymmaster/v1/members",
      getConfig({ token })
    );
    const isValid = res.data.result.some(
      (member) => member["Referral Code"] === referralCode
    );
    console.log("Referral validation:", { referralCode, isValid });
    return isValid;
  } catch (error) {
    console.error("Referral validation failed:", error);
    return false;
  }
};
