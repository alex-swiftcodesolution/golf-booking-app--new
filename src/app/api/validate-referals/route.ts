import { NextRequest, NextResponse } from "next/server";

// type ReferralResponse = {
//   success: boolean;
//   error?: string;
// };

export async function POST(req: NextRequest) {
  try {
    // Ensure the method is POST
    if (req.method !== "POST") {
      return NextResponse.json(
        { success: false, error: "Method not allowed" },
        { status: 405 }
      );
    }

    // Parse the JSON body
    const { referralCode } = await req.json();

    // Validate referralCode
    if (!referralCode) {
      return NextResponse.json(
        { success: false, error: "Referral code is required" },
        { status: 400 }
      );
    }

    // Placeholder logic - replace with actual validation (e.g., DB check or GymMaster API)
    const isValid = referralCode.length > 0; // Mock: replace with real logic
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid referral code" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to validate referral:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate referral",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
