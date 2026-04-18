// ============================================================
// Arsip Suci – Homepage Client Component
// Receives real data from the server component (app/page.tsx).
// ============================================================
"use client";

import { useState, useMemo, useEffect, useRef } from "react";

// ── Count-up animation hook ──────────────────────────────────
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    if (target === 0) {
      setValue(0);
      return;
    }

    function step(timestamp: number) {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      // ease-out cubic for a satisfying deceleration
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

// ── Animated width hook (for progress bars) ──────────────────
function useAnimatedWidth(targetPercent: number, delay = 200) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(targetPercent), delay);
    return () => clearTimeout(timer);
  }, [targetPercent, delay]);

  return width;
}
import Link from "next/link";
import type { Animal, AnimalStatus, SummaryStats } from "@/lib/types";

// ── Per-status display config ─────────────────────────────────
const statusCfg: Record<
  AnimalStatus,
  {
    label: string;
    badgeCls: string;
    btnText: string;
    btnCls: string;
    pulse?: boolean;
  }
> = {
  Persiapan: {
    label: "Persiapan",
    badgeCls: "bg-surface-container-high text-primary",
    btnText: "Lihat Detail",
    btnCls:
      "border border-outline-variant hover:border-primary hover:text-primary",
  },
  Disembelih: {
    label: "Sudah Disembelih",
    badgeCls: "bg-surface-container-high text-primary",
    btnText: "Lihat Laporan",
    btnCls:
      "border border-outline-variant hover:border-primary hover:text-primary",
  },
  Pengolahan: {
    label: "Pengolahan",
    badgeCls: "bg-secondary-container text-on-secondary-container",
    btnText: "Lihat Laporan",
    btnCls:
      "border border-outline-variant hover:border-primary hover:text-primary",
    pulse: true,
  },
  Distribusi: {
    label: "Distribusi",
    badgeCls: "bg-primary-fixed text-on-primary-fixed-variant",
    btnText: "Lihat Laporan",
    btnCls:
      "border border-outline-variant hover:border-primary hover:text-primary",
    pulse: true,
  },
  Selesai: {
    label: "Selesai",
    badgeCls: "bg-primary text-on-primary",
    btnText: "Lihat Laporan",
    btnCls: "bg-primary text-on-primary hover:bg-primary-container",
  },
};

// Status → progress bar width % (5 stages)
const STATUS_PERCENT: Record<AnimalStatus, number> = {
  Persiapan: 20,
  Disembelih: 40,
  Pengolahan: 60,
  Distribusi: 80,
  Selesai: 100,
};

