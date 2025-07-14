// import { NextResponse } from "next/server";
// import { getDb } from "@/lib/mongodb";

// export async function POST(request: Request) {
//   try {
//     const { userId } = await request.json();
//     const db = await getDb();
//     const bookings = await db.collection("bookings").find({ userId }).toArray();
//     return NextResponse.json({
//       bookings: bookings.map((b) => ({
//         id: b.bookingId,
//         date: b.date,
//         time: b.time,
//         location: b.location,
//         bay: b.bay,
//         servicename: b.servicename,
//         guests: [], // Guests are managed separately via fetchGuestData
//         guestPassUsage: { free: 0, charged: 0 }, // Simplified for this context
//         day: new Date(b.date).toLocaleDateString("en-US", { weekday: "long" }),
//         starttime: b.time,
//       })),
//     });
//   } catch (error) {
//     console.error("Error fetching bookings:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch bookings" },
//       { status: 500 }
//     );
//   }
// }

// import { NextResponse } from "next/server";
// import { getDb } from "@/lib/mongodb";

// export async function POST(request: Request) {
//   try {
//     const { userId } = await request.json();
//     const db = await getDb();
//     const bookings = await db.collection("bookings").find({ userId }).toArray();
//     return NextResponse.json({
//       bookings: bookings.map((b) => ({
//         id: b.bookingId,
//         date: b.date,
//         time: b.time,
//         location: b.location,
//         bay: b.bay,
//         servicename: b.servicename,
//         guests: b.guests || [], // Include guests
//         guestPassUsage: { free: 0, charged: 0 }, // Kept for compatibility
//         day: new Date(b.date).toLocaleDateString("en-US", { weekday: "long" }),
//         starttime: b.time,
//       })),
//     });
//   } catch (error) {
//     console.error("Error fetching bookings:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch bookings" },
//       { status: 500 }
//     );
//   }
// }

// import { NextResponse } from "next/server";
// import { getDb } from "@/lib/mongodb";

// export async function POST(request: Request) {
//   try {
//     const { userId } = await request.json();
//     const db = await getDb();
//     const bookings = await db.collection("bookings").find({ userId }).toArray();
//     return NextResponse.json({
//       bookings: bookings.map((b) => ({
//         id: b.bookingId,
//         date: b.date,
//         time: b.time,
//         location: b.location,
//         bay: b.bay,
//         servicename: b.servicename,
//         guests: b.guests || [],
//         guestPassUsage: b.guestPassUsage || { free: 0, charged: 0 },
//         day: b.day,
//         starttime: b.starttime,
//       })),
//     });
//   } catch (error) {
//     console.error("Error fetching bookings:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch bookings" },
//       { status: 500 }
//     );
//   }
// }

/*
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
        guests: b.guests || [],
        guestPassUsage: b.guestPassUsage || { free: 0, charged: 0 },
        day: b.day,
        starttime: b.starttime,
        referralCodes: b.referralCodes || [], // Include referral codes
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
*/

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    console.log("Fetching bookings for userId:", userId); // Debug log
    const db = await getDb();
    const bookings = await db
      .collection("bookings")
      .find({ userId: Number(userId) })
      .toArray();
    console.log("Found bookings:", bookings); // Debug log
    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: Number(b.bookingId), // Ensure id is a number
        date: b.date,
        time: b.time,
        location: b.location,
        bay: b.bay,
        servicename: b.servicename,
        guests: b.guests || [],
        guestPassUsage: b.guestPassUsage || { free: 0, charged: 0 },
        day: b.day,
        starttime: b.starttime,
        referralCodes: b.referralCodes || [],
        rid: Number(b.rid),
        bookingstart: b.bookingstart,
        bookingend: b.bookingend,
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
