// ============================================================
// Arsip Suci – Google Sheets Data Layer
// ============================================================
//
// SETUP CHECKLIST
// ───────────────
// 1. Go to https://console.cloud.google.com and create a project.
// 2. Enable the "Google Sheets API" for that project.
// 3. Create a Service Account (IAM & Admin → Service Accounts).
// 4. Generate a JSON key for the service account and download it.
// 5. Copy the values into .env.local (see .env.example).
// 6. Share your Google Sheet with the service account email
//    (the "client_email" from the JSON key) as a Viewer.
// 7. Copy your Spreadsheet ID from the sheet URL:
//    https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
//
// SHEET STRUCTURE — "Hewan" tab
// ─────────────────────────────
// Row 1 is a header row (skipped automatically).
// Columns must be in this exact order:
//
//  A   B       C        D        E       F               G         H            I                J            K               L
//  ID  Nama    Jenis    Status   Berat   Berat Sembelih  Lokasi    Shohibul     Gambar Hewan URL Drive URL    Waktu Selesai   Catatan
//
//  • Shohibul  → names separated by " | "  (pipe with spaces)
//               e.g.  "Bapak Ahmad | Ibu Siti | Keluarga Al-Fatih"
//  • Tahap     → REMOVED — derived automatically from status
//  • Status    → one of: Persiapan | Disembelih | Pengolahan | Distribusi | Selesai
//  • Berat     → number only, kilograms (the UI will append " kg")
//
// SHEET STRUCTURE — "Password" tab
// ─────────────────────────────
// Cell A1 contains the 6-digit password for panit login.
//
// ============================================================

import { google } from "googleapis";
import type { Animal, AnimalStatus, StageIndex, SummaryStats, PushSubscription } from "./types";

// ── Column indices (0-based) matching the sheet layout above ──
const COL = {
  ID: 0,
  NAME: 1,
  SPECIES: 2,
  STATUS: 3,
  // E: Tahap removed — stage is now derived from status
  WEIGHT: 4,
  WEIGHT_POST: 5,
  LOCATION: 6,
  SHOHIBUL: 7,
  IMAGE_URL: 8,
  DRIVE_URL: 9,
  COMPLETED_TIME: 10,
  NOTES: 11,
} as const;

// Subscription sheet columns
const SUB_COL = {
  TIMESTAMP: 0,
  TOKEN: 1,
  ENDPOINT: 2,
  P256DH: 3,
  AUTH: 4,
} as const;

const SHEET_NAME = process.env.GOOGLE_SHEET_TAB ?? "Hewan";
const SUBSCRIPTION_SHEET_NAME = process.env.GOOGLE_SUBSCRIPTION_TAB ?? "Subscriptions";
const PASSWORD_SHEET_NAME = process.env.GOOGLE_PASSWORD_TAB ?? "Password";
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID ?? "";
const ENV_SHEET_NAME = process.env.GOOGLE_ENV_TAB ?? "Env";
const SERVICE_ACCOUNT_EMAIL =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ??
  process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL ??
  "";

