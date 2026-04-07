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
//  • Tahap     → REMOVED — derived automatically from Status
//  • Status    → one of: Persiapan | Disembelih | Pengolahan | Distribusi | Selesai
//  • Berat     → number only, kilograms (the UI will append " kg")
//
// ============================================================

import { google } from "googleapis";
import type { Animal, AnimalStatus, StageIndex, SummaryStats } from "./types";

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

const SHEET_NAME = process.env.GOOGLE_SHEET_TAB ?? "Hewan";
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID ?? "";

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
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
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
