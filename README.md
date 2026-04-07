# Laporan Qurban Masjid Al-Mustadam

A live tracking web application for Qurban (Islamic sacrifice) animal processing. Mosque operators update a Google Sheet and the website reflects the current status in real time.

## Features

- Live status tracking for each animal across 5 stages: Persiapan, Disembelih, Pengolahan, Distribusi, Selesai
- Per-animal detail page with a stage timeline, weight info, shohibul list, and optional Drive folder link
- Overall progress summary (weighted average across all animals)
- Filterable animal list by ID, species, status, and location
- Data is read from Google Sheets via a service account — no database required

## Tech Stack

- **Next.js 16** (App Router, ISR)
- **Tailwind CSS v4**
- **Google Sheets API v4** via `googleapis`
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
GOOGLE_SPREADSHEET_ID=      # From the sheet URL
GOOGLE_SHEET_TAB=Hewan      # Tab name (default: Hewan)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_CLIENT_ID=
GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=
GOOGLE_SERVICE_ACCOUNT_KEY_ID=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
```

### 3. Set up Google Sheets access

1. Enable the **Google Sheets API** in your Google Cloud project.
2. Create a **Service Account** and download its JSON key.
3. Copy the key fields into `.env.local`.
4. Share the spreadsheet with the service account email as **Viewer**.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx                  # Homepage server component (fetches Sheets data)
  _components/
    HomePageClient.tsx      # Homepage UI with filters (client component)
  hewan/[id]/
    page.tsx                # Animal detail page
  api/
    animals/route.ts        # GET /api/animals
    animals/[id]/route.ts   # GET /api/animals/:id
lib/
  sheets.ts                 # Google Sheets data layer
  types.ts                  # Shared TypeScript interfaces
```

## Environment Notes

- `revalidate = 60` on the homepage — data refreshes every 60 seconds via ISR.
- When `GOOGLE_SPREADSHEET_ID` is not set, the API returns an empty list and the detail page falls back to built-in mock data.
- The private key in `.env.local` uses literal `\n` for newlines; `sheets.ts` handles the conversion automatically.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
