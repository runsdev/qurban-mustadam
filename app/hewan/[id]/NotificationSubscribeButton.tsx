"use client";

import { useMemo, useState } from "react";

type Props = {
  token: string;
  vapidPublicKey: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function NotificationSubscribeButton({ token, vapidPublicKey }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [message, setMessage] = useState<string>("");

  const isBrowserSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  }, []);

  async function handleSubscribe() {
    if (!isBrowserSupported) {
      setMessage("Browser tidak mendukung push notification.");
      return;
    }

    if (!vapidPublicKey) {
      setMessage("VAPID public key belum dikonfigurasi.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Izin notifikasi ditolak.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/service-worker.js");
      const readyRegistration = await navigator.serviceWorker.ready;
      const activeRegistration = readyRegistration ?? registration;

      let subscription = await activeRegistration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await activeRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const response = await fetch(`/api/portal/${token}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan subscription.");
      }

      setIsSubscribed(true);
      setMessage("Notifikasi aktif untuk hewan ini.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Gagal mengaktifkan notifikasi.";
      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={isLoading || isSubscribed}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-fixed text-on-primary-fixed-variant font-bold text-xs uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined">notifications</span>
        {isLoading
          ? "Mengaktifkan..."
          : isSubscribed
            ? "Notifikasi Aktif"
            : "Aktifkan Notifikasi untuk Hewan Ini"}
      </button>
      {message && (
        <p className="text-sm text-on-surface-variant">{message}</p>
      )}
    </div>
  );
}
