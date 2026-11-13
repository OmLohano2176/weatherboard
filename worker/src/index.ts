/**
 * WeatherBoard Cloudflare Worker - Daily Web Push Reminders
 *
 * DESIGN DECISIONS FOR CLOUDFLARE WORKERS FREE PLAN:
 * 1. 10 ms CPU Limit:
 *    - Payload-less Web Push: Avoids heavy AES-GCM / ECE content encryption on the Worker.
 *    - VAPID JWT Caching: Signed ES256 JWTs are cached per push-service origin (audience)
 *      across each execution. In a run with 40 pushes to Google FCM, only 1 cryptographic
 *      signature is computed instead of 40, keeping CPU time under ~2-3 ms.
 * 2. 50 Subrequests Limit:
 *    - Cron runs are capped at a maximum of 40 push notifications per 5-minute execution,
 *      processed in throttled concurrent pools of at most 6 requests, ensuring subrequests
 *      safely stay below the 50 subrequest limit.
 * 3. 1,000 KV Writes/Day Limit:
 *    - KV updates only occur once per subscription per day (when updating lastSentDate upon
 *      successful push delivery). Unchanged or retried records generate zero writes.
 * 4. SSRF & Security:
 *    - Strict domain whitelist on push endpoints prevents Server-Side Request Forgery.
 *    - Request bodies are hard-limited to 4 KB.
 */

import {
  Env,
  SubscriptionRecord,
  SubscribeRequestBody,
  UnsubscribeRequestBody,
  TestRequestBody,
} from './types';
import { sendPush } from './vapid';

const MAX_BODY_BYTES = 4096; // 4 KB
const MAX_CONCURRENT_PUSHES = 6;
const MAX_PUSHES_PER_RUN = 40;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const ALLOWED_PUSH_DOMAINS = [
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
];

/**
 * Validates push service endpoint against SSRF and provider whitelist.
 */
function validatePushEndpoint(endpointStr: string): { valid: boolean; reason?: string } {
  let url: URL;
  try {
    url = new URL(endpointStr);
  } catch {
    return { valid: false, reason: 'Invalid endpoint: must be a well-formed URL.' };
  }

  if (url.protocol !== 'https:') {
    return { valid: false, reason: 'Invalid endpoint: protocol must be https:.' };
  }

  const hostname = url.hostname.toLowerCase();
  const isAllowed = ALLOWED_PUSH_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith('.' + domain)
  );

  if (!isAllowed) {
    return {
      valid: false,
      reason: `Push endpoint '${hostname}' is not permitted. Hostname must equal or end with one of: ${ALLOWED_PUSH_DOMAINS.join(
        ', '
      )}.`,
    };
  }

  return { valid: true };
}

/**
 * Computes SHA-256 hex digest of the endpoint to use as KV key.
 */
