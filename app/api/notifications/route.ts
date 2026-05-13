import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { getPushSubscriptionsByToken } from '@/lib/sheets';

// VAPID keys from environment variables
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  privateKey: process.env.VAPID_PRIVATE_KEY ?? ''
};

// Set VAPID details only if keys are available
if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:admin@qurbantek.vercel.app',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

export async function POST(request: Request) {
  try {
    const { token, title, body } = await request.json();

    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Check if VAPID keys are configured
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      return NextResponse.json(
        { error: 'VAPID keys not configured' },
        { status: 500 }
      );
    }

    // Get subscriptions for this specific token (animal ID)
    const subscriptions = await getPushSubscriptionsByToken(token);

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No subscriptions found for this token' },
        { status: 404 }
      );
    }

    // Send notification to all subscriptions for this token
    const payload = JSON.stringify({
      title: title || 'Notifikasi Qurban Tek',
      body: body || 'Anda memiliki notifikasi baru.',
      icon: '/logo192.png', // You may want to add a logo
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

    await Promise.all(promises);

    return NextResponse.json({ 
      success: true, 
      message: `Notification sent to ${subscriptions.length} subscriber(s)` 
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}