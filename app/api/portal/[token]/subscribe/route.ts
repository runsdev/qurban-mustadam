import { NextResponse } from 'next/server';

// In-memory store for subscriptions (in production, use a database)
let subscriptions: any[] = [];

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    const subscription = await request.json();

    // In a real application, you would:
    // 1. Verify the token (if needed for authentication)
    // 2. Store the subscription in a database associated with the token/user
    // 3. Send a push notification to test if desired

    // For now, we'll just store it in memory and log
    subscriptions.push({ token, subscription });
    console.log('Subscription stored:', { token, subscription });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}