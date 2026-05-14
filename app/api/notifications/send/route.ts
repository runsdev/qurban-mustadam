import { NextResponse } from 'next/server';
import { sendStatusNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const { animalId, oldStatus, newStatus } = await request.json();

    if (!animalId || !newStatus) {
      return NextResponse.json(
        { error: 'Animal ID and new status are required' },
        { status: 400 }
      );
    }

    const result = await sendStatusNotification({
      animalId,
      oldStatus,
      newStatus,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Animal not found') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === 'VAPID keys not configured') {
      return NextResponse.json({ error: message }, { status: 500 });
    }

    console.error('Error sending status notification:', error);
    return NextResponse.json(
      { error: 'Failed to send status notification' },
      { status: 500 }
    );
  }
}
