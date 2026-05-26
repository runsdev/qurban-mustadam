import { NextResponse } from "next/server";
import { getSheetValues } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_SHEET_NAME = process.env.GOOGLE_ACARA_MAKAN_TAB ?? "makan";

export async function GET() {
  try {
    const headerRows = await getSheetValues(LOG_SHEET_NAME, "A1:Z2");
    let currentPorsi = -1;

    for (let r = 0; r < headerRows.length; r++) {
      for (let c = 0; c < headerRows[r].length; c++) {
        const val = String(headerRows[r][c] || "").trim().toLowerCase();
        if (val.includes("sisa porsi")) {
          const match = val.match(/\d+/);
          if (match) {
            currentPorsi = parseInt(match[0], 10);
            return NextResponse.json({ porsi: currentPorsi });
          } else {
            const below = String(headerRows[r+1]?.[c] || "").trim();
            if (/^\d+$/.test(below)) {
               currentPorsi = parseInt(below, 10);
               return NextResponse.json({ porsi: currentPorsi });
            } else {
              const right = String(headerRows[r]?.[c + 1] || "").trim();
              if (/^\d+$/.test(right)) {
                currentPorsi = parseInt(right, 10);
                return NextResponse.json({ porsi: currentPorsi });
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ porsi: currentPorsi === -1 ? "?" : currentPorsi });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch porsi" }, { status: 500 });
  }
}
