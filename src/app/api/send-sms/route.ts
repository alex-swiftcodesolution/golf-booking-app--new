import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(req: NextRequest) {
  // Ensure the method is POST
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Parse the JSON body
    const { name, phone, referrerId } = await req.json();

    // Validate required fields
    if (!name || !phone || !referrerId) {
      return NextResponse.json(
        { error: "Missing required fields: name, phone, or referrerId" },
        { status: 400 }
      );
    }

    // Generate a unique referral code
    const referralCode = `REF${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    // Store the referral in your database (placeholder)
    console.log("Storing referral:", { referralCode, referrerId, phone });
    // Example: await db.storeReferral(referralCode, referrerId, phone);

    // Send SMS with referral link
    const signupLink = `${
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    }?ref=${referralCode}&phone=${encodeURIComponent(
      phone
    )}&name=${encodeURIComponent(name)}`;
    await twilioClient.messages.create({
      body: `Hi ${name}, you've been invited to join Our Gym! Sign up here: ${signupLink}`,
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Failed to send SMS:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to send invite", details: errorMessage },
      { status: 500 }
    );
  }
}
