import { NextResponse } from 'next/server';
import webpush from 'web-push';

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

// In-memory store for subscriptions (in production, use a database)
let subscriptions: any[] = [];

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    const subscription = await request.json();

    // Store subscription
    subscriptions.push({ token, subscription });
    console.log('Subscription stored:', { token, subscription });

    // Send a test notification
    const payload = JSON.stringify({
      title: 'Notifikasi Qurban Tek',
      body: 'Ini adalah notifikasi tes dari sistem Qurban Tek.',
      icon: '/logo192.png', // You may want to add a logo
    });

    // Send to all subscriptions (in production, you'd filter by token/user)
    const promises = subscriptions.map(({ subscription }) => 
      webpush.sendNotification(subscription, payload)
    );

    await Promise.all(promises);

    return NextResponse.json({ 
      success: true, 
      message: 'Notification sent to all subscribers' 
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}