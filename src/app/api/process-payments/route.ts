import type { NextApiRequest, NextApiResponse } from "next";
import { Client, Environment } from "square";

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment: Environment.Sandbox, // Switch to Production when live
});

type PaymentResponse = {
  success: boolean;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaymentResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { nonce, amount } = req.body as { nonce: string; amount: string };
  if (!nonce || !amount) {
    return res
      .status(400)
      .json({ success: false, error: "Missing nonce or amount" });
  }

  try {
    const amountCents = Math.round(parseFloat(amount.replace("$", "")) * 100);
    const payment = await client.paymentsApi.createPayment({
      sourceId: nonce,
      amountMoney: {
        amount: BigInt(amountCents),
        currency: "USD",
      },
      idempotencyKey: `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}`,
    });

    if (payment.result?.payment?.status === "COMPLETED") {
      res.status(200).json({ success: true });
    } else {
      throw new Error("Payment not completed");
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Payment processing failed",
    });
  }
}
