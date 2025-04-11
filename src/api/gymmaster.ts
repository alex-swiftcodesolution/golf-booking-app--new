import axios from "axios";

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;
const GATEKEEPER_USERNAME = process.env.NEXT_PUBLIC_GATEKEEPER_USERNAME;
const GATEKEEPER_API_KEY = process.env.NEXT_PUBLIC_GATEKEEPER_API_KEY;

export interface Club {
  id: number;
  name: string;
}

export interface Door {
  id: number; // doorid
  name: string;
  companyid: number; // Links to club
  siteid: number;
  status: number; // 1 = active
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
  enddate: string; // "Open Ended" or ISO date (YYYY-MM-DD)
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
  result: {
    token: string;
    memberid: number;
    expires: number;
  };
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

interface Member {
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
}

export interface Resource {
  id: number;
  name: string;
  companyid: number;
}

export interface Session {
  day: string; // YYYY-MM-DD
  rid: number;
  bookingstart: string; // HH:MM:SS
  bookingend: string; // HH:MM:SS
}

export interface Service {
  serviceid: number;
  servicename: string;
  membershipid?: number;
  benefitid?: number;
}

export interface MemberServiceBooking {
  id: number;
  day: string; // YYYY-MM-DD
  starttime: string; // HH:MM:SS
  start_str: string; // HH:MM:SS
  endtime: string; // HH:MM:SS
  name: string; // Resource name (bay)
  type: string;
}

// Member Portal API Functions
export const fetchCompanies = async (): Promise<Club[]> => {
  const response = await axios.get<{ result: Club[] }>(
    "/api/gymmaster/v1/companies",
    { params: { api_key: GYMMASTER_API_KEY } }
  );
  return response.data.result;
};

export const fetchMemberships = async (): Promise<Membership[]> => {
  const response = await axios.get<{ result: Membership[] }>(
    "/api/gymmaster/v1/memberships",
    { params: { api_key: GYMMASTER_API_KEY } }
  );
  return response.data.result;
};

export const fetchWaiver = async (
  membershipTypeId: string,
  token?: string
): Promise<string> => {
  const response = await axios.get<{ result: { body: string }[] }>(
    `/api/gymmaster/v2/membership/${membershipTypeId}/agreement`,
    { params: { api_key: GYMMASTER_API_KEY, token } }
  );
  return response.data.result[0]?.body || "No waiver content available.";
};

export const saveWaiver = async (
  signature: string,
  membershipId: string,
  token: string
): Promise<string> => {
  const base64Data = signature.replace(/^data:image\/\w+;base64,/, "");
  const response = await axios.post<SignatureResponse>(
    "/api/gymmaster/v2/member/signature",
    {
      api_key: GYMMASTER_API_KEY,
      token,
      file: base64Data,
      membershipid: membershipId,
      source: "Signup Form",
    },
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      transformRequest: [(data) => new URLSearchParams(data).toString()],
    }
  );
  if (response.data.error) throw new Error(response.data.error);
  return response.data.result;
};

export const login = async (
  email: string,
  password: string
): Promise<LoginResponse["result"]> => {
  const response = await axios.post<LoginResponse>(
    "/api/gymmaster/v1/login",
    { api_key: GYMMASTER_API_KEY, email, password },
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      transformRequest: [(data) => new URLSearchParams(data).toString()],
    }
  );
  if (response.data.error) throw new Error(response.data.error);
  return response.data.result;
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
}): Promise<SignupResponse> => {
  const response = await axios.post<SignupResponse>(
    "/api/gymmaster/v1/signup",
    { api_key: GYMMASTER_API_KEY, ...data },
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      transformRequest: [(data) => new URLSearchParams(data).toString()],
    }
  );
  if (response.data.error) throw new Error(response.data.error);
  return response.data;
};

export const fetchOutstandingBalance = async (
  token: string
): Promise<MemberChargeResponse> => {
  const response = await axios.get<MemberChargeResponse>(
    "/api/gymmaster/v1/member/outstandingbalance",
    { params: { api_key: GYMMASTER_API_KEY, token } }
  );
  if (response.data.error) throw new Error(response.data.error);
  return response.data;
};

