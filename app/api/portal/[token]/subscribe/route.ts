import { NextResponse } from "next/server";
import { storePushSubscription } from "@/lib/sheets";

interface SubscriptionPayload {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const subscription = (await request.json()) as SubscriptionPayload;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (
      !subscription.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return NextResponse.json(
        { error: "Invalid subscription payload" },
        { status: 400 },
      );
    }

    await storePushSubscription({
      timestamp: new Date().toISOString(),
      token,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[api/portal/${token}/subscribe] Error saving subscription:`, error);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 },
    );
  }
}
