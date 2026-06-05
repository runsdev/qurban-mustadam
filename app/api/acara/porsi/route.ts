import { NextResponse } from "next/server";
import { getSheetValues } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_SHEET_NAME = process.env.GOOGLE_ACARA_MAKAN_TAB ?? "makan";
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// In-memory fallback cache: will survive as long as the server process is alive.
let lastKnownPorsi: number | null = null;
let lastKnownAt: string | null = null;

// Optional override to force reading a specific cell (e.g. "B2").
const OVERRIDE_CELL = process.env.GOOGLE_ACARA_PORSI_CELL || null;

export async function GET() {
  try {
    // Read a reasonably sized area. If OVERRIDE_CELL is set we'll still read a larger block
    // but only use the override coordinate.
    const headerRows = await getSheetValues(LOG_SHEET_NAME, "A1:Z50");
    let currentPorsi: number | null = null;

    const normalizeNumber = (s: string) => {
      const match = s.match(/[\d.,]+/);
      if (!match) return null;
      // Remove common thousands separators and keep digits only
      const cleaned = match[0].replace(/[.,]/g, "");
      const n = parseInt(cleaned, 10);
      return Number.isNaN(n) ? null : n;
    };

    const colLettersToIndex = (letters: string) => {
      let v = 0;
      for (let i = 0; i < letters.length; i++) {
        v = v * 26 + (letters.charCodeAt(i) - 64);
      }
      return v - 1; // A -> 0
    };

    const parseCell = (cell: string) => {
      const m = String(cell || "").toUpperCase().match(/^([A-Z]+)(\d+)$/);
      if (!m) return null;
      const col = colLettersToIndex(m[1]);
      const row = parseInt(m[2], 10) - 1;
      return { r: row, c: col };
    };

    // If an explicit cell is configured, read that exact cell and return it (if present).
    if (OVERRIDE_CELL) {
      const coord = parseCell(OVERRIDE_CELL);
      if (coord) {
        const probe = String(headerRows[coord.r]?.[coord.c] || "").trim();
        const n = normalizeNumber(probe);
        if (n !== null) {
          currentPorsi = n;
          lastKnownPorsi = currentPorsi;
          lastKnownAt = new Date().toISOString();
          return NextResponse.json({ porsi: currentPorsi, updatedAt: lastKnownAt, cached: false, cell: OVERRIDE_CELL }, { headers: NO_STORE_HEADERS });
        }
        // If explicit cell present but empty, don't attempt wide search.
        return NextResponse.json({ porsi: null, updatedAt: new Date().toISOString(), cached: false, cell: OVERRIDE_CELL }, { headers: NO_STORE_HEADERS });
      }
      // If OVERRIDE_CELL is malformed, ignore and continue to label detection.
    }

    for (let r = 0; r < headerRows.length; r++) {
      for (let c = 0; c < (headerRows[r] || []).length; c++) {
        const raw = String(headerRows[r][c] || "").trim();
        const val = raw.toLowerCase();
        if (val.includes("sisa porsi")) {
          // Only check the cell directly below the label to avoid picking unrelated numbers.
          const checkedCells = [
            { r: r + 1, c },
          ];

          let found: number | null = null;
          let foundCoord: { r: number; c: number } | null = null;

          for (const p of checkedCells) {
            const probe = String(headerRows[p.r]?.[p.c] || "").trim();
            const n = normalizeNumber(probe);
            if (n !== null) {
              found = n;
              foundCoord = p;
              break;
            }
          }

          if (found !== null) {
            currentPorsi = found;
            lastKnownPorsi = currentPorsi;
            lastKnownAt = new Date().toISOString();
            return NextResponse.json({ porsi: currentPorsi, updatedAt: lastKnownAt, cached: false, cellCoord: foundCoord }, { headers: NO_STORE_HEADERS });
          }
        }
      }
    }

    // If we didn't find a current porsi, fallback to last known cached value (if any)
    if (currentPorsi === null && lastKnownPorsi !== null) {
      return NextResponse.json({ porsi: lastKnownPorsi, updatedAt: lastKnownAt, cached: true }, { headers: NO_STORE_HEADERS });
    }

    return NextResponse.json({ porsi: currentPorsi, updatedAt: new Date().toISOString(), cached: false }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error("Error fetching porsi:", err);
    return NextResponse.json({ error: "Failed to fetch porsi" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