export const kioskCheckin = async (
  token: string,
  doorid: number
): Promise<KioskCheckinResponse["result"]> => {
  const response = await axios.post<KioskCheckinResponse>(
    "/api/gymmaster/v2/member/kiosk/checkin",
    { api_key: GYMMASTER_API_KEY, token, doorid },
    { headers: { "Content-Type": "application/json" } }
  );
  if (response.data.error) throw new Error(response.data.error);
  return response.data.result;
};

export const fetchMemberMemberships = async (
  token: string
): Promise<MemberMembership[]> => {
  const response = await axios.get<{
    result: MemberMembership[];
    error: string | null;
  }>("/api/gymmaster/v1/member/memberships", {
    params: { api_key: GYMMASTER_API_KEY, token },
  });
  if (response.data.error) throw new Error(response.data.error);
  return response.data.result;
};

export const fetchDoors = async (): Promise<Door[]> => {
  const auth = Buffer.from(
    `${GATEKEEPER_USERNAME}:${GATEKEEPER_API_KEY}`
  ).toString("base64");
  const response = await axios.get<{ doors: Door[]; error: string | null }>(
    "/api/gatekeeper/doors",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (response.data.error) throw new Error(response.data.error);
  return response.data.doors;
};

export const fetchMemberDetails = async (token: string): Promise<Member> => {
  const response = await axios.get<{ result: Member; error: string | null }>(
    "/api/gymmaster/v1/member/profile",
    { params: { api_key: GYMMASTER_API_KEY, token } }
  );
  if (response.data.error) throw new Error(response.data.error);
  return response.data.result;
};

export const updateMemberProfile = async (
  token: string,
  data: Partial<Member>
): Promise<string> => {
  const formData = new FormData();
  formData.append("api_key", GYMMASTER_API_KEY || "");
  formData.append("token", token);
  // Only append fields that are provided
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  const response = await axios.post<{ result: string; error: string | null }>(
    "/api/gymmaster/v1/member/profile",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  if (response.data.error) throw new Error(response.data.error);
  return response.data.result;
};

export const fetchClubs = async (): Promise<Club[]> => {
  const response = await axios.get<{ result: Club[]; error: string | null }>(
    "/api/gymmaster/v1/companies",
    { params: { api_key: GYMMASTER_API_KEY }, withCredentials: true }
  );
  if (response.data.error) throw new Error(response.data.error);
  return response.data.result;
};

export const fetchServices = async (
  token: string, // Keep for now, but we'll phase it out
  resourceid?: number,
  companyid?: number
): Promise<Service[]> => {
  const response = await axios.get<{ result: Service[]; error: string | null }>(
    "/api/gymmaster/v1/booking/services",
    {
      params: {
        api_key: GYMMASTER_API_KEY,
        token,
        resourceid,
        companyid,
      },
      withCredentials: true, // Allow cookies to be sent
    }
  );
  if (response.data.error) throw new Error(response.data.error);
  return response.data.result;
};

export const fetchResourcesAndSessions = async (
  token: string,
  serviceid: number,
  day: string,
  companyid: number
): Promise<{ dates: Session[]; resources: Resource[] }> => {
  const response = await axios.get<{
    result: { dates: Session[]; resources: Resource[] };
    error: string | null;
  }>("/api/gymmaster/v1/booking/resources_and_sessions", {
    params: {
      api_key: GYMMASTER_API_KEY,
      token,
      serviceid,
      day,
      companyid,
    },
    withCredentials: true,
  });
  if (response.data.error) throw new Error(response.data.error);
  return response.data.result;
};

export const fetchMemberBookings = async (
  token: string
): Promise<MemberServiceBooking[]> => {
  const response = await axios.get<{
    servicebookings: MemberServiceBooking[];
    error: string | null;
  }>("/api/gymmaster/v2/member/bookings", {
    params: { api_key: GYMMASTER_API_KEY, token },
  });
  if (response.data.error) throw new Error(response.data.error);
  return response.data.servicebookings;
};
