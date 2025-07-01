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
