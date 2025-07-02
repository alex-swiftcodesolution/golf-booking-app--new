/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import axios from "axios";
import { getDb } from "@/lib/mongodb";

const GYMMASTER_API_KEY = process.env.NEXT_PUBLIC_GYMMASTER_API_KEY;

export async function POST(request: Request) {
  try {
    const { email, name, password, referralCode } = await request.json();
    const db = await getDb();

    let referringMemberName = "";
    if (referralCode) {
      const membersResponse = await axios.get("/api/gymmaster/v2/members", {
        params: { api_key: GYMMASTER_API_KEY },
      });
      const members = membersResponse.data.result || [];
      const referringMember = members.find(
        (member: any) =>
          member.customtext4 &&
          JSON.parse(member.customtext4).includes(referralCode)
      );

      if (referringMember) {
        referringMemberName = referringMember.name || "";
      } else {
        return NextResponse.json(
          { error: "Invalid referral code" },
          { status: 400 }
        );
      }
    }

    // Create user in GymMaster
    const createMemberResponse = await axios.post(
      "/api/gymmaster/v1/member/create",
      new URLSearchParams({
        api_key: GYMMASTER_API_KEY || "",
        email,
        name,
        password,
        customtext2: referringMemberName, // Store in customtext2
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    if (createMemberResponse.data.error) {
      throw new Error(
        createMemberResponse.data.error || "Failed to create member"
      );
    }

    const userId = createMemberResponse.data.result.memberid;

    // Save user to MongoDB
    await db.collection("users").insertOne({
      userId,
      email,
      name,
      createdAt: new Date(),
      referringMemberName,
    });

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to sign up" }, { status: 500 });
  }
}
