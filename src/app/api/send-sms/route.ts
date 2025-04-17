import { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function POST(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, phone, referrerId } = req.body;

  try {
    // 1. Generate a unique referral code (e.g., REF + random string)
    const referralCode = `REF${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    // 2. Store the referral in your database (e.g., Firebase/Postgres)
    // Example: await db.storeReferral(referralCode, referrerId, phone);
    console.log(referralCode, referrerId, phone);

    // 3. Send SMS with referral link
    const signupLink = `http://localhost:3000?ref=${referralCode}&phone=${encodeURIComponent(
      phone
    )}&name=${encodeURIComponent(name)}`;
    await twilioClient.messages.create({
      body: `Hi ${name}, you've been invited to join Our Gym! Sign up here: ${signupLink}`,
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send invite" });
  }
}
