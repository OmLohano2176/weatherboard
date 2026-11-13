import { getItem, setItem } from './storage';

export const REMINDER_STORAGE_KEY = 'weatherboard:reminder';

export interface StoredReminderSettings {
  enabled: boolean;
  time: string; // "HH:MM" e.g. "07:30"
}

export type PushSupportStatus = 'supported' | 'unsupported' | 'ios-needs-install';

export type PushErrorCode =
  | 'OFFLINE'
  | 'UNREACHABLE'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export class PushError extends Error {
  readonly code: PushErrorCode;
  readonly status?: number;

  constructor(message: string, code: PushErrorCode, status?: number) {
    super(message);
    this.name = 'PushError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Checks browser and OS push notification support.
 * On iOS, Web Push is only supported when the PWA is added to the Home Screen.
 */
export function checkPushSupport(): PushSupportStatus {
  if (typeof window === 'undefined') return 'unsupported';

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  const hasNativePush =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  if (hasNativePush) {
    return 'supported';
  }

  if (isIOS && !isStandalone) {
    return 'ios-needs-install';
  }

  return 'unsupported';
}

export function isPushSupported(): boolean {
  return checkPushSupport() === 'supported';
}

/**
 * Converts a base64url string to a Uint8Array for applicationServerKey.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getStoredReminder(): StoredReminderSettings {
  try {
    const raw = getItem(REMINDER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          enabled: Boolean(parsed.enabled),
          time: typeof parsed.time === 'string' ? parsed.time : '07:30',
        };
      }
    }
  } catch {
    // Fall back to default
  }
  return { enabled: false, time: '07:30' };
}

export function saveStoredReminder(settings: StoredReminderSettings): void {
  try {
    setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Graceful fallback in memory
  }
}

function getWorkerUrl(): string {
  const url = import.meta.env.VITE_PUSH_API_URL;
  if (!url || url.trim() === '') {
    return window.location.origin;
  }
  return url.replace(/\/+$/, '');
}

async function requestWorker<T = unknown>(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new PushError(
      'You are offline. Connect to the internet to update reminders.',
      'OFFLINE'
    );
  }

  const workerBase = getWorkerUrl();
  const url = `${workerBase}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new PushError(
        'You are offline. Connect to the internet to update reminders.',
        'OFFLINE'
      );
    }
    throw new PushError(
      'Push notification server is currently unreachable. Please try again.',
      'UNREACHABLE'
    );
  }

  if (response.status === 429) {
    throw new PushError(
      'Too many requests. Please wait a minute and try again.',
      'RATE_LIMITED',
      429
    );
  }

  if (response.status >= 500) {
    throw new PushError(
      'Push notification service encountered an error. Please try again.',
      'UNREACHABLE',
      response.status
    );
  }

  let json: { error?: string } = {};
  try {
    json = await response.json();
  } catch {
    // If not json
  }

  if (response.status === 400 || !response.ok) {
    throw new PushError(
      json.error || `Server rejected the request (HTTP ${response.status}).`,
      'VALIDATION_ERROR',
      response.status
    );
  }

  return json as T;
}

/**
 * Subscribes to Web Push in the browser and sends the subscription to the Worker.
 * If the Worker call fails, rolls back the browser subscription so state remains clean.
 */
export async function subscribeToPush(
  time: string,
  timeZone: string
): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new PushError('Push notifications are not supported in this browser.', 'UNKNOWN');
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey || vapidKey.trim() === '' || vapidKey.trim() === 'your_vapid_public_key_here') {
    throw new PushError(
      'VAPID public key is not configured in .env (VITE_VAPID_PUBLIC_KEY).',
      'VALIDATION_ERROR'
    );
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription: PushSubscription;

  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey.trim()),
    });
  } catch (err) {
    throw new PushError(
      (err as Error)?.message || 'Failed to create browser push subscription.',
      'UNKNOWN'
    );
  }

  // Register subscription with the Cloudflare Worker
  try {
    await requestWorker('/api/subscribe', 'POST', {
      subscription: subscription.toJSON(),
      time,
      timeZone,
    });
  } catch (workerErr) {
    // Roll back browser subscription on worker failure to prevent inconsistent state
    try {
      await subscription.unsubscribe();
    } catch {
      // Ignore unsubscribe rollback error
    }
    throw workerErr;
  }

  saveStoredReminder({ enabled: true, time });
  return subscription;
}

/**
 * Updates the scheduled reminder time with the Worker.
 */
export async function updateReminderTime(
  time: string,
  timeZone: string
): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    // If not subscribed yet, subscribe fresh
    await subscribeToPush(time, timeZone);
    return;
  }

  await requestWorker('/api/subscribe', 'POST', {
    subscription: subscription.toJSON(),
    time,
    timeZone,
  });

  saveStoredReminder({ enabled: true, time });
}

/**
 * Unsubscribes from push notifications on the Worker and in the browser.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        try {
          await requestWorker('/api/unsubscribe', 'POST', {
            endpoint: subscription.endpoint,
          });
        } catch {
          // If network call fails while offline, still unsubscribe locally
        }

        await subscription.unsubscribe();
      }
    } catch (err) {
      console.error('Error during push unsubscription:', err);
    }
  }

  const current = getStoredReminder();
  saveStoredReminder({ enabled: false, time: current.time });
}

/**
 * Sends an immediate test push to verify notifications.
 */
export async function sendTestPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    throw new PushError(
      'No active push subscription found. Enable reminders first.',
      'VALIDATION_ERROR'
    );
  }

  await requestWorker('/api/test', 'POST', {
    endpoint: subscription.endpoint,
  });
}
