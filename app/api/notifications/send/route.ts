import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { fetchAnimalById, getPushSubscriptionsByToken } from '@/lib/sheets';

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  privateKey: process.env.VAPID_PRIVATE_KEY ?? ''
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:admin@qurbantek.vercel.app',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

export async function POST(request: Request) {
  try {
    const { animalId, oldStatus, newStatus } = await request.json();

    if (!animalId || !newStatus) {
      return NextResponse.json(
        { error: 'Animal ID and new status are required' },
        { status: 400 }
      );
    }

    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      return NextResponse.json(
        { error: 'VAPID keys not configured' },
        { status: 500 }
      );
    }

    const animal = await fetchAnimalById(animalId);
    if (!animal) {
      return NextResponse.json(
        { error: 'Animal not found' },
        { status: 404 }
      );
    }

    const subscriptions = await getPushSubscriptionsByToken(animalId);
    if (subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found for this animal', success: true });
    }

    const statusLabels: Record<string, string> = {
      Persiapan: 'dalam persiapan',
      Disembelih: 'telah disembelih',
      Pengolahan: 'sedang dalam proses pengolahan',
      Distribusi: 'sedang dalam proses distribusi',
      Selesai: 'telah selesai dan siap untuk distribusi'
    };

    const statusLabel = statusLabels[newStatus] || newStatus;
    let body = `Hewan ${animal.name} (ID: ${animal.id}) ${statusLabel}.`;

    if (oldStatus && oldStatus !== newStatus) {
      body = `Update status hewan ${animal.name} (ID: ${animal.id}): dari ${statusLabels[oldStatus] || oldStatus} menjadi ${statusLabel}.`;
    }

    const payload = JSON.stringify({
      title: `Update Status Hewan ${animal.name}`,
      body,
      icon: animal.imageUrl || '/logo192.png'
    });

    const promises = subscriptions.map(sub =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        payload
      )
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(result => result.status === 'fulfilled').length;

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${successful} subscriber(s)`,
      failed: results.length - successful
    });
  } catch (error) {
    console.error('Error sending status notification:', error);
    return NextResponse.json(
      { error: 'Failed to send status notification' },
      { status: 500 }
    );
  }
}
