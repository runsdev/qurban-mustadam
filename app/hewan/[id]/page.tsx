// ============================================================
// Arsip Suci – Animal Detail Page
// Design System: "The Sacred Archive" / "The Ethereal Legacy"
// ============================================================
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { fetchAnimalById } from "@/lib/sheets";
import type { Animal, StageTrackableStatus } from "@/lib/types";
import NotificationSubscribeButton from "./NotificationSubscribeButton";

// ── Fallback mock data (used when Google Sheets env vars are not set) ─
const mockData: Record<string, Animal> = {
  C101: {
    id: "C101",
    name: "Sapi Brahman (XL)",
    species: "Sapi",
    status: "Hewan Tiba",
    currentStage: 1,
    weight: "520 kg",
    location: "Kandang A — Kompleks Terpadu Al-Azhar, Klaten",
    shohibul: [
      "Bapak Ahmad Fauzi",
      "Ibu Siti Rahayu",
      "Keluarga Al-Barokah",
      "H. Usman Hakim",
      "Alm. Bapak Ismail",
      "Ibu Dewi Lestari",
      "Bpk. Gunawan Santoso",
    ],
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDXSkVd4pgHkQxpU_goH916YuCHuHalIF5hAa5pRKYdKMcTaU66MYeUo_TDTEok2oR1OhyPoiBItHOT-Qv7gnKM9jPsIjwoM3_qTGH2EhJpHLdxQgvTXNE6BpmNKtMcurCuL4HJ7QjoDXkCga1mxOD0mm1te-STNJKpoY0YxaJ-7M33h31uKXPciQJBlZIESVLR4fEI87aeq-qBy1g_Uq1ZA-Iz-LG512ud-o3fz72oD4HnmQX5H_7O6YwqEoIDJM7PoCle6kvM",
  },
  G205: {
    id: "G205",
    name: "Kambing Saanen",
    species: "Kambing",
    status: "Pengulitan",
    currentStage: 3,
    weight: "42 kg",
    location: "Fasilitas Pengolahan B — Kompleks Terpadu Al-Azhar, Klaten",
    shohibul: ["Bapak Ridwan Maulana"],
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBV3iJDM89Tk1ipYQiD37dihu83KUf_3o5McEPkANOkM9Mz0AU0k5Be4nmfX5cw0fER2jz0Q1Hx32T2La2if_dcBq_yL06XEEm6cHK2ZXICrEEEQRWbkUJp76eEm_PX_11hOrKxVR7-P8tiMG2kYbsUhXy2oqKqH7GeVb8KrL-xn1b-iTa3QEl69aT4p6KqZPdcFQB6oIkkGpVzARsYtnzZ7BnRIPkBH30Q_5-zhxZUs9Vja99JTZT5utUvVkxYROR6lk74p2st",
    completedTime: "09:15 WIB",
  },
  C088: {
    id: "C088",
    name: "Sapi Limousin",
    species: "Sapi",
    status: "Selesai",
    currentStage: 7,
    weight: "640 kg",
    location: "Gudang Distribusi — Kompleks Terpadu Al-Azhar, Klaten",
    shohibul: [
      "Bapak Ahmad Subarjo",
      "Ibu Siti Aminah",
      "Keluarga Al-Fatih",
      "H. Muhammad Rizky",
      "Alm. Bapak Yusuf",
      "Ibu Ratna Sari",
      "Bpk. Bambang Widjojo",
    ],
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDXSkVd4pgHkQxpU_goH916YuCHuHalIF5hAa5pRKYdKMcTaU66MYeUo_TDTEok2oR1OhyPoiBItHOT-Qv7gnKM9jPsIjwoM3_qTGH2EhJpHLdxQgvTXNE6BpmNKtMcurCuL4HJ7QjoDXkCga1mxOD0mm1te-STNJKpoY0YxaJ-7M33h31uKXPciQJBlZIESVLR4fEI87aeq-qBy1g_Uq1ZA-Iz-LG512ud-o3fz72oD4HnmQX5H_7O6YwqEoIDJM7PoCle6kvM",
    completedTime: "08:45 WIB",
  },
  S412: {
    id: "S412",
    name: "Domba Merino",
    species: "Domba",
    status: "Penyembelihan",
    currentStage: 2,
    weight: "38 kg",
    location: "Area Penyembelihan — Kompleks Terpadu Al-Azhar, Klaten",
    shohibul: ["Bapak Hendra Kusuma"],
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCE1letEEImqLjLSnyLmemb991kgAB99Cc-k6BWpSpyOLtyBHGbko3IkFyxNyb-G9nehWEA4XgYaZzWTOOcvMKD9GBvnY7KcEFHLNNyqrkk-UxFd4njHjgQfEaufSc1t6VC7kOyUYh_iqkV3aNGPmtU2xnFlh8_DQ_mCl7GRqFNNrqhNYROKQL7QkKQ7-rZf_WAz5vvjQZNRoljeRi9L-6b58DEiDSMc85CiUlKWhZp3OeHoudsGRqeMu5fK3Tvinjqf7SWP7tF",
    completedTime: "08:45 WIB",
  },
};

