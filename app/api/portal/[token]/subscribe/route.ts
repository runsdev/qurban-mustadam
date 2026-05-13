import { NextResponse } from 'next/server';
import { storePushSubscription } from '@/lib/sheets';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    const subscription = await request.json();

    // Store subscription in Google Sheets
    await storePushSubscription({
      timestamp: new Date().toISOString(),
      token: token || '',
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh || '',
      auth: subscription.keys?.auth || '',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}