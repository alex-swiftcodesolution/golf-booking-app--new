import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { date, location, bays, timeSlots } = await request.json();
    const db = await getDb();
    const bookedSlots = await db
      .collection("bookings")
      .find({
        date,
        location,
        bay: { $in: bays },
        time: { $in: timeSlots },
      })
      .toArray();

    const unavailableSlots = bookedSlots.map((slot) => ({
      time: slot.time,
      bay: slot.bay,
    }));

    return NextResponse.json({ unavailableSlots });
  } catch (error) {
    console.error("Error checking slots:", error);
    return NextResponse.json(
      { error: "Failed to check slots" },
      { status: 500 }
    );
  }
}
