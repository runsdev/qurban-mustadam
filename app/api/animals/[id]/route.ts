// ============================================================
// Arsip Suci – API Route: GET /api/animals/[id]
// Returns a single animal record by ID from Google Sheets.
// ============================================================

import { NextResponse } from "next/server";
import { fetchAnimalById } from "@/lib/sheets";

export const dynamic = "force-dynamic";
export const revalidate = 30; // revalidate every 30 s

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const animal = await fetchAnimalById(id);

    if (!animal) {
      return NextResponse.json(
        { error: `Hewan dengan ID "${id}" tidak ditemukan.` },
        { status: 404 },
      );
    }

    return NextResponse.json({ animal });
  } catch (err) {
    console.error(
      `[api/animals/${id}] Failed to fetch from Google Sheets:`,
      err,
    );
    return NextResponse.json(
      { error: "Gagal memuat data hewan. Coba lagi nanti." },
      { status: 500 },
    );
  }
}
