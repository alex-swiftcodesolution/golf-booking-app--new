// scripts/updateMongoUserIds.ts
import { getDb } from "@/lib/mongodb";

async function updateUserIds() {
  try {
    console.log("Starting MongoDB userId update script...");
    const db = await getDb();
    console.log("Connected to MongoDB");

    const bookings = await db.collection("bookings").find({}).toArray();
    console.log(`Found ${bookings.length} bookings to process`);

    let updatedCount = 0;
    for (const booking of bookings) {
      if (
        booking.userId &&
        typeof booking.userId === "string" &&
        booking.userId.includes(".")
      ) {
        try {
          // Decode JWT token
          const decodedToken = JSON.parse(
            Buffer.from(booking.userId.split(".")[1], "base64").toString()
          );
          const stableUserId = Number(decodedToken.id);
          if (!stableUserId) {
            console.warn(
              `Invalid userId for booking ${booking._id}: no id in JWT payload`
            );
            continue;
          }

          // Update the booking with the stable userId
          const result = await db
            .collection("bookings")
            .updateOne(
              { _id: booking._id },
              { $set: { userId: stableUserId } }
            );

          if (result.modifiedCount > 0) {
            updatedCount++;
            console.log(
              `Updated booking ${booking._id} with userId ${stableUserId}`
            );
          } else {
            console.log(`No changes made to booking ${booking._id}`);
          }
        } catch (error) {
          console.error(
            `Failed to decode userId for booking ${booking._id}:`,
            error
          );
        }
      } else {
        console.log(
          `Skipping booking ${booking._id}: userId is not a JWT token`
        );
      }
    }

    console.log(`Script completed: Updated ${updatedCount} bookings`);
  } catch (error) {
    console.error("Error running update script:", error);
    throw error;
  }
}

// Run the script
updateUserIds()
  .then(() => {
    console.log("MongoDB update script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("MongoDB update script failed:", error);
    process.exit(1);
  });
