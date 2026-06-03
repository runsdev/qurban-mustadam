import { NextResponse } from "next/server";
import { appendSheetValues, getSheetValues, getSheetsClient, SPREADSHEET_ID } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_SHEET_NAME = process.env.GOOGLE_ACARA_MAKAN_TAB ?? "makan";
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

type ScanMode = "regular" | "qurtek";

type ParsedBarcode = {
  randomPrefix: string;
  nim: string;
  encodedDate: string;
  randomSuffix: string;
};

function parseBarcode(value: string): ParsedBarcode | null {
  const trimmed = value.trim();
  const parts = trimmed.split("#");

  if (parts.length !== 4) {
    return null;
  }

  const [randomPrefix, nim, encodedDate, randomSuffix] = parts;
  if (!/^\d+$/.test(randomPrefix) || !/^\d+$/.test(nim) || !/^\d{6}$/.test(randomSuffix)) {
    return null;
  }

  if (!/^(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}-\d{2}-\d{2})$/.test(encodedDate)) {
    return null;
  }

  return {
    randomPrefix,
    nim,
    encodedDate,
    randomSuffix,
  };
}

function toJakartaParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(getPart("year")),
    month: Number(getPart("month")),
    day: Number(getPart("day")),
    weekday: getPart("weekday"),
  };
}

function getWeekKey(date: Date) {
  const { year, month, day, weekday } = toJakartaParts(date);
  const weekdayIndexMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  const localWeekdayIndex = weekdayIndexMap[weekday] ?? 0;
  const localMidnightUtc = Date.UTC(year, month - 1, day);
  const mondayUtc = localMidnightUtc - localWeekdayIndex * 24 * 60 * 60 * 1000;
  return new Date(mondayUtc).toISOString().slice(0, 10);
}

function getCurrentJakartaIso(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const formatted = formatter.format(date).replace(" ", "T");
  return `${formatted}+07:00`;
}

function formatDisplayTimestamp(isoTimestamp: string) {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(parsed);
}

function normalizeScanMode(value: unknown): ScanMode {
  return String(value ?? "").trim().toLowerCase() === "qurtek" ? "qurtek" : "regular";
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const barcode = String(payload?.barcode ?? "").trim();
    const scanMode = normalizeScanMode(payload?.scanMode);

    if (!barcode) {
      return NextResponse.json(
        { error: "Barcode is required" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const parsedBarcode = parseBarcode(barcode);
    if (!parsedBarcode) {
      return NextResponse.json(
        { error: "Format barcode tidak valid" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const normalizedNim = parsedBarcode.nim.trim();

    const now = new Date();
    const currentWeekKey = getWeekKey(now);
    const currentIso = getCurrentJakartaIso(now);

    const logRows = await getSheetValues(LOG_SHEET_NAME, "A2:C");
    const alreadyUsedThisWeek = logRows.some((row) => {
      const loggedTimestamp = String(row[0] ?? "").trim();
      const loggedNim = String(row[1] ?? "").trim();

      if (!loggedTimestamp || loggedNim !== normalizedNim) {
        return false;
      }

      return getWeekKey(new Date(loggedTimestamp)) === currentWeekKey;
    });

    if (alreadyUsedThisWeek) {
      return NextResponse.json(
        { error: "Pekan ini QR code sudah digunakan" },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    if (scanMode === "regular") {
      // Cek sisa porsi di header rows
      const headerRows = await getSheetValues(LOG_SHEET_NAME, "A1:Z10");
      let porsiRowIdx = -1;
      let porsiColIdx = -1;
      let currentPorsi = -1;

      for (let r = 0; r < headerRows.length; r++) {
        for (let c = 0; c < headerRows[r].length; c++) {
          const val = String(headerRows[r][c] || "").trim().toLowerCase();
          if (val.includes("sisa porsi")) {
            const match = val.match(/\d+/);
            if (match) {
              currentPorsi = parseInt(match[0], 10);
              porsiRowIdx = r;
              porsiColIdx = c;
            } else {
              const below = String(headerRows[r + 1]?.[c] || "").trim();
              if (/^\d+$/.test(below)) {
                currentPorsi = parseInt(below, 10);
                porsiRowIdx = r + 1;
                porsiColIdx = c;
              } else {
                const right = String(headerRows[r]?.[c + 1] || "").trim();
                if (/^\d+$/.test(right)) {
                  currentPorsi = parseInt(right, 10);
                  porsiRowIdx = r;
                  porsiColIdx = c + 1;
                }
              }
            }
          }
        }
      }

      if (currentPorsi !== -1 && porsiRowIdx !== -1 && porsiColIdx !== -1) {
        if (currentPorsi <= 0) {
          return NextResponse.json(
            { error: "Porsi makanan di spreadsheet sudah habis (0)" },
            { status: 403, headers: NO_STORE_HEADERS },
          );
        }
        const newPorsi = currentPorsi - 1;
        const originalText = String(headerRows[porsiRowIdx][porsiColIdx]);
        let newValueToSave: string | number = newPorsi;

        if (originalText.toLowerCase().includes("sisa porsi")) {
          newValueToSave = originalText.replace(/\d+/, String(newPorsi));
        }

        const colLetter = String.fromCharCode(65 + porsiColIdx);
        const cellToUpdate = `${LOG_SHEET_NAME}!${colLetter}${porsiRowIdx + 1}`;
        const sheets = getSheetsClient();
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: cellToUpdate,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[newValueToSave]] },
        });
      }
    }

    await appendSheetValues(LOG_SHEET_NAME, [[currentIso, normalizedNim, scanMode.toUpperCase()]]);

    return NextResponse.json({
      success: true,
      message: scanMode === "qurtek"
        ? "Registrasi panitia Qurtek berhasil (tidak mengurangi sisa porsi)."
        : "Scan berhasil",
      nim: normalizedNim,
      barcode,
      scanMode,
      timestamp: currentIso,
      displayTimestamp: formatDisplayTimestamp(currentIso),
      weekKey: currentWeekKey,
      encodedDate: parsedBarcode.encodedDate,
    }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[api/acara/scan] Scan error:", error);
    const message = error instanceof Error ? error.message : "Gagal memproses scan";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
