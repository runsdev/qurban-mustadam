"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import tvSisaPorsiBg from "../../design/TV Sisa Porsi.png";

type ScanResponse = {
  success: boolean;
  message: string;
  nim: string;
  barcode: string;
  scanMode?: "regular" | "qurtek";
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
  gainNode.gain.exponentialRampToValueAtTime(0.28, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.16);
  oscillator.stop(audioContext.currentTime + 0.18);

  window.setTimeout(() => {
    audioContext.close().catch(() => undefined);
  }, 250);
}

function normalizeBarcodeInput(value: string) {
  return value.trim();
}

const supportedBarcodeFormats = [
  "qr_code",
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "itf",
  "pdf417",
] as const;

type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

export default function AcaraPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [lastScan, setLastScan] = useState<ScanResponse | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResponse[]>([]);
  const [scanMode, setScanMode] = useState<"regular" | "qurtek">("regular");

  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const scanModeRef = useRef<"regular" | "qurtek">("regular");
  const scanFrameRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const lastDetectedValueRef = useRef<string>("");

  const weekLabel = useMemo(() => formatWeekLabel(), []);

  useEffect(() => {
    scanModeRef.current = scanMode;
  }, [scanMode]);

  const stopCamera = () => {
    if (scanFrameRef.current !== null) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }

    setCameraReady(false);
  };

  const submitDetectedBarcode = async (rawValue: string) => {
    const normalizedBarcode = normalizeBarcodeInput(rawValue);

    if (!normalizedBarcode || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/acara/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: normalizedBarcode,
          scanMode: scanModeRef.current,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Scan gagal");
      }

      const result = data as ScanResponse;
      setLastScan(result);
      setScanHistory((currentHistory) => [result, ...currentHistory].slice(0, 5));
      playSuccessSound();
      const modeLabel = result.scanMode === "qurtek" ? "Panitia Qurtek" : "Reguler";
      showNotice("success", `${result.nim} berhasil dicatat (${modeLabel}).`);
      lastDetectedValueRef.current = normalizedBarcode;

      window.setTimeout(() => {
        lastDetectedValueRef.current = "";
      }, 2200);
    } catch (error) {
      showNotice(
        "error",
        error instanceof Error ? error.message : "Scan gagal",
      );
    } finally {
      setIsSubmitting(false);
      processingRef.current = false;
    }
  };

  const startBarcodeScanner = async () => {
    if (typeof window === "undefined") return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerSupported(false);
      setCameraError("Browser ini tidak mendukung akses kamera.");
      return;
    }

    const BarcodeDetectorCtor = (window as Window & {
      BarcodeDetector?: new (options: { formats: readonly string[] }) => BarcodeDetectorInstance;
    }).BarcodeDetector;

    if (!BarcodeDetectorCtor) {
      setScannerSupported(false);
      setCameraError("Browser ini belum mendukung pemindai QR/barcode bawaan.");
      return;
    }

    try {
      setCameraError(null);
      stopCamera();

      const detector = new BarcodeDetectorCtor({ formats: supportedBarcodeFormats });
      detectorRef.current = detector;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        throw new Error("Elemen kamera tidak ditemukan.");
      }

      video.srcObject = stream;
      await video.play();
      setCameraReady(true);

      const scanLoop = async () => {
        if (!detectorRef.current || !videoRef.current || !streamRef.current) {
          return;
        }

        if (!processingRef.current && videoRef.current.readyState >= 2) {
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current);
            const detectedValue = barcodes[0]?.rawValue?.trim() ?? "";

            if (detectedValue && detectedValue !== lastDetectedValueRef.current) {
              await submitDetectedBarcode(detectedValue);
            }
          } catch {
            // Ignore transient detection errors while camera is initializing.
          }
        }

        scanFrameRef.current = requestAnimationFrame(scanLoop);
      };

      scanFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : "Gagal menyalakan kamera.",
      );
      setCameraReady(false);
      stopCamera();
    }
  };

  useEffect(() => {
    const storedAuth = window.sessionStorage.getItem("acara-auth") === "1";
    setAuthenticated(storedAuth);
  }, []);

  useEffect(() => {
    if (authenticated) {
      void startBarcodeScanner();
    } else {
      passwordInputRef.current?.focus();
    }
    return () => {
      stopCamera();
    };
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

  const [showPorsiModal, setShowPorsiModal] = useState(false);
  const [porsiInfo, setPorsiInfo] = useState<string | number | null>(null);

  const fetchPorsi = useCallback(async () => {
    try {
      const res = await fetch("/api/acara/porsi", { cache: "no-store" });
      const data = await res.json();
      setPorsiInfo(typeof data.porsi === "number" || typeof data.porsi === "string" ? data.porsi : null);
    } catch {
      setPorsiInfo(null);
    }
  }, []);

  useEffect(() => {
    if (!showPorsiModal) {
      return;
    }

    void fetchPorsi();
    const intervalId = window.setInterval(() => {
      void fetchPorsi();
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [fetchPorsi, showPorsiModal]);

  const handleLogout = () => {
    window.sessionStorage.removeItem("acara-auth");
    setAuthenticated(false);
    setPassword("");
    setLastScan(null);
    setScanHistory([]);
    setCameraError(null);
    showNotice("success", "Logout berhasil.");
    stopCamera();
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
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPorsiModal(true);
                  fetchPorsi();
                }}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:border-amber-300 hover:text-amber-900"
              >
                Lihat Porsi
              </button>
              <button
                type="button"
                onClick={() => setScanMode((current) => (current === "regular" ? "qurtek" : "regular"))}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${scanMode === "qurtek"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-800 hover:border-indigo-400"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900"
                  }`}
              >
                Mode Scan: {scanMode === "qurtek" ? "Panitia Qurtek" : "Reguler"}
              </button>
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
            <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-slate-950">Kamera Scanner</h2>
                  <button
                    type="button"
                    onClick={() => void startBarcodeScanner()}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Restart Kamera
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-4">
                <div className="relative aspect-video overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-56 w-56 rounded-[2rem] border-2 border-dashed border-emerald-400/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 px-6 py-5">
                {cameraError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {cameraError}
                  </div>
                ) : (
                  <div className={`rounded-2xl px-4 py-3 text-sm ${cameraReady ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "border border-amber-200 bg-amber-50 text-amber-800"}`}>
                    {scannerSupported
                      ? cameraReady
                        ? scanMode === "qurtek"
                          ? "Kamera aktif. Mode Panitia Qurtek: scan akan dicatat tanpa mengurangi sisa porsi."
                          : "Kamera aktif. Mode Reguler: scan akan mengurangi sisa porsi."
                        : "Menyalakan kamera..."
                      : "Browser tidak mendukung pemindai kamera bawaan."}
                  </div>
                )}
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
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                      {lastScan.scanMode === "qurtek" ? "Panitia Qurtek" : "Reguler"}
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

      {showPorsiModal && (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-black">
          <div className="relative h-full w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tvSisaPorsiBg.src}
              alt="TV Sisa Porsi"
              className="h-full w-full object-cover object-center"
            />

            <button
              type="button"
              onClick={() => setShowPorsiModal(false)}
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[#d6ad48] bg-[rgba(255,248,233,0.95)] text-[#5d4318] shadow-[0_10px_30px_rgba(90,58,16,0.18)] transition hover:bg-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="absolute left-[32%] top-[40%] z-10 w-[52%] text-left sm:left-[32%] sm:w-[50%] lg:left-[32%] lg:w-[47%]">
              <div className="font-black leading-none tracking-[-0.06em] text-[#7a4d1c] [font-variant-numeric:tabular-nums] [text-shadow:0_2px_0_rgba(255,247,232,0.96),0_8px_20px_rgba(111,73,23,0.18)] text-[clamp(3.1rem,5.8vw,5.8rem)] sm:text-[clamp(3.5rem,6vw,6.8rem)] lg:text-[clamp(3.8rem,6.2vw,7.4rem)]">
                Sisa Porsi
              </div>
              <div className="mt-2 whitespace-nowrap font-black leading-none tracking-[-0.06em] text-[#7a4d1c] [font-variant-numeric:tabular-nums] [text-shadow:0_2px_0_rgba(255,247,232,0.96),0_8px_20px_rgba(111,73,23,0.18)] text-[clamp(4rem,11vw,10rem)] sm:text-[clamp(4.4rem,11vw,10.8rem)] lg:text-[clamp(4.8rem,11vw,11.5rem)]">
                {porsiInfo ?? "\u00A0"}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}