async function getEndpointKey(endpoint: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(endpoint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sub:' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Resolves CORS headers according to ALLOWED_ORIGINS configuration.
 */
function getCorsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && (allowed.includes('*') || allowed.includes(origin))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function jsonResponse(
  data: unknown,
  status = 200,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Computes local date (YYYY-MM-DD) and minutes since midnight in specified timeZone.
 */
function getLocalTimeInfo(
  date: Date,
  timeZone: string
): { localDate: string; nowMinutes: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  let year = '';
  let month = '';
  let day = '';
  let hour = '0';
  let minute = '0';

  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'day') day = part.value;
    else if (part.type === 'hour') hour = part.value;
    else if (part.type === 'minute') minute = part.value;
  }

  const h = parseInt(hour, 10) % 24;
  const m = parseInt(minute, 10);
  const nowMinutes = h * 60 + m;
  const localDate = `${year}-${month}-${day}`;

  return { localDate, nowMinutes };
}

/**
 * HTTP Router for fetch requests
 */
async function handleFetch(req: Request, env: Env): Promise<Response> {
  const corsHeaders = getCorsHeaders(req, env);
  const url = new URL(req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // GET /api/health
  if (url.pathname === '/api/health' && req.method === 'GET') {
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  // Limit request body size to 4 KB
  if (req.method === 'POST') {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return jsonResponse(
        { error: 'Payload Too Large: request body must not exceed 4 KB.' },
        413,
        corsHeaders
      );
    }
  }

  // POST /api/subscribe
  if (url.pathname === '/api/subscribe' && req.method === 'POST') {
    let bodyText: string;
    try {
      bodyText = await req.text();
    } catch {
      return jsonResponse({ error: 'Failed to read request body.' }, 400, corsHeaders);
    }

    if (bodyText.length > MAX_BODY_BYTES) {
      return jsonResponse(
        { error: 'Payload Too Large: request body must not exceed 4 KB.' },
        413,
        corsHeaders
      );
    }

    let payload: SubscribeRequestBody;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload.' }, 400, corsHeaders);
    }

    const { subscription, time, timeZone } = payload;

    if (!subscription || typeof subscription.endpoint !== 'string') {
      return jsonResponse(
        { error: 'Missing or invalid subscription.endpoint.' },
        400,
        corsHeaders
      );
    }

    const endpointCheck = validatePushEndpoint(subscription.endpoint);
    if (!endpointCheck.valid) {
      return jsonResponse({ error: endpointCheck.reason }, 400, corsHeaders);
    }

    if (!time || typeof time !== 'string' || !TIME_REGEX.test(time)) {
      return jsonResponse(
        { error: 'Invalid time: must be in 24-hour HH:MM format (e.g. 08:30).' },
        400,
        corsHeaders
      );
    }

    if (!timeZone || typeof timeZone !== 'string') {
      return jsonResponse({ error: 'Missing timeZone string.' }, 400, corsHeaders);
    }

    try {
      new Intl.DateTimeFormat(undefined, { timeZone });
    } catch {
      return jsonResponse(
        { error: `Invalid IANA timeZone string: '${timeZone}'.` },
        400,
        corsHeaders
      );
    }

    const key = await getEndpointKey(subscription.endpoint);
    const existingRaw = await env.SUBS.get(key);
    let existingRecord: SubscriptionRecord | null = null;
    if (existingRaw) {
      try {
        existingRecord = JSON.parse(existingRaw);
      } catch {
        existingRecord = null;
      }
    }

    const record: SubscriptionRecord = {
      subscription,
      time,
      timeZone,
      lastSentDate: existingRecord ? existingRecord.lastSentDate : null,
      createdAt: existingRecord ? existingRecord.createdAt : Date.now(),
    };

    await env.SUBS.put(key, JSON.stringify(record));
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  // POST /api/unsubscribe
  if (url.pathname === '/api/unsubscribe' && req.method === 'POST') {
    let bodyText: string;
    try {
      bodyText = await req.text();
    } catch {
      return jsonResponse({ error: 'Failed to read request body.' }, 400, corsHeaders);
    }

    let payload: UnsubscribeRequestBody;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload.' }, 400, corsHeaders);
    }

    if (!payload.endpoint || typeof payload.endpoint !== 'string') {
      return jsonResponse({ error: 'Missing endpoint in request body.' }, 400, corsHeaders);
    }

    const key = await getEndpointKey(payload.endpoint);
    await env.SUBS.delete(key);
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  // POST /api/test
  if (url.pathname === '/api/test' && req.method === 'POST') {
    let bodyText: string;
    try {
      bodyText = await req.text();
    } catch {
      return jsonResponse({ error: 'Failed to read request body.' }, 400, corsHeaders);
    }

    let payload: TestRequestBody;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload.' }, 400, corsHeaders);
    }

    if (!payload.endpoint || typeof payload.endpoint !== 'string') {
      return jsonResponse({ error: 'Missing endpoint in request body.' }, 400, corsHeaders);
    }

    const endpointCheck = validatePushEndpoint(payload.endpoint);
    if (!endpointCheck.valid) {
      return jsonResponse({ error: endpointCheck.reason }, 400, corsHeaders);
    }

    const endpointKey = await getEndpointKey(payload.endpoint);
    const rateLimitKey = `ratelimit:test:${endpointKey}`;

    // Rate limit: 1 test push per endpoint per minute
    const isRateLimited = await env.SUBS.get(rateLimitKey);
    if (isRateLimited) {
      return jsonResponse(
        { error: 'Rate limit exceeded: only 1 test push per minute allowed for this endpoint.' },
        429,
        corsHeaders
      );
    }

    // Check stored subscription
    const recordRaw = await env.SUBS.get(endpointKey);
    if (!recordRaw) {
      return jsonResponse(
        { error: 'Subscription not found. Please subscribe first.' },
        404,
        corsHeaders
      );
    }

    let record: SubscriptionRecord;
    try {
      record = JSON.parse(recordRaw);
    } catch {
      return jsonResponse({ error: 'Corrupt subscription record in store.' }, 500, corsHeaders);
    }

    // Set rate limit key with 60s TTL
    await env.SUBS.put(rateLimitKey, '1', { expirationTtl: 60 });

    try {
      const pushRes = await sendPush(record.subscription.endpoint, env);
      return jsonResponse(
        { ok: pushRes.ok, status: pushRes.status, statusText: pushRes.statusText },
        pushRes.ok ? 200 : 502,
        corsHeaders
      );
    } catch (err: unknown) {
      return jsonResponse(
        { error: (err as Error)?.message || 'Failed to send test push notification.' },
        500,
        corsHeaders
      );
    }
  }

  return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
}

/**
 * Scheduled cron handler (executes every 5 minutes: triggers = ["*\/5 * * * *"])
 */
async function handleScheduled(_event: ScheduledEvent, env: Env): Promise<void> {
  const now = new Date();
  const vapidCache = new Map<string, string>(); // Per-origin VAPID JWT cache for this run

  // List subscriptions with prefix "sub:"
  let cursor: string | undefined = undefined;
  const subscriptionKeys: string[] = [];

  do {
    const listResult: KVNamespaceListResult<unknown> = await env.SUBS.list({
      prefix: 'sub:',
      cursor,
      limit: 100,
    });

    for (const key of listResult.keys) {
      subscriptionKeys.push(key.name);
    }

    cursor = listResult.list_complete ? undefined : listResult.cursor;
  } while (cursor && subscriptionKeys.length < 500);

  interface DueItem {
    key: string;
    record: SubscriptionRecord;
    localDate: string;
  }

  const dueItems: DueItem[] = [];

  // Evaluate due subscriptions
  for (const key of subscriptionKeys) {
    if (dueItems.length >= MAX_PUSHES_PER_RUN) {
      break;
    }

    const raw = await env.SUBS.get(key);
    if (!raw) continue;

    let record: SubscriptionRecord;
    try {
      record = JSON.parse(raw);
    } catch {
      continue;
    }

    if (!record.time || !record.timeZone || !record.subscription?.endpoint) {
      continue;
    }

    try {
      const { localDate, nowMinutes } = getLocalTimeInfo(now, record.timeZone);
      const [chosenHour, chosenMinute] = record.time.split(':').map(Number);
      const chosenMinutes = chosenHour * 60 + chosenMinute;

      const diff = nowMinutes - chosenMinutes;
      // Due when not yet sent today AND inside the 10-minute active window
      const isDue = record.lastSentDate !== localDate && diff >= 0 && diff < 10;

      if (isDue) {
        dueItems.push({ key, record, localDate });
      }
    } catch {
      // Ignore timezone evaluation failures for corrupted entries
    }
  }

  // Concurrency pool processing (max 6 concurrent sends, Promise.allSettled)
  const executing = new Set<Promise<void>>();

  for (const item of dueItems) {
    const task = (async () => {
      try {
        const response = await sendPush(item.record.subscription.endpoint, env, vapidCache);

        // 404 Not Found or 410 Gone indicates expired / unsubscribed push subscription
        if (response.status === 404 || response.status === 410) {
          await env.SUBS.delete(item.key);
          return;
        }

        // 2xx response: mark as sent today (single KV write per subscription per day)
        if (response.ok) {
          item.record.lastSentDate = item.localDate;
          await env.SUBS.put(item.key, JSON.stringify(item.record));
          return;
        }

        // On 429 or 5xx, leave record intact so it can retry on the next 5-min tick inside the window
      } catch (err) {
        // Individual failure must never stop other sends
        console.error(`Push failure for ${item.key}:`, err);
      }
    })();

    executing.add(task);
    const cleanup = () => executing.delete(task);
    task.then(cleanup, cleanup);

    if (executing.size >= MAX_CONCURRENT_PUSHES) {
      await Promise.race(executing);
    }
  }

  await Promise.allSettled(Array.from(executing));
}

export default {
  fetch: handleFetch,
  scheduled: handleScheduled,
};
