import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { oldName, newName } = await request.json();
    const db = await getDb();
    const result = await db
      .collection("bookings")
      .updateMany({ servicename: oldName }, { $set: { servicename: newName } });
    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error renaming service:", error);
    return NextResponse.json(
      { error: "Failed to rename service" },
      { status: 500 }
    );
  }
}
