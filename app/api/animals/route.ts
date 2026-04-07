// ============================================================
// Arsip Suci – API Route: GET /api/animals
// Returns the full list of animals from Google Sheets.
// Used by the "use client" homepage component.
// ============================================================

import { NextResponse } from "next/server";
import { fetchAllAnimals, computeStats } from "@/lib/sheets";

export const dynamic = "force-dynamic"; // always fetch fresh data
export const revalidate = 60; // ISR: revalidate every 60 s

export async function GET() {
  try {
    const animals = await fetchAllAnimals();
    const stats = computeStats(animals);
    return NextResponse.json({ animals, stats });
  } catch (err) {
    console.error("[api/animals] Failed to fetch from Google Sheets:", err);
    return NextResponse.json(
      { error: "Gagal memuat data hewan. Coba lagi nanti." },
      { status: 500 },
    );
  }
}
