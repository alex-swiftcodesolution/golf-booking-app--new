import axios from "axios";

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;

export interface Club {
  id: number;
  name: string;
}

export interface Membership {
  id: number;
  name: string;
  description: string;
  price: string;
  startdate: string;
  promotional_period: string | null;
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