function normalizeToken(value: string) {
  return value.trim().replace(/^#/, "").toLowerCase();
}

function normalizeEndpoint(value: string) {
  return value.trim();
}

function hasGoogleSheetsCredentials() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID &&
      SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

// ── Build the authenticated Sheets client ─────────────────────
function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
      private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID,
      // Next.js stores multiline env vars with literal \n — restore real newlines
      private_key: (
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? ""
      ).replace(/\\n/g, "\n"),
      client_email: SERVICE_ACCOUNT_EMAIL,
      client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

// ── Status → Stage mapping (stage is derived from status) ────
const STATUS_STAGE: Record<string, StageIndex> = {
  Persiapan: 1,
  Disembelih: 2,
  Pengolahan: 3,
  Distribusi: 4,
  Selesai: 5,
};

// ── Parse a raw sheet row into an Animal object ───────────────
function parseRow(row: (string | null | undefined)[]): Animal | null {
  const id = row[COL.ID]?.trim();
  if (!id) return null; // skip blank rows

  const rawWeight = row[COL.WEIGHT]?.trim() ?? "";
  // Accept "520" or "520 kg" — normalise to "520 kg"
  const weight = rawWeight.endsWith("kg")
    ? rawWeight
    : rawWeight
      ? `${rawWeight} kg`
      : "— kg";

  const rawWeightPost = row[COL.WEIGHT_POST]?.trim() ?? "";
  const weightPost = rawWeightPost.endsWith("kg")
    ? rawWeightPost
    : rawWeightPost
      ? `${rawWeightPost} kg`
      : undefined;

  const rawStatus = row[COL.STATUS]?.trim() as AnimalStatus;
  const currentStage = (STATUS_STAGE[rawStatus] ?? 1) as StageIndex;

  const rawShohibul = row[COL.SHOHIBUL]?.trim() ?? "";
  const shohibul = rawShohibul
    ? rawShohibul
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return {
    id,
    name: row[COL.NAME]?.trim() ?? id,
    species: row[COL.SPECIES]?.trim() ?? "Hewan",
    status: rawStatus ?? "Persiapan",
    currentStage,
    weight,
    location: row[COL.LOCATION]?.trim() ?? "",
    shohibul,
    imageUrl: row[COL.IMAGE_URL]?.trim() ?? "",
    driveUrl: row[COL.DRIVE_URL]?.trim() || undefined,
    weightPost,
    completedTime: row[COL.COMPLETED_TIME]?.trim() || undefined,
    notes: row[COL.NOTES]?.trim() || undefined,
  };
}

// ── Fetch all rows ────────────────────────────────────────────
export async function fetchAllAnimals(): Promise<Animal[]> {
  if (!SPREADSHEET_ID) {
    console.warn(
      "[sheets] GOOGLE_SPREADSHEET_ID is not set — returning empty list.",
    );
    return [];
  }

  if (!hasGoogleSheetsCredentials()) {
    console.warn(
      "[sheets] Google service account credentials are incomplete — returning empty list.",
    );
    return [];
  }

  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    // Skip header row (start from row 2)
    range: `${SHEET_NAME}!A2:L`,
  });

  const rows = response.data.values ?? [];
  return rows
    .map((row) => parseRow(row as string[]))
    .filter((a): a is Animal => a !== null);
}

// ── Fetch a single animal by ID ───────────────────────────────
export async function fetchAnimalById(id: string): Promise<Animal | null> {
  const all = await fetchAllAnimals();
  return all.find((a) => a.id.toUpperCase() === id.toUpperCase()) ?? null;
}

// ── Update an animal's status by ID ───────────────────────────────
export async function updateAnimalStatus(id: string, newStatus: AnimalStatus): Promise<void> {
  if (!SPREADSHEET_ID) {
    console.warn(
      "[sheets] GOOGLE_SPREADSHEET_ID is not set — skipping status update.",
    );
    return;
  }

  if (!hasGoogleSheetsCredentials()) {
    console.warn(
      "[sheets] Google service account credentials are incomplete — skipping status update.",
    );
    return;
  }

  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:A`, // Only fetch ID column to find row
    });

    const rows = response.data.values ?? [];
    const rowIndex = rows.findIndex(
      (row) => row[0]?.toString().toUpperCase() === id.toUpperCase()
    );

    if (rowIndex === -1) {
      throw new Error(`Animal with ID ${id} not found`);
    }

    const sheetRow = rowIndex + 2; // Because we started from row 2
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!${columnNumberToLetter(COL.STATUS + 1)}${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[newStatus]] },
    });
  } catch (error) {
    console.error("[sheets] Failed to update animal status:", error);
    throw error;
  }
}

function columnNumberToLetter(columnNumber: number) {
  let result = "";
  let current = columnNumber;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
}

async function updateAnimalCell(id: string, columnIndex: number, value: string): Promise<void> {
  if (!SPREADSHEET_ID) {
    console.warn("[sheets] GOOGLE_SPREADSHEET_ID is not set — skipping cell update.");
    return;
  }

  if (!hasGoogleSheetsCredentials()) {
    console.warn(
      "[sheets] Google service account credentials are incomplete — skipping cell update.",
    );
    return;
  }

  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:A`,
  });

  const rows = response.data.values ?? [];
  const rowIndex = rows.findIndex(
    (row) => row[0]?.toString().toUpperCase() === id.toUpperCase(),
  );

  if (rowIndex === -1) {
    throw new Error(`Animal with ID ${id} not found`);
  }

  const sheetRow = rowIndex + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!${columnNumberToLetter(columnIndex)}${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] },
  });
}

