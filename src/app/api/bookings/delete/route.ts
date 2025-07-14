/*
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json();
    const db = await getDb();
    await db.collection("bookings").deleteOne({ bookingId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json(
      { error: "Failed to delete booking" },
      { status: 500 }
    );
  }
}
*/

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { bookingId, userId } = await request.json();
    console.log(
      "Deleting booking for bookingId:",
      bookingId,
      "userId:",
      userId
    ); // Debug log
    const db = await getDb();
    const result = await db.collection("bookings").deleteOne({
      bookingId: Number(bookingId),
      userId: Number(userId),
    });
    if (result.deletedCount === 0) {
      console.warn(
        "No booking found to delete for bookingId:",
        bookingId,
        "userId:",
        userId
      );
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json(
      { error: "Failed to delete booking" },
      { status: 500 }
    );
  }
}
