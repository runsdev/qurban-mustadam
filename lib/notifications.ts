import webpush from "web-push";
import { fetchAnimalById, getPushSubscriptionsByToken } from "@/lib/sheets";

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  subject: process.env.VAPID_SUBJECT ?? "mailto:admin@qurbantek.vercel.app",
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    vapidKeys.subject,
    vapidKeys.publicKey,
    vapidKeys.privateKey,
  );
}

const statusLabels: Record<string, string> = {
  "Hewan Tiba": "telah tiba di lokasi",
  Penyembelihan: "sedang dalam proses penyembelihan",
  Pengulitan: "sedang dalam proses pengulitan",
  "Pemisahan daging & tulang": "sedang dalam proses pemisahan daging dan tulang",
  "Pemotongan daging": "sedang dalam proses pemotongan daging",
  Distribusi: "sedang dalam proses distribusi",
  Selesai: "telah selesai",
};

export type SendStatusNotificationInput = {
  animalId: string;
  oldStatus?: string;
  newStatus: string;
};

export type SendStatusNotificationResult = {
  success: boolean;
  message: string;
  failed: number;
  sent: number;
  targeted: number;
};

function normalizeAnimalId(value: string) {
  return value.trim().replace(/^#/, "");
}

export async function sendStatusNotification({
  animalId,
  oldStatus,
  newStatus,
}: SendStatusNotificationInput): Promise<SendStatusNotificationResult> {
  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    throw new Error("VAPID keys not configured");
  }

  const normalizedAnimalId = normalizeAnimalId(animalId);

  const animal = await fetchAnimalById(normalizedAnimalId);
  if (!animal) {
    throw new Error("Animal not found");
  }

  const subscriptions = await getPushSubscriptionsByToken(normalizedAnimalId);
  const uniqueSubscriptions = Array.from(
    new Map(subscriptions.map((sub) => [sub.endpoint, sub])).values(),
  );

  if (uniqueSubscriptions.length === 0) {
    return {
      success: true,
      message: "No subscriptions found for this animal",
      failed: 0,
      sent: 0,
      targeted: 0,
    };
  }

  const statusLabel = statusLabels[newStatus] || newStatus;
  let body = `Hewan ${animal.name} (ID: ${animal.id}) ${statusLabel}.`;

  if (oldStatus && oldStatus !== newStatus) {
    body = `Update status hewan ${animal.name} (ID: ${animal.id}): dari ${statusLabels[oldStatus] || oldStatus} menjadi ${statusLabel}.`;
  }

  const payload = JSON.stringify({
    title: `Update Status Hewan ${animal.name}`,
    body,
    icon: animal.imageUrl || "/logo192.png",
    data: {
      url: `/hewan/${animal.id}`,
      animalId: animal.id,
    },
  });

  const results = await Promise.allSettled(
    uniqueSubscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload,
      ),
    ),
  );

  const successful = results.filter((result) => result.status === "fulfilled").length;
  return {
    success: true,
    message: `Notification sent to ${successful} subscriber(s)`,
    failed: results.length - successful,
    sent: successful,
    targeted: uniqueSubscriptions.length,
  };
}
