import { NextRequest } from 'next/server';
import { subscribeToRealtime, RealtimeEventPayload } from '@/lib/realtime';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channelsParam = searchParams.get('channels') || '';
  const channels = channelsParam.split(',').map((c) => c.trim()).filter(Boolean);

  if (channels.length === 0) {
    return new Response('No channels provided', { status: 400 });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connected event
  writer.write(encoder.encode(`event: connected\ndata: ${JSON.stringify({ channels, time: Date.now() })}\n\n`));

  const unsubs: (() => void)[] = [];

  for (const ch of channels) {
    const unsub = subscribeToRealtime(ch, (event: RealtimeEventPayload) => {
      try {
        const payloadStr = JSON.stringify(event);
        writer.write(encoder.encode(`event: message\ndata: ${payloadStr}\n\n`));
      } catch {
        // Stream closed
      }
    });
    unsubs.push(unsub);
  }

  // Periodic heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      writer.write(encoder.encode(`: ping\n\n`));
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeat);
    for (const unsub of unsubs) {
      unsub();
    }
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
