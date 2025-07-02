import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { bookingId, date, time, location, bay, servicename, userId } =
      await request.json();
    const db = await getDb();
    await db.collection("bookings").insertOne({
      bookingId,
      date,
      time,
      location,
      bay,
      servicename,
      userId,
      createdAt: new Date(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving booking:", error);
    return NextResponse.json(
      { error: "Failed to save booking" },
      { status: 500 }
    );
  }
}
