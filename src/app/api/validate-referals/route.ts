import type { NextApiRequest, NextApiResponse } from "next";

type ReferralResponse = {
  success: boolean;
  error?: string;
};

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<ReferralResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { referralCode } = req.body as { referralCode: string };
  if (!referralCode) {
    return res
      .status(400)
      .json({ success: false, error: "Referral code is required" });
  }

  // Placeholder logic - replace with actual validation (e.g., DB check or GymMaster API if provided)
  const isValid = referralCode.length > 0; // Mock: client to provide real logic
  if (!isValid) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid referral code" });
  }

  res.status(200).json({ success: true });
}
