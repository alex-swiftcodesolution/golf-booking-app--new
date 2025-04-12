import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { phoneNumber, referralCode } = req.body;
  if (!phoneNumber || !referralCode)
    return res.status(400).json({ error: "Missing data" });

  try {
    const message = await client.messages.create({
      body: `Welcome! Sign up and sign your waiver here: ${process.env.NEXT_PUBLIC_APP_URL}/?ref=${referralCode}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    res.status(200).json({ success: true, sid: message.sid });
  } catch (error) {
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : String(error) });
  }
}
