"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ScanResponse = {
  success: boolean;
  message: string;
  nim: string;
  barcode: string;
  timestamp: string;
  displayTimestamp: string;
  weekKey: string;
};

type Notice = {
  type: "success" | "error";
  text: string;
};

function getNextMondayMidnight(now = new Date()) {
  const next = new Date(now);
  const currentDay = next.getDay();
  const daysUntilMonday = currentDay === 1 ? 7 : (8 - currentDay) % 7;

  next.setDate(next.getDate() + daysUntilMonday);
  next.setHours(0, 0, 0, 0);

  return next;
}

function formatWeekLabel(date = new Date()) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
  }).format(date);
}

function playSuccessSound() {
  if (typeof window === "undefined") return;

  const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.0001;
  gainNode.connect(audioContext.destination);

  const oscillator = audioContext.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.value = 880;
  oscillator.connect(gainNode);

  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.16);
  oscillator.stop(audioContext.currentTime + 0.18);

  window.setTimeout(() => {
    audioContext.close().catch(() => undefined);
  }, 250);
}

function normalizeBarcodeInput(value: string) {
  return value.trim();
}

export default function AcaraPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [barcode, setBarcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [lastScan, setLastScan] = useState<ScanResponse | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResponse[]>([]);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const weekLabel = useMemo(() => formatWeekLabel(), []);

  useEffect(() => {
    const storedAuth = window.sessionStorage.getItem("acara-auth") === "1";
    setAuthenticated(storedAuth);
  }, []);

  useEffect(() => {
    if (authenticated) {
      barcodeInputRef.current?.focus();
    } else {
      passwordInputRef.current?.focus();
    }
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;

    const timeoutId = window.setTimeout(() => {
      window.location.reload();
    }, getNextMondayMidnight().getTime() - Date.now());

    return () => window.clearTimeout(timeoutId);
  }, [authenticated]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const showNotice = (type: Notice["type"], text: string) => {
    setNotice({ type, text });
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const response = await fetch("/api/acara/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Login gagal");
      }

      window.sessionStorage.setItem("acara-auth", "1");
      setAuthenticated(true);
      setPassword("");
      showNotice("success", "Login berhasil.");
    } catch (error) {
      showNotice(
        "error",
        error instanceof Error ? error.message : "Login gagal",
      );
    }
  };

  const handleScan = async () => {
    const normalizedBarcode = normalizeBarcodeInput(barcode);

    if (!normalizedBarcode) {
      showNotice("error", "Barcode belum diisi.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/acara/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: normalizedBarcode }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Scan gagal");
      }

      const result = data as ScanResponse;
      setLastScan(result);
      setScanHistory((currentHistory) => [result, ...currentHistory].slice(0, 5));
      setBarcode("");
      playSuccessSound();
      showNotice("success", `${result.nim} berhasil dicatat.`);

      window.setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 0);
    } catch (error) {
      showNotice(
        "error",
        error instanceof Error ? error.message : "Scan gagal",
      );
      barcodeInputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem("acara-auth");
    setAuthenticated(false);
    setBarcode("");
    setPassword("");
    setLastScan(null);
    setScanHistory([]);
    showNotice("success", "Logout berhasil.");
  };

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7_0%,_#f8fafc_40%,_#ecfeff_100%)] px-4 py-10 text-slate-900">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
          <form
            onSubmit={handleLogin}
            className="w-full space-y-6 rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur"
          >
            <div className="space-y-2 text-center">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
                Acara Access
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">
                Login Acara
              </h1>
              <p className="text-sm text-slate-600">
                Password sama seperti panit, dibaca dari tab Password di spreadsheet.
              </p>
            </div>

            {notice && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm font-medium ${notice.type === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-rose-200 bg-rose-50 text-rose-800"
                  }`}
              >
                {notice.text}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                ref={passwordInputRef}
                type="password"
                name="password"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                placeholder="******"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-slate-800"
            >
              Masuk
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_45%,_#ffffff_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {notice && (
          <div
            className={`fixed right-4 top-4 z-50 rounded-2xl px-4 py-3 shadow-lg ${notice.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
              }`}
          >
            <p className="text-sm font-semibold">{notice.text}</p>
          </div>
        )}

        <section className="mb-6 rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
                Acara Scan
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Scan Barcode Masuk
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Barcode dibaca dari scanner, diverifikasi ke database NIM, lalu
                disimpan ke tab makan jika belum pernah dipakai pada pekan ini.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                  Pekan Aktif
                </div>
                <div className="mt-1 font-semibold text-slate-900">{weekLabel}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Logout
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-4 lg:col-span-7">
            <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Barcode Scanner Input
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleScan();
                  }
                }}
                placeholder="Contoh: 9#556416#2026-05-22#288245"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-semibold tracking-wide text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleScan()}
                  disabled={isSubmitting}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Memproses..." : "Proses Scan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBarcode("");
                    setNotice(null);
                    barcodeInputRef.current?.focus();
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Bersihkan
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[2rem] border border-white/80 bg-emerald-50 p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">
                  Barcode Format
                </p>
                <p className="mt-3 text-sm leading-7 text-emerald-900">
                  <span className="font-semibold">angka random</span>#
                  <span className="font-semibold">nim</span>#
                  <span className="font-semibold">tanggal</span>#
                  <span className="font-semibold">6 digit random</span>
                </p>
                <p className="mt-2 text-sm text-emerald-900/80">
                  Contoh: 9#556416#2026-05-22#288245
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/80 bg-sky-50 p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-700">
                  Aturan Validasi
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-sky-900">
                  <li>1. NIM harus ada di database.</li>
                  <li>2. NIM yang sama hanya boleh sekali per pekan.</li>
                  <li>3. Pekan dihitung Senin 00.00 sampai Ahad 23.59 WIB.</li>
                </ul>
              </div>
            </div>
          </section>

          <aside className="space-y-6 lg:col-span-5">
            <div className="rounded-[2rem] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-300">
                Hasil Terakhir
              </p>
              {lastScan ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="text-5xl font-black tracking-tight text-emerald-300">
                      {lastScan.nim}
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                      Tersimpan pada {lastScan.displayTimestamp}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 text-sm leading-6 text-slate-100">
                    {lastScan.message}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  Belum ada scan. Arahkan scanner ke kolom barcode lalu tekan Enter.
                </p>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
                Riwayat 5 Scan Terakhir
              </p>
              <div className="mt-4 space-y-3">
                {scanHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Riwayat akan muncul setelah scan berhasil.
                  </p>
                ) : (
                  scanHistory.map((entry, index) => (
                    <div
                      key={`${entry.nim}-${entry.timestamp}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold text-slate-950">{entry.nim}</div>
                        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">
                          Sukses
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {entry.displayTimestamp}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}