// Species → Material Symbol icon with distinct visual per type
function SpeciesIcon({ species }: { species: string; className?: string }) {
  // Map each animal to a visually distinct Material Symbols icon
  const iconMap: Record<string, { icon: string; label: string }> = {
    Sapi: { icon: "agriculture", label: "Sapi" },         // barn/farm → Sapi
    Kambing: { icon: "landscape", label: "Kambing" },      // mountain → Kambing gunung
    Domba: { icon: "cloud", label: "Domba" },              // cloud/wool → Domba
  };
  const { icon, label } = iconMap[species] ?? { icon: "pets", label: species };
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="material-symbols-outlined text-primary text-2xl"
        style={{ fontVariationSettings: '"FILL" 1' }}
      >
        {icon}
      </span>
      <span className="text-[9px] font-black text-primary uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

// ── Card for one animal ───────────────────────────────────────
function AnimalCard({ animal }: { animal: Animal }) {
  const cfg = statusCfg[animal.status] ?? {
    label: animal.status,
    badgeCls: "bg-surface-container-high text-primary",
    btnText: "Lihat Detail",
    btnCls:
      "border border-outline-variant hover:border-primary hover:text-primary",
  };
  const isCompleted = animal.status === "Selesai";
  const targetPercent = STATUS_PERCENT[animal.status] ?? 20;
  const animatedWidth = useAnimatedWidth(targetPercent, 300);

  return (
    <div
      className={`rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden ${
        isCompleted
          ? "bg-primary-fixed/30 border border-primary/5"
          : "bg-surface-container-lowest hover:shadow-[0_12px_32px_rgba(55,45,23,0.08)]"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-8">
        {/* Identity */}
        <div className="flex items-center gap-4 min-w-50">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
              isCompleted
                ? "bg-surface-container-lowest"
                : "bg-surface-container-low"
            }`}
          >
            <SpeciesIcon species={animal.species} className="text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-primary">#{animal.id}</h4>
            <p className="text-sm font-semibold text-on-surface-variant">
              {animal.name}
            </p>
          </div>
        </div>

        {/* Progress track */}
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div className="flex-1 h-3 bg-surface-container-low rounded-full relative overflow-hidden">
            <div
              className={`h-full rounded-full relative transition-all duration-1000 ease-out ${
                isCompleted ? "bg-primary" : "bg-secondary"
              }`}
              style={{ width: `${animatedWidth}%` }}
            >
              {!isCompleted && (
                <div
                  className={`absolute -right-2 -top-1 w-5 h-5 bg-secondary border-4 border-white rounded-full shadow-sm ${
                    cfg.pulse ? "animate-pulse" : ""
                  }`}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end min-w-35">
            <span
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-lg ${cfg.badgeCls}`}
            >
              {cfg.label}
            </span>
            {animal.completedTime && (
              <span className="text-[10px] text-on-surface-variant font-medium">
                Selesai pukul {animal.completedTime}
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/hewan/${animal.id}`}
          className={`px-6 py-3 transition-all rounded-xl font-bold text-sm shrink-0 ${cfg.btnCls}`}
        >
          {cfg.btnText}
        </Link>
      </div>
    </div>
  );
}

// ── Main client component ─────────────────────────────────────
interface Props {
  animals: Animal[];
  stats: SummaryStats;
}

export default function HomePageClient({ animals, stats }: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterID, setFilterID] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Unique species for filter dropdown
  const speciesList = useMemo(
    () => [...new Set(animals.map((a) => a.species))].sort(),
    [animals],
  );

  // Unique locations for filter dropdown
  const locationList = useMemo(
    () => [...new Set(animals.map((a) => a.location).filter(Boolean))].sort(),
    [animals],
  );

  const [filterLokasi, setFilterLokasi] = useState("");

  const filtered = useMemo(() => {
    return animals.filter((a) => {
      if (
        filterID &&
        !a.id.toLowerCase().includes(filterID.toLowerCase().replace(/^#/, ""))
      )
        return false;
      if (filterJenis && a.species !== filterJenis) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterLokasi && a.location !== filterLokasi) return false;
      return true;
    });
  }, [animals, filterID, filterJenis, filterStatus, filterLokasi]);

  function resetFilters() {
    setFilterID("");
    setFilterJenis("");
    setFilterStatus("");
    setFilterLokasi("");
    setFilterOpen(false);
  }

  return (
    <>
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 w-full glass-nav bg-[#fbf9f5]/70 shadow-[0_12px_32px_rgba(55,45,23,0.06)]">
        <nav className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-8">
            <span className="font-headline text-2xl font-black text-primary-container">
              Laporan Qurban Masjid Al-Mustadam
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center bg-surface-container-low rounded-full px-4 py-2">
              <span className="material-symbols-outlined text-outline">
                search
              </span>
              <input
                className="bg-transparent border-none focus:outline-none text-sm font-medium w-48 ml-2 text-on-surface placeholder:text-on-surface-variant"
                placeholder="Cari ID (misal #C101)"
                type="text"
                value={filterID}
                onChange={(e) => setFilterID(e.target.value)}
              />
            </div>
            <button className="p-2 rounded-full hover:bg-surface-container-high transition-all">
              <span className="material-symbols-outlined text-primary-container">
                notifications
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* ── Layout: Sidebar + Main ── */}
      <div className="flex flex-1 max-w-screen-2xl w-full mx-auto relative">
        {/* ── Sidebar (Desktop Only) ── */}
        <aside className="hidden lg:flex flex-col h-[calc(100vh-80px)] w-72 py-8 gap-2 bg-surface-container-low sticky top-20">
          <div className="px-6 mb-6">
            <h2 className="font-headline text-xl text-primary-container font-bold">
              Live Report
            </h2>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mt-1">
              Qurban 1447 H
            </p>
          </div>
          <nav className="flex flex-col gap-1">
            {/* Dashboard — show all */}
            <button
              onClick={resetFilters}
              className={`flex items-center gap-3 text-sm font-semibold px-4 py-3 rounded-xl transition-all text-left ml-4 mr-2 mb-1 ${
                !filterStatus && !filterID && !filterJenis && !filterLokasi
                  ? "bg-surface-container-lowest text-primary-container shadow-sm"
                  : "text-on-surface/70 hover:translate-x-1 hover:bg-surface-container-lowest/50"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={
                  !filterStatus && !filterID && !filterJenis && !filterLokasi
                    ? { fontVariationSettings: '"FILL" 1' }
                    : undefined
                }
              >
                dashboard
              </span>
              <span>Dashboard</span>
              <span className="ml-auto text-[10px] font-black text-on-surface-variant">
                {animals.length}
              </span>
            </button>
            {(
              [
                {
                  icon: "settings",
                  label: "Sedang Diproses",
                  status: "Persiapan",
                },
                {
                  icon: "content_cut",
                  label: "Sudah Disembelih",
                  status: "Disembelih",
                },
                {
                  icon: "conveyor_belt",
                  label: "Pengolahan",
                  status: "Pengolahan",
                },
                {
                  icon: "local_shipping",
                  label: "Distribusi",
                  status: "Distribusi",
                },
                { icon: "verified", label: "Selesai", status: "Selesai" },
              ] as { icon: string; label: string; status: AnimalStatus }[]
            ).map(({ icon, label, status }) => {
              const isActive = filterStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(isActive ? "" : status)}
                  className={`flex items-center gap-3 text-sm font-semibold px-4 py-3 rounded-xl transition-all text-left ${
                    isActive
                      ? "bg-surface-container-lowest text-primary-container shadow-sm ml-4 mr-2"
                      : "text-on-surface/70 ml-4 mr-2 hover:translate-x-1 hover:bg-surface-container-lowest/50"
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={
                      isActive
                        ? { fontVariationSettings: '"FILL" 1' }
                        : undefined
                    }
                  >
                    {icon}
                  </span>
                  <span>{label}</span>
                  <span className="ml-auto text-[10px] font-black text-on-surface-variant">
                    {animals.filter((a) => a.status === status).length}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-x-hidden">
          {/* ── Hero ── */}
          <section className="mb-12 relative">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-bold text-xs uppercase tracking-widest mb-4">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  LIVE
                </span>
                <h1 className="font-headline text-5xl md:text-6xl font-black text-primary leading-tight mb-4">
                  Tagline <span className="italic text-secondary">Qurban</span>
                </h1>
                <p className="text-lg text-on-surface-variant max-w-lg leading-relaxed">
                  deskripsi .... ..
                </p>
              </div>
              <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-2xl">
                <button className="px-6 py-2 bg-surface-container-lowest text-primary font-bold rounded-xl shadow-sm text-sm">
                  Laporan Langsung
                </button>
                <button className="px-6 py-2 text-on-surface-variant font-semibold text-sm hover:text-primary transition-colors">
                  Tentang Qurban
                </button>
              </div>
            </div>
          </section>

          {/* ── Quick Stats Bento Grid ── */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {/* Total Animals */}
            <div className="bg-surface-container-lowest p-8 rounded-2xl relative overflow-hidden arabesque-pattern">
              <div className="relative z-10">
                <span className="text-secondary font-black text-4xl mb-1 block tabular-nums">
                  {useCountUp(stats.totalAnimals).toLocaleString("id-ID")}
                </span>
                <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">
                  Total Hewan
                </h3>
                <div className="mt-6 flex flex-wrap gap-2">
                  {["Sapi", "Kambing", "Domba"].map((sp) => {
                    const count = animals.filter(
                      (a) => a.species === sp,
                    ).length;
                    if (!count) return null;
                    return (
                      <span
                        key={sp}
                        className="text-xs font-semibold px-2 py-1 bg-surface-container-low rounded-lg"
                      >
                        {count} {sp}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-primary-container p-8 rounded-2xl relative overflow-hidden">
              <div className="relative z-10 text-on-primary">
                <span className="text-primary-fixed font-black text-4xl mb-1 block tabular-nums">
                  {useCountUp(stats.progressPercent)}%
                </span>
                <h3 className="text-sm font-bold opacity-70 uppercase tracking-widest">
                  Kemajuan Pelaksanaan
                </h3>
                <div className="mt-6 w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary-container rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${useAnimatedWidth(stats.progressPercent, 400)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Weight */}
            <div className="bg-secondary-container p-8 rounded-2xl relative overflow-hidden">
              <div className="relative z-10 text-on-secondary-container">
                <span className="font-black text-4xl mb-1 block tabular-nums">
                  {useCountUp(stats.totalWeightKg).toLocaleString("id-ID")} kg
                </span>
                <h3 className="text-sm font-bold opacity-80 uppercase tracking-widest">
                  Estimasi Total Berat
                </h3>
                <div className="mt-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">
                    scale
                  </span>
                  <span className="text-xs font-bold">
                    {stats.completedAnimals} hewan selesai distribusi
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Status Tracker List ── */}
          <section className="space-y-6">
            {/* Section header */}
            <div className="flex items-center justify-between px-2">
              <h2 className="font-headline text-2xl font-bold text-primary">
                Pelacak Status
                {(filterID || filterJenis || filterStatus || filterLokasi) && (
                  <span className="ml-3 text-sm font-body font-semibold text-secondary">
                    {filtered.length} hasil
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-on-surface-variant">
                  Urutkan:{" "}
                  <span className="text-primary font-bold">Terbaru</span>
                </span>
                <button
                  onClick={() => setFilterOpen((v) => !v)}
                  aria-expanded={filterOpen}
                  aria-label="Toggle filter panel"
                  className={`p-2 rounded-xl transition-all ${
                    filterOpen
                      ? "bg-primary text-on-primary"
                      : "text-outline hover:text-primary hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {filterOpen ? "filter_list_off" : "tune"}
                  </span>
                </button>
              </div>
            </div>

            {/* ── Collapsible Filter Panel ── */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                filterOpen ? "max-h-150 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="p-6 bg-surface-container-lowest rounded-2xl shadow-[0_8px_24px_rgba(55,45,23,0.04)] border border-primary/5">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">
                      filter_list
                    </span>
                    <h3 className="font-headline font-bold text-primary">
                      Filter Pencarian
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Animal ID */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant ml-1">
                        ID Hewan
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                          tag
                        </span>
                        <input
                          className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-outline"
                          placeholder="Contoh: C101"
                          type="text"
                          value={filterID}
                          onChange={(e) => setFilterID(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Animal Type */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant ml-1">
                        Jenis Hewan
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-surface-container-low border-none rounded-xl py-3 px-4 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                          value={filterJenis}
                          onChange={(e) => setFilterJenis(e.target.value)}
                        >
                          <option value="">Semua Jenis</option>
                          {speciesList.map((sp) => (
                            <option key={sp} value={sp}>
                              {sp}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant ml-1">
                        Status
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-surface-container-low border-none rounded-xl py-3 px-4 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="">Semua Status</option>
                          <option value="Persiapan">Sedang Diproses</option>
                          <option value="Disembelih">Sudah Disembelih</option>
                          <option value="Pengolahan">Pengolahan</option>
                          <option value="Distribusi">Distribusi</option>
                          <option value="Selesai">Selesai</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant ml-1">
                        Lokasi
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-surface-container-low border-none rounded-xl py-3 px-4 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                          value={filterLokasi}
                          onChange={(e) => setFilterLokasi(e.target.value)}
                        >
                          <option value="">Semua Lokasi</option>
                          {locationList.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-surface-variant/50">
                    <button
                      onClick={resetFilters}
                      className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors"
                    >
                      Reset Filter
                    </button>
                    <button
                      onClick={() => setFilterOpen(false)}
                      className="flex items-center gap-2 px-6 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary-container transition-all active:scale-95 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">
                        check
                      </span>
                      Terapkan Filter
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Animal Cards ── */}
            {filtered.length === 0 ? (
              <div className="py-24 flex flex-col items-center gap-4 text-center">
                <span className="material-symbols-outlined text-5xl text-outline">
                  search_off
                </span>
                <p className="text-on-surface-variant font-semibold">
                  Tidak ada hewan yang cocok dengan filter ini.
                </p>
                <button
                  onClick={resetFilters}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              filtered.map((animal) => (
                <AnimalCard key={animal.id} animal={animal} />
              ))
            )}
          </section>

          {/* ── Load More placeholder ── */}
          <div className="mt-12 mb-24 lg:mb-0 flex justify-center">
            <button className="px-12 py-4 bg-surface-container-low hover:bg-surface-container-high text-primary font-black uppercase tracking-widest text-xs rounded-full transition-all">
              Muat Lebih Banyak Catatan
            </button>
          </div>
        </main>
      </div>

      {/* ── Bottom Navigation Bar (Mobile Only) ── */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-end px-6 pb-6 lg:hidden glass-nav bg-[#fbf9f5]/80">
        <button className="flex flex-col items-center justify-center bg-primary-container text-on-primary rounded-2xl p-3 mb-2 scale-110 shadow-lg">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            sensors
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold mt-1">
            Laporan
          </span>
        </button>
        {[
          { icon: "stars", label: "Kurban Saya" },
          { icon: "search", label: "Cari" },
          { icon: "diversity_1", label: "Dampak" },
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
