export interface Club {
  id: number;
  name: string;
  billingprovider: string;
  companyids?: number[]; // Added from GymMaster schema
}

export interface Door {
  id: number;
  name: string;
  companyid: number;
  siteid?: number; // Keep if used in Gatekeeper integration
  status?: number; // Keep if used in Gatekeeper integration
}

export interface Membership {
  id: number;
  name: string;
  description: string;
  price: string;
  price_tax: string;
  signupfee: string;
  signupfee_tax: string;
  signupfee_label: string;
  onlinecash: boolean;
  programme_ref: string;
  programmegroupid: string;
  startdate: string;
  divisionid: number;
  divisionname: string;
  bgcolour: string;
  hide_signupfee: boolean;
  maintenance_fee: string | null;
  maintenance_interval: string | null;
  promotional_period: string | null;
  promotional_price: string | null;
  promotion_period_description: string | null;
  freeuntil: string | null;
  freeuntil_available: boolean;
  promotion_freeuntil_description: string | null;
  show_pricedescription: boolean;
  account_credit: string | null;
  zero_signupfee: boolean;
  discountdescription: string | null;
  sortorder: number;
  companyids: number[];
}

export interface MemberMembership {
  id: number;
  name: string;
  price: string;
  startdate: string;
  enddate: string;
  visitsused: number;
  visitlimit: number;
}

export interface SignupResponse {
  token: string;
  memberid: string;
  membershipid: string;
  expires: number;
  error?: string;
}

export interface LoginResponse {
  result: { token: string; memberid: string | number; expires: number };
  error?: string;
}

export interface SignatureResponse {
  result: string;
  error?: string;
}

export interface MemberChargeResponse {
  result: {
    owingamount: string;
    charges: {
      postingid: number;
      occurred: string;
      note: string;
      total: string;
    }[];
  };
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

export interface LinkedMember {
  id: number;
  firstname: string;
  surname: string;
  relationship: string;
}

export interface Member {
  id: number; // Changed to number to match GymMaster
  firstname: string;
  surname: string;
  email?: string;
  dob?: string;
  gender?: "M" | "F" | "O";
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
  linked_members?: LinkedMember[];
  ReferralCode?: string; // Custom field
  ReferralCodeGenerated?: string; // Custom field
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
  companyname: string;
  resourceimage: string;
}

export interface Session {
  day: string;
  dayofweek: string;
  bookingstart: string;
  bookingend: string;
  start_str: string;
  end_str: string;
  price: string;
  rid: number;
  btname: string;
  resourceimage: string;
}

export interface Service {
  serviceid: number;
  servicename: string;
  membershipid?: number;
  benefitid?: number;
  status: string;
  price: string;
}

export interface MemberServiceBooking {
  servicebookingid: number; // Changed to match createBooking
  day: string;
  starttime: string;
  start_str: string;
  endtime: string;
  end_str: string;
  name: string;
  type: string;
  room?: string;
  equipment?: string;
  serviceid: number;
  resourceid?: number;
  companyid: number;
  status: string;
}
