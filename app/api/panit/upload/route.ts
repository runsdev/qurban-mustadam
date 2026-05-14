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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const animalId = normalizeAnimalId(String(formData.get("animalId") ?? ""));
    const processStage = String(formData.get("processStage") ?? "").trim();
    const mediaType = String(formData.get("mediaType") ?? "").trim();
    const mediaFile = formData.get("mediaFile");

    if (!animalId) {
      return NextResponse.json({ error: "Animal ID is required" }, { status: 400 });
    }

    if (!isAllowedStatus(processStage)) {
      return NextResponse.json(
        { error: "Process stage is invalid" },
        { status: 400 },
      );
    }

    if (!(mediaFile instanceof File)) {
      return NextResponse.json(
        { error: "Media file is required" },
        { status: 400 },
      );
    }

    if (mediaFile.size === 0) {
      return NextResponse.json(
        { error: "Media file is empty" },
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

    const mediaUrl = await uploadMediaToDrive({
      animalId,
      processStage,
      file: mediaFile,
      mimeType: mediaFile.type || (mediaType === "video" ? "video/webm" : "image/jpeg"),
    });

    await updateAnimalDriveUrl(animalId, mediaUrl);

    if (mediaType === "image") {
      await updateAnimalImageUrl(animalId, mediaUrl);
    }

    if (animal.status !== processStage) {
      await updateAnimalStatus(animalId, processStage);
    }

    const notificationResult = await sendStatusNotification({
      animalId,
      oldStatus: animal.status,
      newStatus: processStage,
    });

    return NextResponse.json({
      success: true,
      mediaUrl,
      message: "Media berhasil diupload ke Google Drive.",
      notification: notificationResult,
    });
  } catch (error) {
    console.error("[api/panit/upload] Upload error:", error);
    const message = error instanceof Error ? error.message : "Gagal upload media";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
