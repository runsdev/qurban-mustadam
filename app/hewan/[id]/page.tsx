// ============================================================
// Arsip Suci – Animal Detail Page
// Design System: "The Sacred Archive" / "The Ethereal Legacy"
// ============================================================
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { fetchAnimalById } from "@/lib/sheets";
import type { Animal } from "@/lib/types";

// ── Fallback mock data (used when Google Sheets env vars are not set) ─
const mockData: Record<string, Animal> = {
  C101: {
    id: "C101",
    name: "Sapi Brahman (XL)",
    species: "Sapi",
    status: "Persiapan",
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
    status: "Pengolahan",
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
    currentStage: 5,
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
    status: "Disembelih",
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
const stages = [
  { key: 1, label: "Persiapan", icon: "settings", time: "08:00 WIB" },
  { key: 2, label: "Disembelih", icon: "content_cut", time: "09:15 WIB" },
  {
    key: 3,
    label: "Pengolahan",
    icon: "conveyor_belt",
    time: "Sedang Berlangsung",
  },
  { key: 4, label: "Distribusi", icon: "local_shipping", time: "" },
  { key: 5, label: "Selesai", icon: "verified", time: "" },
];

// ── Status badge config ───────────────────────────────────────
type KnownStatus =
  | "Persiapan"
  | "Disembelih"
  | "Pengolahan"
  | "Distribusi"
  | "Selesai";
const statusConfig: Record<KnownStatus, { label: string; pulse: boolean }> = {
  Persiapan: { label: "Status: Persiapan", pulse: true },
  Pengolahan: { label: "Status: Pengolahan", pulse: true },
  Distribusi: { label: "Status: Distribusi", pulse: true },
  Selesai: { label: "Status: Selesai", pulse: false },
  Disembelih: { label: "Status: Disembelih", pulse: false },
};

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
            <button className="p-2 rounded-full hover:bg-surface-container-high transition-all">
              <span className="material-symbols-outlined text-primary-container">
                share
              </span>
            </button>
            <button className="p-2 rounded-full hover:bg-surface-container-high transition-all">
              <span className="material-symbols-outlined text-primary-container">
                notifications
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* ── Main Content ── */}
      <main className="pt-8 px-6 lg:px-12 max-w-6xl mx-auto space-y-12 pb-32 lg:pb-24">
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
              <h1 className="text-6xl md:text-8xl font-black text-primary tracking-tighter leading-none font-headline">
                #{animal.id}
              </h1>

              {/* Animal name */}
              <h2 className="text-3xl md:text-4xl font-headline italic text-on-surface-variant">
                {animal.name}
              </h2>
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
          <div className="md:col-span-2 bg-surface-container-lowest rounded-3xl p-8 relative overflow-hidden shadow-sm border border-outline-variant/10">
            <div className="absolute top-0 right-0 w-32 h-32 arabesque-pattern opacity-10 pointer-events-none" />
            <h3 className="text-2xl font-headline mb-6 text-primary">
              Shohibul Qurban
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(animal.shohibul as string[]).map((name: string, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl"
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
                  <span className="font-semibold text-on-surface text-sm">
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
        <section className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-outline-variant/20 pb-4">
            <h3 className="text-3xl font-headline text-primary">
              Perjalanan Ibadah
            </h3>
            <span className="text-sm font-bold text-secondary">
              Tahap {currentStage} dari 5
            </span>
          </div>

          <div className="relative">
            {/* Horizontal track (desktop) */}
            <div className="absolute top-7 left-0 w-full h-1 bg-surface-container-highest rounded-full hidden md:block" />

            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 relative">
              {stages.map((stage) => {
                const isDone = stage.key < currentStage;
                const isCurrent = stage.key === currentStage;
                const isLocked = stage.key > currentStage;

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
                          "font-bold text-xs uppercase tracking-tighter",
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

                      {stage.time && isCurrent && (
                        <p className="text-[10px] font-bold text-primary mt-1">
                          {stage.time}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Location Footer ── */}
        <section className="bg-surface-container-low rounded-[3rem] p-12 text-center space-y-4">
          <h3 className="text-2xl font-headline text-primary">
            Lokasi Pelaksanaan
          </h3>
          <p className="text-on-surface-variant max-w-xl mx-auto">
            {animal.location}. Fasilitas kami menerapkan standar kebersihan
            internasional dan protokol syariat ketat.
          </p>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="inline-flex items-center gap-2 text-primary font-bold cursor-pointer hover:opacity-70 transition-opacity">
              <span className="material-symbols-outlined">location_on</span>
              Lihat di Peta
            </div>
            {animal.driveUrl && (
              <a
                href={animal.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-secondary font-bold hover:opacity-70 transition-opacity"
              >
                <span className="material-symbols-outlined">folder_open</span>
                Arsip Dokumentasi (Drive)
              </a>
            )}
          </div>
        </section>
      </main>

      {/* ── Bottom Navigation Bar (Mobile Only) ── */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-end px-6 pb-6 lg:hidden glass-nav bg-[#fbf9f5]/80">
        <Link
          href="/"
          className="flex flex-col items-center justify-center text-primary-container/50 p-2 hover:opacity-80 active:scale-90 transition-all"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-[10px] uppercase tracking-widest font-bold mt-1">
            Kembali
          </span>
        </Link>
        <button className="flex flex-col items-center justify-center bg-primary-container text-on-primary rounded-2xl p-3 mb-2 scale-110 shadow-lg">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            pets
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold mt-1">
            Detail
          </span>
        </button>
        {[
          { icon: "share", label: "Bagikan" },
          { icon: "download", label: "Unduh" },
        ].map(({ icon, label }) => (
          <button
            key={label}
            className="flex flex-col items-center justify-center text-primary-container/50 p-2 hover:opacity-80 active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined">{icon}</span>
            <span className="text-[10px] uppercase tracking-widest font-bold mt-1">
              {label}
            </span>
          </button>
        ))}
      </footer>

      {/* ── Decorative Background Bleeds ── */}
      <div className="fixed top-0 right-0 w-1/3 h-full bg-surface-container-low -z-10 pointer-events-none opacity-40" />
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-primary-fixed/20 blur-[120px] -z-10 pointer-events-none" />
    </>
  );
}
