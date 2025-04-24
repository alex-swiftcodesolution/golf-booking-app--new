import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface InviteEmailPayload {
  emailType?: "invite";
  to: string;
  name: string;
  referralCode: string;
  referralLink: string;
}

interface BookingEmailPayload {
  emailType: "booking";
  to: string;
  date: string;
  location: string;
  service: string;
  timeSlots: { time: string; bay: string }[];
  guests: { name: string; email: string }[];
  bookingIds: number[];
  freeGuestPassesPerMonth: number;
  guestPassesUsed: number;
  guestPassCharge: number;
}

type EmailPayload = InviteEmailPayload | BookingEmailPayload;

export async function POST(request: Request) {
  try {
    const payload: EmailPayload = await request.json();

    if (!payload.to) {
      return NextResponse.json(
        { error: "Missing required field: to" },
        { status: 400 }
      );
    }

    // Default to "invite" if emailType is undefined for backward compatibility
    if (!payload.emailType || payload.emailType === "invite") {
      const { name, referralCode, referralLink } =
        payload as InviteEmailPayload;
      if (!name || !referralCode || !referralLink) {
        return NextResponse.json(
          {
            error:
              "Missing required fields: name, referralCode, or referralLink",
          },
          { status: 400 }
        );
      }

      const { data, error } = await resend.emails.send({
        from: "Simcoquitos 24/7 Golf Club <onboarding@resend.dev>",
        to: [payload.to],
        subject:
          "You're Invited to Join a Tee Time at Simcoquitos 24/7 Golf Club!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333;">Hello, ${name}!</h1>
            <p style="font-size: 16px; color: #555;">
              You've been invited to join a tee time at <strong>Simcoquitos 24/7 Golf Club</strong>!
            </p>
            <p style="font-size: 16px; color: #555;">
              Use your unique referral code: <strong style="color: #333;">${referralCode}</strong>
            </p>
            <p style="font-size: 16px; color: #555;">
              Click the button below to sign up or log in and join the fun:
            </p>
            <a
              href="${referralLink}"
              style="
                display: inline-block;
                padding: 12px 24px;
                background-color: #000;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-size: 16px;
                margin: 10px 0;
              "
            >
              Join Tee Time
            </a>
            <p style="font-size: 14px; color: #777;">
              If the button doesn't work, copy and paste this link:
              <br />
              <a href="${referralLink}" style="color: #000;">${referralLink}</a>
            </p>
            <p style="font-size: 16px; color: #555;">
              We can't wait to see you on the course!
            </p>
            <p style="font-size: 14px; color: #777;">
              Best regards,<br />
              The Simcoquitos Team
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend error:", error);
        return NextResponse.json(
          { error: "Failed to send email", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: "Email sent successfully", data },
        { status: 200 }
      );
    } else if (payload.emailType === "booking") {
      const {
        date,
        location,
        service,
        timeSlots,
        guests,
        bookingIds,
        freeGuestPassesPerMonth,
        guestPassesUsed,
        guestPassCharge,
      } = payload as BookingEmailPayload;

      if (!date || !location || !service || !timeSlots || !bookingIds) {
        return NextResponse.json(
          {
            error:
              "Missing required fields: date, location, service, timeSlots, or bookingIds",
          },
          { status: 400 }
        );
      }

      const { data, error } = await resend.emails.send({
        from: "Simcoquitos 24/7 Golf Club <onboarding@resend.dev>",
        to: [payload.to],
        subject: "Your Tee Time Booking Confirmation",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333;">Booking Confirmation</h1>
            <p style="font-size: 16px; color: #555;">Dear Member,</p>
            <p style="font-size: 16px; color: #555;">
              Your tee time has been booked successfully at Simcoquitos 24/7 Golf Club!
            </p>
            <h2 style="color: #333;">Booking Details:</h2>
            <ul style="font-size: 16px; color: #555;">
              <li><strong>Date:</strong> ${date}</li>
              <li><strong>Location:</strong> ${location}</li>
              <li><strong>Service:</strong> ${service}</li>
              <li><strong>Time Slots:</strong>
                <ul>
                  ${timeSlots
                    .map((slot) => `<li>${slot.time} at ${slot.bay}</li>`)
                    .join("")}
                </ul>
              </li>
              <li><strong>Guests:</strong> ${
                guests?.length ? guests.map((g) => g.name).join(", ") : "None"
              }</li>
              <li><strong>Guest Pass Usage:</strong> ${
                guests?.length
                  ? `${Math.min(
                      guests.length,
                      Math.max(freeGuestPassesPerMonth - guestPassesUsed, 0)
                    )} free pass(es), ${Math.max(
                      guests.length -
                        Math.max(freeGuestPassesPerMonth - guestPassesUsed, 0),
                      0
                    )} charged at $${guestPassCharge} each`
                  : "N/A"
              }</li>
              <li><strong>Booking IDs:</strong> ${bookingIds.join(", ")}</li>
            </ul>
            <p style="font-size: 16px; color: #555;">Enjoy your game!</p>
            <p style="font-size: 14px; color: #777;">
              Simcoquitos 24/7 Golf Club
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend error:", error);
        return NextResponse.json(
          { error: "Failed to send email", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: "Email sent successfully", data },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: "Invalid emailType. Must be 'invite' or 'booking'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Send email error:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: String(error) },
      { status: 500 }
    );
  }
}