// ── Journey stages definition ─────────────────────────────────
const stages: Array<{ key: number; label: StageTrackableStatus; icon: string }> = [
  { key: 1, label: "Hewan Tiba", icon: "pets" },
  { key: 2, label: "Penyembelihan", icon: "content_cut" },
  { key: 3, label: "Pengulitan", icon: "conveyor_belt" },
  { key: 4, label: "Pemisahan daging & tulang", icon: "recycling" },
  { key: 5, label: "Pemotongan daging", icon: "content_cut" },
  { key: 6, label: "Distribusi", icon: "local_shipping" },
  { key: 7, label: "Selesai", icon: "verified" },
];

// ── Status badge config ───────────────────────────────────────
type KnownStatus =
  | "Belum Dimulai"
  | "Hewan Tiba"
  | "Penyembelihan"
  | "Pengulitan"
  | "Pemisahan daging & tulang"
  | "Pemotongan daging"
  | "Distribusi"
  | "Selesai";
const statusConfig: Record<KnownStatus, { label: string; pulse: boolean }> = {
  "Belum Dimulai": { label: "Status: Menunggu Dokumentasi", pulse: false },
  "Hewan Tiba": { label: "Status: Hewan Tiba", pulse: true },
  Penyembelihan: { label: "Status: Penyembelihan", pulse: true },
  Pengulitan: { label: "Status: Pengulitan", pulse: true },
  "Pemisahan daging & tulang": { label: "Status: Pemisahan daging & tulang", pulse: true },
  "Pemotongan daging": { label: "Status: Pemotongan daging", pulse: true },
  Distribusi: { label: "Status: Distribusi", pulse: true },
  Selesai: { label: "Status: Selesai", pulse: false },
};

// Species -> Google Maps shortlinks (per-user input)
const speciesMapLinks: Record<string, string> = {
  sapi: "https://maps.app.goo.gl/M1vNFF3WhLfNrqrZ8?g_st=ac",
  kambing: "https://maps.app.goo.gl/Xof8j5Lzdxxq3ATU7?g_st=ac",
};

function formatDocumentationTime(value: string | undefined) {
  if (!value) return "";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    hour12: false,
  }).format(parsedDate) + " WIB";
}

function getStageTimestamp(
  animal: Animal,
  stageLabel: StageTrackableStatus,
) {
  return formatDocumentationTime(animal.stageTimestamps?.[stageLabel]);
}

