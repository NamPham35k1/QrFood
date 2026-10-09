import { EventEmitter } from 'events';

// Global singleton event emitter for Node process
declare global {
  // eslint-disable-next-line no-var
  var __qrfood_event_bus__: EventEmitter | undefined;
}

const eventBus: EventEmitter = global.__qrfood_event_bus__ || new EventEmitter();
eventBus.setMaxListeners(100);
if (process.env.NODE_ENV !== 'production') {
  global.__qrfood_event_bus__ = eventBus;
}

export interface RealtimeEventPayload {
  type: string;
  channel: string;
  timestamp: string;
  data: unknown;
}

export function publishRealtimeEvent(channel: string, type: string, data: unknown) {
  const payload: RealtimeEventPayload = {
    type,
    channel,
    timestamp: new Date().toISOString(),
    data,
  };
  eventBus.emit(channel, payload);
  // Also emit to universal wildcard channel if it's a restaurant event
  if (channel.startsWith('restaurant:')) {
    const parts = channel.split(':');
    const restaurantId = parts[1];
    if (parts[2] !== 'all') {
      eventBus.emit(`restaurant:${restaurantId}:all`, payload);
    }
  }
}

export function subscribeToRealtime(channel: string, callback: (event: RealtimeEventPayload) => void) {
  eventBus.on(channel, callback);
  return () => {
    eventBus.off(channel, callback);
  };
}
