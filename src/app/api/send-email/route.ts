import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Configure Nodemailer transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.sendgrid.net",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER || "apikey",
    pass: process.env.EMAIL_PASS || "your-sendgrid-api-key",
  },
});

export async function POST(request: Request) {
  try {
    const { to, name, referralCode, referralLink } = await request.json();

    // Validate input
    if (!to || !name || !referralCode || !referralLink) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: to, name, referralCode, or referralLink",
        },
        { status: 400 }
      );
    }

    // Email content
    const mailOptions = {
      from: `"Simcoquitos 24/7 Golf Club" <no-reply@test-swiftcode.sendgrid.net>`,
      to,
      subject: `You're Invited to Join Simcoquitos 24/7 Golf Club!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Hello, ${name}!</h1>
          <p style="font-size: 16px; color: #555;">
            You've been invited to join <strong>Simcoquitos 24/7 Golf Club</strong> by a friend!
          </p>
          <p style="font-size: 16px; color: #555;">
            Use your unique referral code: <strong style="color: #007bff;">${referralCode}</strong>
          </p>
          <p style="font-size: 16px; color: #555;">
            Click the button below to sign up and start your journey with us:
          </p>
          <a
            href="${referralLink}"
            style="
              display: inline-block;
              padding: 12px 24px;
              background-color: #007bff;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-size: 16px;
              margin: 10px 0;
            "
          >
            Join Now
          </a>
          <p style="font-size: 14px; color: #777;">
            If the button doesn't work, copy and paste this link into your browser:
            <br />
            <a href="${referralLink}" style="color: #007bff;">${referralLink}</a>
          </p>
          <p style="font-size: 16px; color: #555;">
            We can't wait to see you at the club!
          </p>
          <p style="font-size: 14px; color: #777;">
            Best regards,<br />
            The Simcoquitos Team
          </p>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "Email sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send email error:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: String(error) },
      { status: 500 }
    );
  }
}