// ── Page component ────────────────────────────────────────────
export default async function HewanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Try Google Sheets first; fall back to mock data when env vars are unset
  let animal: Animal | null = null;
  try {
    animal = await fetchAnimalById(id);
  } catch {
    // Sheets not configured yet — fall through to mock
  }
  if (!animal) {
    animal = mockData[id.toUpperCase()] ?? null;
  }

  // ── 404-style fallback ──
  if (!animal) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-6">
        <span className="material-symbols-outlined text-7xl text-outline">
          search_off
        </span>
        <h1 className="font-headline text-4xl font-black text-primary">
          Hewan Tidak Ditemukan
        </h1>
        <p className="text-on-surface-variant max-w-sm">
          ID <span className="font-mono font-bold">#{id}</span> tidak ada dalam
          arsip. Periksa kembali ID yang Anda masukkan.
        </p>
        <Link
          href="/"
          className="px-8 py-3 bg-primary text-on-primary rounded-full font-bold text-sm"
        >
          Kembali ke Beranda
        </Link>
      </main>
    );
  }

  const statusCfg = statusConfig[animal.status as KnownStatus] ?? {
    label: `Status: ${animal.status}`,
    pulse: false,
  };
  const currentStage = animal.currentStage;
  const mapUrl = (animal as any).mapUrl ?? speciesMapLinks[(animal.species ?? "").toLowerCase()];

  return (
    <>
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 w-full glass-nav bg-[#fbf9f5]/70 shadow-[0_12px_32px_rgba(55,45,23,0.06)]">
        <nav className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 p-2 rounded-full hover:bg-surface-container-high transition-all text-primary-container"
              aria-label="Kembali ke beranda"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <span className="font-headline text-xl font-black text-primary-container hidden sm:block">
              Laporan Qurban Masjid Al-Mustadam
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-on-surface-variant font-mono hidden md:block">
              #{animal.id}
            </span>
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container/15 rounded-full text-xs font-black text-primary uppercase tracking-widest hover:bg-primary-container/25 transition-all"
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: '"FILL" 1' }}>
                mosque
              </span>
              Qurban 1447 H
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Main Content ── */}
      <main className="pt-8 px-6 lg:px-12 max-w-6xl mx-auto space-y-12 pb-32 lg:pb-24 w-full overflow-hidden sm:overflow-visible">
        {/* ── Hero: Animal Identification ── */}
        <section className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            {/* Left: Identity */}
            <div className="lg:col-span-7 space-y-4">
              {/* Status badge */}
              <div className="inline-flex items-center gap-2 bg-primary-container text-primary-fixed px-4 py-1.5 rounded-full text-sm font-bold tracking-widest uppercase">
                {statusCfg.pulse && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-surface-tint opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-fixed" />
                  </span>
                )}
                {statusCfg.label}
              </div>

              {/* Giant ID */}
              <h1 className="text-6xl md:text-8xl font-black text-primary tracking-tighter leading-none font-headline break-all sm:break-words">
                #{animal.id}
              </h1>

               {/* Animal name */}
               <h2 className="text-3xl md:text-4xl font-headline italic text-on-surface-variant">
                 {animal.name}
               </h2>

              <NotificationSubscribeButton
                token={animal.id}
                vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
              />
            </div>

            {/* Right: Animal photo */}
            <div className="lg:col-span-5 relative">
              <div className="aspect-4/3 rounded-3xl overflow-hidden shadow-2xl bg-surface-container-low relative">
                <div className="absolute inset-0 arabesque-pattern pointer-events-none z-10" />
                <img
                  alt={animal.name}
                  className="w-full h-full object-cover grayscale-20 hover:grayscale-0 transition-all duration-700"
                  src={animal.imageUrl}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Bento Grid: Shohibul + Stats ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Shohibul Qurban card */}
          <div className="md:col-span-2 w-full bg-surface-container-lowest rounded-3xl p-5 sm:p-8 relative overflow-hidden shadow-sm border border-outline-variant/10">
            <div className="absolute top-0 right-0 w-32 h-32 arabesque-pattern opacity-10 pointer-events-none" />
            <h3 className="text-xl sm:text-2xl font-headline mb-4 sm:mb-6 text-primary">
              Shohibul Qurban
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {(animal.shohibul as string[]).map((name: string, i: number) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-surface-container-low rounded-2xl"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, #003527 0%, #064e3b 100%)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <span className="font-semibold text-on-surface text-sm leading-snug break-words">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats cards */}
          <div className="space-y-6">
            {/* Weight */}
            <div className="bg-secondary-container text-on-secondary-container p-8 rounded-3xl shadow-sm">
              <span className="text-xs font-bold uppercase tracking-widest opacity-70">
                Estimasi Berat
              </span>
              <div className="text-4xl font-headline font-black mt-2">
                {animal.weight}
              </div>
              <p className="text-sm mt-2 opacity-80">
                Bobot hidup saat penimbangan terakhir di karantina.
              </p>
            </div>

            {/* Post-slaughter weight */}
            <div className="bg-primary text-primary-fixed p-8 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute -bottom-4 -right-4 text-primary-container opacity-20 transform rotate-12 pointer-events-none">
                <span className="material-symbols-outlined text-9xl">
                  scale
                </span>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest opacity-70">
                Berat Setelah Sembelih
              </span>
              {animal.weightPost ? (
                <div className="text-4xl font-headline font-black mt-2">
                  {animal.weightPost}
                </div>
              ) : (
                <p className="text-sm mt-2 opacity-60 italic">
                  Belum tersedia — akan diperbarui setelah proses penyembelihan.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Visual Journey / Timeline ── */}
        <section className="space-y-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-outline-variant/20 pb-4 gap-2">
            <h3 className="text-3xl font-headline text-primary">
              Perjalanan Ibadah
            </h3>
            <span className="text-sm font-bold text-secondary">
              {currentStage === 0
                ? "Belum ada tracking"
                : `Tahap ${currentStage} dari ${stages.length}`}
            </span>
          </div>

          <div className="w-full max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x pb-4">
            <div className="relative min-w-[760px] sm:min-w-[920px] md:min-w-[980px] pt-1 px-4 sm:px-6 lg:px-0">
              {/* Horizontal track */}
              <div className="absolute top-8 left-10 right-10 h-1 bg-surface-container-highest rounded-full" />

              <div className="grid grid-cols-7 gap-2 sm:gap-3 relative">
                {stages.map((stage) => {
                  const isDone = currentStage > 0 && stage.key < currentStage;
                  const isCurrent = currentStage > 0 && stage.key === currentStage;
                  const isLocked = currentStage === 0 || stage.key > currentStage;
                  const stageTime = getStageTimestamp(animal, stage.label);

                  return (
                    <div
                      key={stage.key}
                      className={[
                        "relative flex flex-col items-center",
                        isCurrent ? "z-10" : "",
                        isLocked ? "opacity-40" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {/* Stage icon circle */}
                      {isCurrent ? (
                        <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg animate-pulse border-4 border-primary-fixed mb-4">
                          <span className="material-symbols-outlined text-xl">
                            {stage.icon}
                          </span>
                        </div>
                      ) : isDone ? (
                        <div className="w-14 h-14 bg-secondary-container rounded-full flex items-center justify-center border-4 border-secondary-container mb-4 shadow-sm">
                          <span
                            className="material-symbols-outlined text-xl text-on-secondary-container"
                            style={{ fontVariationSettings: '"FILL" 1' }}
                          >
                            check_circle
                          </span>
                        </div>
                      ) : (
                        <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center border-4 border-transparent mb-4">
                          <span className="material-symbols-outlined text-xl text-outline">
                            {stage.icon}
                          </span>
                        </div>
                      )}

                      {/* Stage indicator */}
                      <div className="text-center">
                        <h4
                          className={[
                            "font-bold text-[10px] uppercase tracking-tighter leading-tight",
                            isCurrent
                              ? "text-primary"
                              : isDone
                                ? "text-secondary"
                                : "text-on-surface-variant",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {stage.label}
                        </h4>

                        {stageTime && isCurrent && (
                          <p className="text-[10px] font-bold text-primary mt-1">
                            {stageTime}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {currentStage === 0 && (
            <p className="text-xs text-on-surface-variant">
              Tracking akan dimulai setelah panitia mengirim dokumentasi pertama.
            </p>
          )}
        </section>

        {/* ── Location Footer ── */}
        <section className="bg-surface-container-low rounded-3xl sm:rounded-[3rem] p-6 sm:p-12 text-center space-y-4">
          <h3 className="text-2xl font-headline text-primary">
            Lokasi Pelaksanaan
          </h3>
          <p className="text-on-surface-variant max-w-xl mx-auto">
            {animal.location}. Fasilitas kami menerapkan standar kebersihan
            internasional dan protokol syariat ketat.
          </p>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary font-bold hover:opacity-70 transition-opacity"
              >
                <span className="material-symbols-outlined">location_on</span>
                Lihat di Peta
              </a>
            ) : (
              <div className="inline-flex items-center gap-2 text-primary font-bold opacity-60">
                <span className="material-symbols-outlined">location_on</span>
                Lihat di Peta
              </div>
            )}
            {animal.driveUrl && (
              <a
                href={animal.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-secondary font-bold hover:opacity-70 transition-opacity"
              >
                <span className="material-symbols-outlined">folder_open</span>
                Folder {animal.name || `Hewan-${animal.id}`}
              </a>
            )}
          </div>
        </section>
      </main>

      {/* ── Bottom Navigation Bar (Mobile Only) ── */}
      <footer className="fixed bottom-0 left-0 w-full z-50 lg:hidden px-6 pb-5 pt-2 pointer-events-none">
        <nav className="pointer-events-auto mx-auto max-w-sm glass-nav bg-[#fbf9f5]/85 rounded-2xl shadow-[0_-4px_24px_rgba(55,45,23,0.10)] border border-primary/5 p-1.5 flex gap-1.5">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 active:scale-95 text-on-surface-variant/60 hover:text-primary hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            <span className="text-xs uppercase tracking-widest font-black">
              Kembali
            </span>
          </Link>
          <button
            className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 active:scale-95 bg-primary-container text-on-primary shadow-md"
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              pets
            </span>
            <span className="text-xs uppercase tracking-widest font-black">
              Detail
            </span>
          </button>
        </nav>
      </footer>

      {/* ── Decorative Background Bleeds ── */}
      <div className="fixed top-0 right-0 w-1/3 h-full bg-surface-container-low -z-10 pointer-events-none opacity-40" />
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-primary-fixed/20 blur-[120px] -z-10 pointer-events-none" />
    </>
  );
}
