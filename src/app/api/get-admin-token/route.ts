import { NextResponse } from "next/server";
import { adminLogin } from "@/api/gymmaster";

export async function GET() {
  try {
    const memberid = process.env.ADMIN_MEMBER_ID;
    if (!memberid) throw new Error("Admin member ID not configured");

    const { token } = await adminLogin(memberid);
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Admin token fetch error:", error);
    return NextResponse.json(
      { error: "Failed to get admin token" },
      { status: 500 }
    );
  }
}
