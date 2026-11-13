# WeatherBoard Push Notification Worker

A lightweight Cloudflare Worker running on the **Cloudflare Workers Free Plan** that delivers daily Web Push reminders for WeatherBoard.

## Architecture & Free Tier Optimizations

- **10 ms CPU Limit**:
  - **Payload-less Web Push**: The notification payload (title, body, icon) is fetched and displayed client-side inside the Service Worker `push` event handler. This completely avoids costly AES-GCM / ECE payload encryption on the Worker.
  - **WebCrypto ECDSA Signing**: Built directly with standard `crypto.subtle` (no heavy Node polyfills).
  - **Per-Origin VAPID JWT Caching**: Within each cron run, signed JWTs are cached by push provider origin (e.g., `https://fcm.googleapis.com`). Regardless of how many pushes are sent, only 1 to 4 cryptographic signatures are performed per run, keeping CPU execution under 2–3 ms.
- **50 Subrequests Limit**:
  - Cron executions cap active push deliveries at 40 sends per run using a throttled concurrency pool of at most 6 concurrent subrequests (`Promise.allSettled`).
- **1,000 KV Writes/Day Limit**:
  - A subscription record is only updated in KV (`lastSentDate = localDate`) upon successful push delivery (1 write per subscriber per day). Corrupted, expired (404/410), or retried records generate zero unnecessary writes.
- **SSRF Protection**:
  - Push endpoints are validated against an allowlist of legitimate push notification gateways (`fcm.googleapis.com`, `push.services.mozilla.com`, `push.apple.com`, `notify.windows.com`).
  - Request bodies are hard-limited to 4 KB.

---

## Setup & Deployment Guide

### 1. Generate VAPID Keys

Generate an uncompressed P-256 VAPID key pair:

```bash
npx web-push generate-vapid-keys
```

This outputs:
- **Public Key**: ~87-character base64url string (used in `wrangler.toml` and client PWA).
- **Private Key**: ~43-character base64url raw 32-byte scalar `d` (kept secret).

---

### 2. Create the Cloudflare KV Namespace

Create production and preview KV namespaces:

```bash
# Production namespace
npx wrangler kv:namespace create SUBS

# Preview namespace (for local dev)
npx wrangler kv:namespace create SUBS --preview
```

Copy the generated namespace IDs into `worker/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SUBS"
id = "<YOUR_PRODUCTION_KV_ID>"
preview_id = "<YOUR_PREVIEW_KV_ID>"
```

---

### 3. Configure Environment Variables & Secrets

#### A. In `worker/wrangler.toml`:
Set your public variables:
```toml
[vars]
VAPID_PUBLIC_KEY = "<PASTE_YOUR_PUBLIC_KEY_HERE>"
VAPID_SUBJECT = "mailto:admin@weatherboard.app"
ALLOWED_ORIGINS = "http://localhost:4173,http://localhost:5173,https://your-weatherboard-domain.com"
```

#### B. Set the Secret in Cloudflare:
Never commit your private key to source control. Set it as an encrypted Cloudflare secret:

```bash
npx wrangler secret put VAPID_PRIVATE_KEY
```
When prompted, paste your base64url **Private Key**.

#### C. Local Development Secret:
For local development with `wrangler dev`, create a `.dev.vars` file (already added to `.gitignore`):

```bash
cp .dev.vars.example .dev.vars
```

Edit `worker/.dev.vars`:
```env
VAPID_PRIVATE_KEY=<PASTE_YOUR_PRIVATE_KEY_HERE>
```

---

### 4. Local Testing & Verification

1. **Start the local worker dev server:**
   ```bash
   cd worker
   npm run dev
   ```

2. **Verify the health endpoint:**
   ```bash
   curl http://localhost:8787/api/health
   # Returns: {"ok":true}
   ```

3. **Test the cron trigger locally:**
   Start Wrangler with scheduled event testing enabled:
   ```bash
   npx wrangler dev --test-scheduled
   ```
   In a separate terminal, trigger the cron execution:
   ```bash
   curl "http://localhost:8787/__scheduled"
   ```

---

### 5. Deploy to Production

Deploy the Worker to your Cloudflare account:

```bash
cd worker
npm run deploy
```

---

## HTTP Endpoints Reference

All endpoints return JSON and handle CORS preflight for origins listed in `ALLOWED_ORIGINS`.

### `GET /api/health`
Checks service health.
- **Response**: `200 OK` `{ "ok": true }`

### `POST /api/subscribe`
Registers or updates a push reminder subscription.
- **Headers**: `Content-Type: application/json` (Body limited to 4 KB)
- **Body**:
  ```json
  {
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "keys": {
        "p256dh": "...",
        "auth": "..."
      }
    },
    "time": "08:00",
    "timeZone": "America/New_York"
  }
  ```
- **Validation**:
  - `endpoint`: Must be HTTPS and from an approved push gateway (`fcm.googleapis.com`, `push.services.mozilla.com`, `push.apple.com`, `notify.windows.com`).
  - `time`: Valid 24-hour time format `HH:MM` (`00:00` - `23:59`).
  - `timeZone`: Valid IANA timezone string.
- **Response**: `200 OK` `{ "ok": true }`

### `POST /api/unsubscribe`
Deletes a subscription.
- **Body**: `{ "endpoint": "https://fcm.googleapis.com/..." }`
- **Response**: `200 OK` `{ "ok": true }`

### `POST /api/test`
Sends an immediate push notification to a registered subscription for testing.
- **Rate Limit**: Maximum 1 test push per endpoint per 60 seconds (enforced via KV TTL).
- **Body**: `{ "endpoint": "https://fcm.googleapis.com/..." }`
- **Response**: `200 OK` `{ "ok": true, "status": 201 }`

---

## Scheduled Cron Execution (`*/5 * * * *`)

The Worker runs every 5 minutes:
1. Scans subscriptions in KV (`sub:*`).
2. Evaluates each subscription's chosen time against the current time in its local IANA timezone.
3. If the reminder is due (`0 <= (nowMinutes - chosenMinutes) < 10`) and has not yet been sent today (`lastSentDate !== localDate`), sends a push.
4. On `404` or `410` from push gateway: Deletes the invalid subscription.
5. On `2xx`: Sets `lastSentDate = localDate` in KV.
6. On `429` or `5xx`: Leaves the record to retry on the next tick inside the 10-minute window.