export async function updateAnimalDriveUrl(id: string, driveUrl: string): Promise<void> {
  try {
    await updateAnimalCell(id, COL.DRIVE_URL + 1, driveUrl);
  } catch (error) {
    console.error("[sheets] Failed to update animal drive URL:", error);
    throw error;
  }
}

export async function updateAnimalImageUrl(id: string, imageUrl: string): Promise<void> {
  try {
    await updateAnimalCell(id, COL.IMAGE_URL + 1, imageUrl);
  } catch (error) {
    console.error("[sheets] Failed to update animal image URL:", error);
    throw error;
  }
}

// ── Read key/value pairs from Env sheet (A = key, B = value) ─────────────────
export async function getEnvValue(key: string): Promise<string | null> {
  if (!SPREADSHEET_ID) {
    console.warn("[sheets] GOOGLE_SPREADSHEET_ID is not set — cannot read Env.");
    return null;
  }

  if (!hasGoogleSheetsCredentials()) {
    console.warn("[sheets] Google service account credentials are incomplete — cannot read Env.");
    return null;
  }

  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ENV_SHEET_NAME}!A:B`,
    });

    const rows = response.data.values ?? [];
    for (const row of rows) {
      const rowKey = String(row?.[0] ?? "").trim();
      if (!rowKey) continue;
      if (rowKey === key) {
        const val = row?.[1] ?? "";
        return typeof val === "string" ? val : String(val);
      }
    }

    return null;
  } catch (error) {
    console.error("[sheets] Failed to read Env sheet:", error);
    return null;
  }
}

// ── Get the panit password from the Password tab ─────────────────────
export async function getPassword(): Promise<string | null> {
  if (!SPREADSHEET_ID) {
    console.warn(
      "[sheets] GOOGLE_SPREADSHEET_ID is not set — cannot retrieve password.",
    );
    return null;
  }

  if (!hasGoogleSheetsCredentials()) {
    console.warn(
      "[sheets] Google service account credentials are incomplete — cannot retrieve password.",
    );
    return null;
  }

  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PASSWORD_SHEET_NAME}!A1`, // Assuming password is in A1
    });

    const value = response.data.values?.[0]?.[0];
    return typeof value === "string" ? value : null;
  } catch (error) {
    console.error("[sheets] Failed to get password:", error);
    return null;
  }
}

