import { NextResponse } from "next/server";
import { sendStatusNotification } from "@/lib/notifications";

function getProvidedSecret(request: Request): string {
  const headerSecret = request.headers.get("x-webhook-secret") ?? "";
  const authHeader = request.headers.get("authorization") ?? "";

  if (headerSecret) return headerSecret;
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
}

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET ?? "";
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "GOOGLE_SHEETS_WEBHOOK_SECRET is not configured" },
        { status: 500 },
      );
    }

    const providedSecret = getProvidedSecret(request);
    if (!providedSecret || providedSecret !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
    }

    const { animalId, oldStatus, newStatus } = await request.json();
    if (!animalId || !newStatus) {
      return NextResponse.json(
        { error: "animalId and newStatus are required" },
        { status: 400 },
      );
    }

    const result = await sendStatusNotification({
      animalId,
      oldStatus,
      newStatus,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Animal not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "VAPID keys not configured") {
      return NextResponse.json({ error: message }, { status: 500 });
    }

    console.error("[api/notifications/webhook] Failed to process webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}
