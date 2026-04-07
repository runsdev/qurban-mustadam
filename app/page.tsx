// ============================================================
// Arsip Suci – Homepage (Server Component)
// Fetches live data from Google Sheets, renders HomePageClient.
// ============================================================
import HomePageClient from "./_components/HomePageClient";
import { fetchAllAnimals, computeStats } from "@/lib/sheets";
import type { Animal } from "@/lib/types";

// Revalidate every 60 seconds (ISR)
export const revalidate = 60;

export default async function HomePage() {
  let animals: Animal[] = [];
  try {
    animals = await fetchAllAnimals();
  } catch (err) {
    console.error("[HomePage] Failed to fetch from Google Sheets:", err);
  }

  const stats = computeStats(animals);

  return <HomePageClient animals={animals} stats={stats} />;
}
