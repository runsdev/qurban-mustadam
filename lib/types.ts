// ============================================================
// Arsip Suci – Shared TypeScript Types
// ============================================================

/**
 * Animal status values — must match what's written in the
 * "Status" column of the Google Sheet exactly.
 */
export type AnimalStatus =
  | "Persiapan"
  | "Disembelih"
  | "Pengolahan"
  | "Distribusi"
  | "Selesai";

/**
 * Journey stage index (1–5), derived automatically from Status.
 */
export type StageIndex = 1 | 2 | 3 | 4 | 5;

/**
 * One row from the "Hewan" sheet.
 * Column order in the sheet must match SHEET_COLUMNS in lib/sheets.ts.
 */
export interface Animal {
  /** Unique animal ID, e.g. "C101", "G205" */
  id: string;
  /** Display name, e.g. "Sapi Brahman (XL)" */
  name: string;
  /** Species category: Sapi | Kambing | Domba */
  species: string;
  /** Current process status */
  status: AnimalStatus;
  /** Numeric stage 1–6 mapped to the six journey steps */
  currentStage: StageIndex;
  /** Live weight string incl. unit, e.g. "520 kg" */
  weight: string;
  /** Post-slaughter (dressed) weight, e.g. "310 kg" — optional */
  weightPost?: string;
  /** Execution location description */
  location: string;
  /**
   * Names of Shohibul Qurban participants.
   * In the sheet these are stored as "|"-separated values in one cell,
   * or as separate rows in the "Shohibul" sheet (see lib/sheets.ts).
   */
  shohibul: string[];
  /** Direct image URL (Google Drive, Cloudinary, etc.) */
  imageUrl: string;
  /** Google Drive folder/file URL for documentation — optional */
  driveUrl?: string;
  /** Completion time, e.g. "09:15 WIB" — optional */
  completedTime?: string;
  /** Notes entered by operator — optional */
  notes?: string;
}

/**
 * Summary stats shown on the homepage hero bento.
 * Typically computed from all Animal rows.
 */
export interface SummaryStats {
  totalAnimals: number;
  completedAnimals: number;
  progressPercent: number;
  totalWeightKg: number;
}
