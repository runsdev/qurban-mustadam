# Laporan Qurban Masjid Al-Mustadam

A live tracking web application for Qurban (Islamic sacrifice) animal processing with push notification capabilities. Mosque operators update a Google Sheet and the website reflects the current status in real time, with optional push notifications for subscribers.

## Features

- Live status tracking for each animal across 5 stages: Persiapan, Disembelih, Pengolahan, Distribusi, Selesai
- Per-animal detail page with a stage timeline, weight info, shohibul list, and optional Drive folder link
- Overall progress summary (weighted average across all animals)
- Filterable animal list by ID, species, status, and location
- **Push notification system for real-time updates on animal status changes**
- Data is read from Google Sheets via a service account — no database required

## Tech Stack

- **Next.js 16** (App Router, ISR)
- **Tailwind CSS v4**
- **Google Sheets API v4** via `googleapis`
- **Web Push API** with `web-push` library
- TypeScript throughout

## Sheet Structure

The app reads from a tab named `Hewan` (configurable via `GOOGLE_SHEET_TAB`). Row 1 is a header row and is skipped. Columns must be in this exact order:

| Col | Field            | Notes                                        |
| --- | ---------------- | -------------------------------------------- |
| A   | ID               | Unique identifier, e.g. `Sapi-1`             |
| B   | Jenis            | Species: `Sapi`, `Kambing`, `Domba`, etc.    |
| C   | Status           | One of the 5 statuses listed above           |
| D   | Berat            | Weight in kg (number only, UI appends " kg") |
| E   | Berat Sembelih   | Post-slaughter weight (optional)             |
| F   | Lokasi           | Location description                         |
| G   | Shohibul         | Names separated by `\|` (pipe)               |
| H   | Gambar Hewan URL | Direct image URL for the animal photo        |
| I   | Drive URL        | Google Drive folder link (optional)          |
| J   | Waktu Selesai    | Completion time string (optional)            |
| K   | Catatan          | Notes (optional)                             |

Stage is derived automatically from Status — there is no separate stage column.

For push notifications, the app also uses a `Subscriptions` tab (configurable via `GOOGLE_SUBSCRIPTION_TAB`) with this structure:

| Col | Field        | Notes                                      |
| --- | ------------ | ------------------------------------------ |
| A   | Timestamp    | ISO timestamp when subscription was created|
| B   | Token        | Animal ID that user subscribed to          |
| C   | Endpoint     | Push subscription endpoint                 |
| D   | p256dh       | P-256dh key                                |
| E   | Auth         | Auth key                                   |

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd qurban
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:

```
# Google Sheets Configuration
GOOGLE_SPREADSHEET_ID=      # From the sheet URL
GOOGLE_SHEET_TAB=Hewan      # Tab name for animal data (default: Hewan)
GOOGLE_SUBSCRIPTION_TAB=Subscriptions  # Tab name for push subscriptions (default: Subscriptions)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_CLIENT_ID=
GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=
GOOGLE_SERVICE_ACCOUNT_KEY_ID=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=

# VAPID Keys for Web Push (generate at https://web-push-codelab.glitch.me/)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=     # Public key (exposed to client)
VAPID_PRIVATE_KEY=                # Private key (keep secret)
VAPID_PUBLIC_KEY=                 # Same as NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_SUBJECT=mailto:admin@yourdomain.com  # Mailto link for VAPID
```

### 3. Set up Google Sheets access

1. Enable the **Google Sheets API** in your Google Cloud project.
2. Create a **Service Account** and download its JSON key.
3. Copy the key fields into `.env.local`.
4. Share the spreadsheet with the service account email as **Viewer**.
5. Create two tabs in your spreadsheet:
   - `Hewan` (or whatever you set in `GOOGLE_SHEET_TAB`) for animal data
   - `Subscriptions` (or whatever you set in `GOOGLE_SUBSCRIPTION_TAB`) for push subscriptions
6. Add header rows to both tabs as described in the Sheet Structure section above.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Push Notification System

