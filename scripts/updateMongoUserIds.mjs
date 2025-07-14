// scripts/updateMongoUserIds.mjs
import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

async function updateUserIds() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!uri || !dbName) {
    console.error("Missing MONGODB_URI or MONGODB_DB_NAME in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const bookings = await db.collection("bookings").find({}).toArray();

    let updatedCount = 0;

    for (const booking of bookings) {
      if (booking.userId && booking.userId.includes(".")) {
        try {
          const decodedToken = JSON.parse(
            Buffer.from(booking.userId.split(".")[1], "base64").toString()
          );

          const stableUserId = Number(decodedToken.id);

          await db
            .collection("bookings")
            .updateOne(
              { _id: booking._id },
              { $set: { userId: stableUserId } }
            );

          console.log(
            `✔ Updated booking ${booking._id} → userId: ${stableUserId}`
          );
          updatedCount++;
        } catch (err) {
          console.error(
            `✖ Failed to decode userId for booking ${booking._id}:`,
            err.message
          );
        }
      }
    }

    console.log(`✅ Finished. Updated ${updatedCount} booking(s).`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

updateUserIds();
