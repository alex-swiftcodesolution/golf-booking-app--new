import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    const db = await getDb();
    const bookings = await db.collection("bookings").find({ userId }).toArray();
    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: b.bookingId,
        date: b.date,
        time: b.time,
        location: b.location,
        bay: b.bay,
        servicename: b.servicename,
        guests: [], // Guests are managed separately via fetchGuestData
        guestPassUsage: { free: 0, charged: 0 }, // Simplified for this context
        day: new Date(b.date).toLocaleDateString("en-US", { weekday: "long" }),
        starttime: b.time,
      })),
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