### How It Works

1. Users can subscribe to push notifications for specific animals by visiting the animal detail page and clicking the "Aktifkan Notifikasi untuk Hewan Ini" button
2. Browser asks notification permission directly on the same detail page (no redirect)
3. After granting permission, the subscription is stored in the Google Sheets `Subscriptions` tab
4. When animal status changes, notifications can be sent via:
   - Manual API call to `/api/notifications/send`
  - Secure webhook `/api/notifications/webhook` (recommended for Google Apps Script)

### API Endpoints

#### Subscribe to Notifications
```
POST /api/portal/{token}/subscribe
Body: { PushSubscription object }
```
Stores a push subscription for the given token (animal ID).

#### Send Notifications (Generic)
```
POST /api/notifications
Body: { token: string, title?: string, body?: string }
```
Sends a notification to all subscribers of the given token.

#### Send Status Update Notifications
```
POST /api/notifications/send
Body: { animalId: string, oldStatus?: string, newStatus: string }
```
Sends a formatted notification about a status change to all subscribers of the specific animal.

#### Secure Webhook for Spreadsheet Automation
```
POST /api/notifications/webhook
Headers: x-webhook-secret: <GOOGLE_SHEETS_WEBHOOK_SECRET>
Body: { animalId: string, oldStatus?: string, newStatus: string }
```
Same behavior as `/api/notifications/send`, but protected by a secret for external automation.

### Manual Notification Testing

To test the notification system:

```bash
# Send a test notification to subscribers of animal C101
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{"token":"C101","title":"Test Notifikasi","body":"Ini adalah notifikasi test"}'

# Send a status update notification
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"animalId":"C101","oldStatus":"Persiapan","newStatus":"Disembelih"}'
```

## Project Structure

```
app/
  page.tsx                  # Homepage server component (fetches Sheets data)
  _components/
    HomePageClient.tsx      # Homepage UI with filters (client component)
  hewan/[id]/
    page.tsx                # Animal detail page with notification button
  api/
    animals/route.ts        # GET /api/animals
    animals/[id]/route.ts   # GET /api/animals/:id
    portal/
      [token]/
        subscribe/route.ts  # POST /api/portal/{token}/subscribe
    notifications/
      route.ts              # POST /api/notifications (generic)
      send/route.ts         # POST /api/notifications/send (status updates)
      webhook/route.ts      # POST /api/notifications/webhook (secret-protected)
  public/
    notification.html       # Legacy page (optional) for manual permission flow
    service-worker.js       # Service worker for push notifications
lib/
  sheets.ts                 # Google Sheets data layer (now handles subscriptions)
  notifications.ts          # Shared web push sender for status updates
  types.ts                  # Shared TypeScript interfaces (includes PushSubscription)

docs/
  google-sheets-webhook.md  # Apps Script setup for auto notifications from sheet edits
```

## Environment Notes

- `revalidate = 60` on the homepage — data refreshes every 60 seconds via ISR.
- When `GOOGLE_SPREADSHEET_ID` is not set, the API returns an empty list and the detail page falls back to built-in mock data.
- The private key in `.env.local` uses literal `\n` for newlines; `sheets.ts` handles the conversion automatically.
- VAPID keys can be generated at https://web-push-codelab.glitch.me/
- The `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is exposed to the browser and used by the in-page subscribe button
- The `VAPID_PRIVATE_KEY` must be kept secret and is only used on the server
- Set `GOOGLE_SHEETS_WEBHOOK_SECRET` to secure the webhook endpoint used by Google Apps Script

## Google Sheets Auto Trigger

To send notifications automatically when status is edited in Google Sheets, use an installable Apps Script `onEdit` trigger that calls `/api/notifications/webhook`.

Full setup and script template:

- `docs/google-sheets-webhook.md`

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

When deploying to Vercel, add the environment variables in the project settings:
- All GOOGLE_* variables from your .env.local
- NEXT_PUBLIC_VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_PUBLIC_KEY
- VAPID_SUBJECT

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.