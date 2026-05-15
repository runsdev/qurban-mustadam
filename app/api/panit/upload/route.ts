import { NextResponse } from "next/server";
import { uploadMediaToDrive } from "@/lib/drive";
import {
  fetchAnimalById,
  updateAnimalDriveUrl,
  updateAnimalImageUrl,
  updateAnimalStatus,
} from "@/lib/sheets";
import { sendStatusNotification } from "@/lib/notifications";
import type { AnimalStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedStatuses: AnimalStatus[] = [
  "Persiapan",
  "Disembelih",
  "Pengolahan",
  "Distribusi",
  "Selesai",
];

function normalizeAnimalId(value: string) {
  return value.trim().replace(/^#/, "");
}

function isAllowedStatus(value: string): value is AnimalStatus {
  return allowedStatuses.includes(value as AnimalStatus);
}

function getNextStatus(stage: AnimalStatus): AnimalStatus {
  switch (stage) {
    case "Persiapan":
      return "Disembelih";
    case "Disembelih":
      return "Pengolahan";
    case "Pengolahan":
      return "Distribusi";
    case "Distribusi":
      return "Selesai";
    case "Selesai":
      return "Selesai";
  }
}

function getStatusIndex(stage: AnimalStatus) {
  return allowedStatuses.indexOf(stage);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const animalId = normalizeAnimalId(String(formData.get("animalId") ?? ""));
    const processStage = String(formData.get("processStage") ?? "").trim();
    const mediaFiles = formData
      .getAll("mediaFiles")
      .filter((item): item is File => item instanceof File && item.size > 0);
    const legacyMediaFile = formData.get("mediaFile");

    if (!animalId) {
      return NextResponse.json({ error: "Animal ID is required" }, { status: 400 });
    }

    if (!isAllowedStatus(processStage)) {
      return NextResponse.json(
        { error: "Process stage is invalid" },
        { status: 400 },
      );
    }

    if (mediaFiles.length === 0 && legacyMediaFile instanceof File && legacyMediaFile.size > 0) {
      mediaFiles.push(legacyMediaFile);
    }

    if (mediaFiles.length === 0) {
      return NextResponse.json(
        { error: "Media file is required" },
        { status: 400 },
      );
    }

    const animal = await fetchAnimalById(animalId);
    if (!animal) {
      return NextResponse.json(
        { error: `Hewan dengan ID "${animalId}" tidak ditemukan.` },
        { status: 404 },
      );
    }

    const uploadedMedia: Array<{ url: string; type: "image" | "video" }> = [];

    for (const file of mediaFiles) {
      const mediaType = file.type.startsWith("video") ? "video" : "image";
      const mediaUrl = await uploadMediaToDrive({
        animalId,
        processStage,
        file,
        mimeType: file.type || (mediaType === "video" ? "video/webm" : "image/jpeg"),
      });

      uploadedMedia.push({ url: mediaUrl, type: mediaType });
    }

    const driveUrls = uploadedMedia.map((item) => item.url).filter(Boolean);
    const imageUrl = uploadedMedia.find((item) => item.type === "image")?.url ?? driveUrls[0] ?? "";

    if (driveUrls.length > 0) {
      await updateAnimalDriveUrl(animalId, driveUrls.join("\n"));
    }

    if (imageUrl) {
      await updateAnimalImageUrl(animalId, imageUrl);
    }

    const selectedIndex = getStatusIndex(processStage);
    const currentIndex = getStatusIndex(animal.status);
    const targetStatus = getNextStatus(processStage);
    const shouldIgnoreStatusUpdate = currentIndex > selectedIndex;

    let notificationResult = {
      success: true,
      message: "Status tidak berubah karena dokumentasi masuk untuk tahap sebelumnya.",
      failed: 0,
      sent: 0,
      targeted: 0,
    };

    if (!shouldIgnoreStatusUpdate) {
      if (animal.status !== targetStatus) {
        await updateAnimalStatus(animalId, targetStatus);
        notificationResult = await sendStatusNotification({
          animalId,
          oldStatus: animal.status,
          newStatus: targetStatus,
        });
      } else {
        notificationResult = {
          success: true,
          message: "Status sudah sama, notifikasi tidak dikirim.",
          failed: 0,
          sent: 0,
          targeted: 0,
        };
      }
    }

    return NextResponse.json({
      success: true,
      mediaUrls: driveUrls,
      message: `${uploadedMedia.length} media berhasil diupload ke Google Drive.`,
      statusChanged: !shouldIgnoreStatusUpdate && animal.status !== targetStatus,
      notification: notificationResult,
    });
  } catch (error) {
    console.error("[api/panit/upload] Upload error:", error);
    const message = error instanceof Error ? error.message : "Gagal upload media";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
