export interface Env {
  SUBS: KVNamespace;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  ALLOWED_ORIGINS: string;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export interface SubscriptionRecord {
  subscription: PushSubscriptionJSON;
  time: string; // "HH:MM" 24-hour format
  timeZone: string; // IANA timezone string e.g. "America/New_York"
  lastSentDate: string | null; // "YYYY-MM-DD" in local timezone
  createdAt: number; // Unix timestamp ms
}

export interface SubscribeRequestBody {
  subscription: PushSubscriptionJSON;
  time: string;
  timeZone: string;
}

export interface UnsubscribeRequestBody {
  endpoint: string;
}

export interface TestRequestBody {
  endpoint: string;
}
