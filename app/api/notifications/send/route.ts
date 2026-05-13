import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { fetchAnimalById } from '@/lib/sheets';
import { getPushSubscriptionsByToken } from '@/lib/sheets';

// VAPID keys from environment variables
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

// Set VAPID details
webpush.setVapidDetails(
  'mailto:admin@qurbantek.vercel.app',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export async function POST(request: Request) {
  try {
    const { animalId, oldStatus, newStatus } = await request.json();

    // Validate required fields
    if (!animalId || !newStatus) {
      return NextResponse.json(
        { error: 'Animal ID and new status are required' },
        { status: 400 }
      );
    }

    // Fetch the animal to get current data
    const animal = await fetchAnimalById(animalId);
    if (!animal) {
      return NextResponse.json(
        { error: 'Animal not found' },
        { status: 404 }
      );
    }

    // Get subscriptions for this specific animal (using animal ID as token)
    const subscriptions = await getPushSubscriptionsByToken(animalId);

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No subscriptions found for this animal', success: true }
      );
    }

    // Create notification message based on status change
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

    // Send notification to all subscriptions for this animal
    const payload = JSON.stringify({
      title: `Update Status Hewan ${animal.name}`,
      body: body,
      icon: animal.imageUrl || '/logo192.png',
    });

    const promises = subscriptions.map(({ subscription }) => 
      webpush.sendNotification(subscription, payload)
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    return NextResponse.json({ 
      success: true,
      message: `Notification sent to ${successful} subscriber(s)`,
      failed: failed
    });
  } catch (error) {
    console.error('Error sending status notification:', error);
    return NextResponse.json(
      { error: 'Failed to send status notification' },
      { status: 500 }
    );
  }
}