// ── Compute summary stats ─────────────────────────────────────
export function computeStats(animals: Animal[]): SummaryStats {
  const total = animals.length;
  const completed = animals.filter((a) => a.status === "Selesai").length;

  // Progress = sum of each animal's stage progress / max possible (total × 5)
  // Each stage maps 1–5, so full completion per animal = 5
  const stageSum = animals.reduce((sum, a) => sum + (a.currentStage ?? 1), 0);
  const progressPercent =
    total > 0 ? Math.round((stageSum / (total * 5)) * 100) : 0;

  const totalWeightKg = animals.reduce((sum, a) => {
    const num = parseFloat(a.weight.replace(/[^\d.]/g, ""));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  return {
    totalAnimals: total,
    completedAnimals: completed,
    progressPercent,
    totalWeightKg,
  };
}

// ── Store push subscription in Google Sheets ─────────────────────
export async function storePushSubscription(
  subscription: PushSubscription
): Promise<void> {
  if (!SPREADSHEET_ID) {
    console.warn(
      "[sheets] GOOGLE_SPREADSHEET_ID is not set — skipping subscription storage.",
    );
    return;
  }

  if (!hasGoogleSheetsCredentials()) {
    console.warn(
      "[sheets] Google service account credentials are incomplete — skipping subscription storage.",
    );
    return;
  }

  try {
    const sheets = getSheetsClient();
    const token = subscription.token.trim();
    const endpoint = normalizeEndpoint(subscription.endpoint);
    const normalizedToken = normalizeToken(token);

    const values = [
      [
        subscription.timestamp,
        token,
        endpoint,
        subscription.p256dh,
        subscription.auth,
      ],
    ];

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SUBSCRIPTION_SHEET_NAME}!A2:E`,
    });

    const rows = existing.data.values ?? [];
    const existingIndex = rows.findIndex((row) => {
      const rowToken = normalizeToken(String(row[SUB_COL.TOKEN] ?? ""));
      const rowEndpoint = normalizeEndpoint(String(row[SUB_COL.ENDPOINT] ?? ""));
      return rowToken === normalizedToken && rowEndpoint === endpoint;
    });

    if (existingIndex >= 0) {
      const sheetRow = existingIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SUBSCRIPTION_SHEET_NAME}!A${sheetRow}:E${sheetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
      });
      return;
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SUBSCRIPTION_SHEET_NAME}!A:E`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  } catch (error) {
    console.error("[sheets] Failed to store push subscription:", error);
    throw error;
  }
}

// ── Get all push subscriptions from Google Sheets ────────────────
export async function getPushSubscriptions(): Promise<PushSubscription[]> {
  if (!SPREADSHEET_ID) {
    console.warn(
      "[sheets] GOOGLE_SPREADSHEET_ID is not set — returning empty subscriptions.",
    );
    return [];
  }

  if (!hasGoogleSheetsCredentials()) {
    console.warn(
      "[sheets] Google service account credentials are incomplete — returning empty subscriptions.",
    );
    return [];
  }

  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SUBSCRIPTION_SHEET_NAME}!A2:E`, // Start from row 2 to skip header
    });

    const rows = response.data.values ?? [];
    const subscriptions = rows
      .map(
        (row) =>
          ({
            timestamp: row[SUB_COL.TIMESTAMP] ?? "",
            token: row[SUB_COL.TOKEN] ?? "",
            endpoint: row[SUB_COL.ENDPOINT] ?? "",
            p256dh: row[SUB_COL.P256DH] ?? "",
            auth: row[SUB_COL.AUTH] ?? "",
          }) as PushSubscription
      )
      .filter((sub) => sub.endpoint); // Only return valid subscriptions

    const deduped = new Map<string, PushSubscription>();
    for (const sub of subscriptions) {
      const key = `${normalizeToken(sub.token)}::${normalizeEndpoint(sub.endpoint)}`;
      const existingSub = deduped.get(key);
      if (!existingSub || sub.timestamp > existingSub.timestamp) {
        deduped.set(key, sub);
      }
    }

    return Array.from(deduped.values());
  } catch (error) {
    console.error("[sheets] Failed to get push subscriptions:", error);
    return [];
  }
}

// ── Get push subscriptions by token (animal ID) ─────────────────────
export async function getPushSubscriptionsByToken(token: string): Promise<PushSubscription[]> {
  if (!SPREADSHEET_ID) {
    console.warn(
      "[sheets] GOOGLE_SPREADSHEET_ID is not set — returning empty subscriptions.",
    );
    return [];
  }

  if (!hasGoogleSheetsCredentials()) {
    console.warn(
      "[sheets] Google service account credentials are incomplete — returning empty subscriptions.",
    );
    return [];
  }

  try {
    const allSubscriptions = await getPushSubscriptions();
    const normalizedToken = normalizeToken(token);
    return allSubscriptions.filter(
      (sub) => normalizeToken(sub.token) === normalizedToken,
    );
  } catch (error) {
    console.error("[sheets] Failed to get push subscriptions by token:", error);
    return [];
  }
}
