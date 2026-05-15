"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

const stageOptions = [
  "Persiapan",
  "Disembelih",
  "Pengolahan",
  "Distribusi",
  "Selesai",
] as const;

type StageOption = (typeof stageOptions)[number];
type CaptureMode = "image" | "video";
type CapturedMedia = {
  id: string;
  file: File;
  type: CaptureMode;
  previewUrl: string;
};

function normalizeAnimalId(value: string) {
  return value.trim().toUpperCase().replace(/^#/, "");
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function getSupportedVideoMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

export default function PanitPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [animalId, setAnimalId] = useState("");
  const [processStage, setProcessStage] = useState<StageOption | "">("");
  const [captureMode, setCaptureMode] = useState<CaptureMode | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaItems, setMediaItems] = useState<CapturedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mediaItemsRef = useRef<CapturedMedia[]>([]);

  const browserSupportsCamera = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(navigator.mediaDevices?.getUserMedia);
  }, []);

  const browserSupportsRecorder = useMemo(() => {
    if (typeof window === "undefined") return false;
    return typeof MediaRecorder !== "undefined";
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = cameraStream;
    if (cameraStream) {
      video.play().catch(() => undefined);
    }

    return () => {
      video.srcObject = null;
    };
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    mediaItemsRef.current = mediaItems;
  }, [mediaItems]);

  useEffect(() => {
    return () => {
      mediaItemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const clearCapturedMedia = () => {
    setMediaItems((currentItems) => {
      currentItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  };

  const addCapturedMedia = (file: File, type: CaptureMode) => {
    const previewUrl = URL.createObjectURL(file);
    const mediaItem: CapturedMedia = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      type,
      previewUrl,
    };

    setMediaItems((currentItems) => [...currentItems, mediaItem]);
  };

  const removeCapturedMedia = (id: string) => {
    setMediaItems((currentItems) => {
      const itemToRemove = currentItems.find((item) => item.id === id);
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      }

      return currentItems.filter((item) => item.id !== id);
    });
  };

  const stopCamera = () => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setCameraStream(null);
    setCaptureMode(null);
  };

  const handleLogin = async (password: string) => {
    try {
      const res = await fetch("/api/panit/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }

      setAuthenticated(true);
      setError("");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login error");
    }
  };

  const openCamera = async (mode: CaptureMode) => {
    if (!browserSupportsCamera) {
      setError("Browser ini tidak mendukung akses kamera.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
        audio: mode === "video",
      });

      streamRef.current = stream;
      setCameraStream(stream);
      setCaptureMode(mode);
    } catch (cameraError) {
      setError(
        cameraError instanceof Error
          ? cameraError.message
          : "Gagal membuka kamera",
      );
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) {
      setError("Kamera belum aktif.");
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setError("Tidak dapat memproses foto.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
            return;
          }

          reject(new Error("Gagal mengambil foto."));
        },
        "image/jpeg",
        0.95,
      );
    });

    const fileName = `${normalizeAnimalId(animalId) || "panit"}-${processStage || "foto"}-${Date.now()}.jpg`;
    const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });

    addCapturedMedia(file, "image");
    stopCamera();
  };

  const startRecording = async () => {
    if (!browserSupportsRecorder) {
      setError("Browser ini tidak mendukung perekaman video.");
      return;
    }

    if (!streamRef.current) {
      setError("Kamera belum aktif.");
      return;
    }

    try {
      const mimeType = getSupportedVideoMimeType();
      const recorder = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current);

      recorderRef.current = recorder;
      recordedChunksRef.current = [];
      setError("");
      setSuccess("");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("Perekaman video gagal.");
        setIsRecording(false);
      };

      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(recordedChunksRef.current, { type: finalType });
        const extension = finalType.includes("mp4") ? "mp4" : "webm";
        const fileName = `${normalizeAnimalId(animalId) || "panit"}-${processStage || "video"}-${Date.now()}.${extension}`;
        const file = new File([blob], fileName, { type: finalType });

        addCapturedMedia(file, "video");
        setIsRecording(false);
        stopCamera();
      };

      recorder.start();
      setIsRecording(true);
    } catch (recordingError) {
      setError(
        recordingError instanceof Error
          ? recordingError.message
          : "Gagal memulai perekaman.",
      );
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") {
      return;
    }

    recorderRef.current.stop();
  };

  const handleUpload = async () => {
    const normalizedAnimalId = normalizeAnimalId(animalId);

    if (!normalizedAnimalId || !processStage || mediaItems.length === 0) {
      setError("Pilih hewan, stage proses, lalu ambil media terlebih dulu.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("animalId", normalizedAnimalId);
      formData.append("processStage", processStage);

      mediaItems.forEach((item) => {
        formData.append("mediaFiles", item.file, item.file.name);
      });

      const response = await fetch("/api/panit/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Upload gagal");
      }

      clearCapturedMedia();
      setSuccess(data.message || "Media berhasil diupload ke Google Drive.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Gagal upload media",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    if (isRecording && recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    } else {
      stopCamera();
    }
    recorderRef.current = null;
    recordedChunksRef.current = [];
    clearCapturedMedia();
    setAuthenticated(false);
    setAnimalId("");
    setProcessStage("");
    setIsRecording(false);
    setError("");
    setSuccess("");
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_#fff7ed_0%,_#f8fafc_45%,_#eef2ff_100%)] px-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="space-y-2 text-center">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
              Panit Access
            </p>
            <h2 className="text-3xl font-black text-slate-900">
              Login Panit
            </h2>
            <p className="text-sm text-slate-600">
              Masukkan password 6 digit untuk masuk ke sistem capture dan upload.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            className="space-y-4"
            onSubmit={async (event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const password = formData.get("password");

              if (typeof password === "string") {
                await handleLogin(password);
                return;
              }

              setError("Password tidak valid.");
            }}
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                placeholder="******"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-slate-700"
            >
              Login
            </button>
          </form>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed_0%,_#f8fafc_40%,_#eef2ff_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
              Panit Media Upload
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Kamera, Rekam, Upload ke Drive
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Ambil foto atau video langsung dari browser, simpan ke Google Drive,
              update spreadsheet, lalu kirim notifikasi ke shohibul.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            type="button"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <h2 className="text-lg font-black uppercase tracking-[0.22em] text-slate-500">
                Animal
              </h2>
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Animal ID
                </label>
                <input
                  type="text"
                  value={animalId}
                  onChange={(event) =>
                    setAnimalId(event.target.value.toUpperCase().trim())
                  }
                  placeholder="Contoh: #001"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <h2 className="text-lg font-black uppercase tracking-[0.22em] text-slate-500">
                Stage
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {stageOptions.map((stage) => (
                  <label
                    key={stage}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      processStage === stage
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span>{stage}</span>
                    <input
                      type="radio"
                      name="stage"
                      value={stage}
                      checked={processStage === stage}
                      onChange={(event) => setProcessStage(event.target.value as StageOption)}
                      className="h-4 w-4"
                    />
                  </label>
                ))}
              </div>
            </section>

          </div>

          <div className="space-y-6 lg:col-span-8">
            <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-xl font-black text-slate-900">Media Capture</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Gunakan kamera browser untuk foto atau video. Foto diambil dari frame live, video direkam dengan MediaRecorder.
                </p>
              </div>

              <div className="space-y-6 p-6">
                {mediaItems.length > 0 && (
                  <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">Media Siap Upload</h3>
                        <p className="text-sm text-slate-600">
                          {mediaItems.length} file sudah masuk antrian.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          clearCapturedMedia();
                          setCaptureMode(null);
                          setError("");
                        }}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        Kosongkan Antrian
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {mediaItems.map((item, index) => (
                        <div key={item.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                                {item.type === "image" ? "Foto" : "Video"}
                              </p>
                              <p className="text-sm font-semibold text-slate-900">Media {index + 1}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeCapturedMedia(item.id)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                            >
                              Hapus
                            </button>
                          </div>

                          {item.type === "image" ? (
                            <div className="relative h-56 w-full">
                              <Image
                                src={item.previewUrl}
                                alt={item.file.name}
                                fill
                                sizes="(max-width: 768px) 100vw, 33vw"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <video src={item.previewUrl} controls className="h-56 w-full object-cover bg-black" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openCamera("image")}
                        disabled={uploading || !browserSupportsCamera}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Tambah Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => openCamera("video")}
                        disabled={uploading || !browserSupportsCamera || !browserSupportsRecorder}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Tambah Video
                      </button>
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploading || !animalId || !processStage || mediaItems.length === 0}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploading ? "Uploading..." : "Upload Semua"}
                      </button>
                    </div>
                  </div>
                )}

                {cameraStream ? (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="aspect-video w-full object-cover"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {captureMode === "image" ? (
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-amber-600"
                        >
                          Ambil Foto
                        </button>
                      ) : (
                        <>
                          {!isRecording ? (
                            <button
                              type="button"
                              onClick={startRecording}
                              className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-emerald-700"
                            >
                              Mulai Rekam
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-red-700"
                            >
                              Berhenti Rekam
                            </button>
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (isRecording && recorderRef.current?.state === "recording") {
                            recorderRef.current.stop();
                          } else {
                            stopCamera();
                          }
                          setIsRecording(false);
                        }}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        Tutup Kamera
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => openCamera("image")}
                      disabled={uploading || !browserSupportsCamera}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
                        Photo
                      </div>
                      <div className="mt-2 text-2xl font-black text-slate-900">
                        Buka Kamera Foto
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Ambil satu frame foto dari kamera browser.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => openCamera("video")}
                      disabled={uploading || !browserSupportsCamera || !browserSupportsRecorder}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
                        Video
                      </div>
                      <div className="mt-2 text-2xl font-black text-slate-900">
                        Buka Kamera Video
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Rekam video dengan audio jika browser mendukung.
                      </p>
                    </button>
                  </div>
                )}

                <div className="rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">
                  {browserSupportsCamera ? (
                    <p>
                      Kamera siap digunakan. Pastikan halaman dibuka lewat HTTPS saat deployment.
                    </p>
                  ) : (
                    <p>
                      Browser ini tidak mendukung akses kamera. Gunakan browser yang mendukung MediaDevices API.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !animalId || !processStage || mediaItems.length === 0}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-5 py-4 text-sm font-black uppercase tracking-[0.24em] text-white transition hover:from-slate-800 hover:via-slate-900 hover:to-indigo-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Uploading ke Drive...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">upload</span>
                    Upload, Update Sheet, Notify
                  </>
                )}
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}