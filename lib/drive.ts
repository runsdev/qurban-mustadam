import { google } from "googleapis";
import { getEnvValue } from "./sheets";
import fs from "fs/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { tmpdir } from "node:os";
import { Readable } from "node:stream";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpegStaticPath from "ffmpeg-static";

// Google Drive API scopes
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Folder structure: /Dokumentasi Hewan Qurban/(id hewan)/(proses qurban)/
// We'll create folders if they don't exist

const DOCUMENTATION_ROOT_FOLDER_NAME = "Dokumentasi Hewan Qurban";

export async function uploadMediaToDrive({
  animalId,
  processStage,
  file,
  mimeType,
  parentFolderId,
}: {
  animalId: string;
  processStage: string;
  file: File;
  mimeType: string;
  parentFolderId?: string | null;
}): Promise<string> {
  // Check for required environment variables
  try {
    const credentials = await resolveDriveCredentials();

    // Prefer Drive-specific service account env vars if provided
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    const drive = google.drive({ version: "v3", auth });

    // Determine parent folder (root or provided)
    let rootParent =
      process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ??
      process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID ??
      null;
    if (!rootParent) {
      // Try reading from Env sheet if not provided in env.
      rootParent =
        (await getEnvValue("GOOGLE_DRIVE_PARENT_FOLDER_ID")) ??
        (await getEnvValue("GOOGLE_DRIVE_SHARED_DRIVE_ID")) ??
        (await getEnvValue("GOOGLE_DRIVE_FOLDER_ID"));
    }

    const parentForAnimal = parentFolderId ?? rootParent ?? "root";
    const sharedDriveId = isSharedDriveId(parentForAnimal) ? parentForAnimal : null;

    const documentationRootFolderId = await getOrCreateFolder(
      drive,
      DOCUMENTATION_ROOT_FOLDER_NAME,
      parentForAnimal as string,
      sharedDriveId,
    );

    // Find or create the animal folder
    const animalFolderId = await getOrCreateFolder(
      drive,
      animalId,
      documentationRootFolderId,
      sharedDriveId,
    );

    // Find or create the process stage subfolder
    const processFolderId = await getOrCreateFolder(
      drive,
      processStage,
      animalFolderId,
      sharedDriveId,
    );

    const uploadPayload =
      mimeType.startsWith("video/") && mimeType !== "video/mp4"
        ? await prepareVideoUpload(file, mimeType)
        : await createRawUploadPayload(file, mimeType);

    // Upload the file
    const fileMetadata = {
      name: uploadPayload.name,
      parents: [processFolderId],
    };

    // Convert Blob to a Node.js stream for googleapis upload
    const stream = Readable.from([uploadPayload.buffer]);

    const media = {
      mimeType: uploadPayload.mimeType,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      supportsAllDrives: true,
      fields: "id, webViewLink, webContentLink",
    });

    return response.data.webViewLink || "";
  } catch (error) {
    console.error("[drive] Failed to upload media:", error);
    throw error;
  }
}

async function transcodeVideoToMp4(file: File): Promise<{
  name: string;
  mimeType: string;
  buffer: Buffer;
}> {
  const ffmpegBinary = await resolveFfmpegBinary();
  if (!ffmpegBinary) {
    throw new Error("ffmpeg binary is not available for video conversion.");
  }

  const workingDir = path.join(tmpdir(), "qurban-drive-transcode");
  await fs.mkdir(workingDir, { recursive: true });

  const inputPath = path.join(workingDir, `${randomUUID()}-input`);
  const outputPath = path.join(workingDir, `${randomUUID()}-output.mp4`);
  const sourceBuffer = Buffer.from(await file.arrayBuffer());

  try {
    await fs.writeFile(inputPath, sourceBuffer);
    await runFfmpeg(ffmpegBinary, inputPath, outputPath);

    const buffer = await fs.readFile(outputPath);
    const baseName = (file.name || `upload_${Date.now()}`).replace(/\.[^.]+$/, "");

    return {
      name: `${baseName}.mp4`,
      mimeType: "video/mp4",
      buffer,
    };
  } finally {
    await fs.rm(inputPath, { force: true }).catch(() => undefined);
    await fs.rm(outputPath, { force: true }).catch(() => undefined);
  }
}

async function prepareVideoUpload(file: File, originalMimeType: string) {
  try {
    return await transcodeVideoToMp4(file);
  } catch (error) {
    console.warn(
      "[drive] Video transcode failed, uploading original file instead:",
      error,
    );

    return createRawUploadPayload(file, originalMimeType);
  }
}

async function createRawUploadPayload(file: File, mimeType: string) {
  return {
    name: file.name || `upload_${Date.now()}.${mimeType.split("/")[1]}`,
    mimeType,
    buffer: Buffer.from(await file.arrayBuffer()),
  };
}

async function resolveFfmpegBinary() {
  const envPath = process.env.FFMPEG_PATH?.trim();
  if (envPath) {
    try {
      await fs.access(envPath);
      return envPath;
    } catch {
      console.warn(`[drive] FFMPEG_PATH is set but missing: ${envPath}`);
    }
  }

  const installerPath = ffmpegInstaller?.path?.trim();
  if (installerPath) {
    try {
      await fs.access(installerPath);
      return installerPath;
    } catch {
      console.warn(`[drive] @ffmpeg-installer binary missing at: ${installerPath}`);
    }
  }

  if (ffmpegStaticPath) {
    try {
      await fs.access(ffmpegStaticPath);
      return ffmpegStaticPath;
    } catch {
      console.warn(`[drive] ffmpeg-static binary missing at: ${ffmpegStaticPath}`);
    }
  }

  const envSheetPath = (await getEnvValue("FFMPEG_PATH"))?.trim();
  if (envSheetPath) {
    try {
      await fs.access(envSheetPath);
      return envSheetPath;
    } catch {
      console.warn(`[drive] Env sheet FFMPEG_PATH is set but missing: ${envSheetPath}`);
    }
  }

  const fallbackCandidates =
    process.platform === "win32"
      ? ["C:\\ffmpeg\\bin\\ffmpeg.exe", "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe"]
      : ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg"];

  for (const candidate of fallbackCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next known location.
    }
  }

  return "ffmpeg";
}

function runFfmpeg(ffmpegBinary: string, inputPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      ffmpegBinary,
      [
        "-y",
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        outputPath,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );

    let errorOutput = "";
    child.stderr?.on("data", (chunk) => {
      errorOutput += chunk.toString();
    });

    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `ffmpeg exited with code ${code ?? "unknown"}: ${errorOutput.trim()}`,
        ),
      );
    });
  });
}

async function resolveDriveCredentials(): Promise<{
  type: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
}> {
  const fromDriveEnv =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PROJECT_ID &&
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_ID &&
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL &&
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_CLIENT_ID
      ? {
          type: "service_account",
          project_id: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PROJECT_ID,
          private_key_id: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_ID,
          private_key: (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
          client_email: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_CLIENT_ID,
        }
      : null;

  if (fromDriveEnv) {
    return fromDriveEnv;
  }

  if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH) {
    try {
      const json = await fs.readFile(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH, "utf8");
      const parsed = JSON.parse(json);
      return {
        type: parsed.type,
        project_id: parsed.project_id,
        private_key_id: parsed.private_key_id,
        private_key: parsed.private_key,
        client_email: parsed.client_email,
        client_id: parsed.client_id,
      };
    } catch (err) {
      console.warn("[drive] Failed to read DRIVE service account JSON path:", err);
    }
  }

  const sheetCredentials = await readCredentialsFromEnvSheet();
  if (sheetCredentials) {
    return sheetCredentials;
  }

  const generalEnv =
    process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID
      ? {
          type: "service_account",
          project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
          private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID,
          private_key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
        }
      : null;

  if (generalEnv) {
    return generalEnv;
  }

  throw new Error(
    "Google Drive API credentials not configured. Isi tab Env untuk Drive atau set GOOGLE_DRIVE_SERVICE_ACCOUNT_* di env runtime.",
  );
}

async function readCredentialsFromEnvSheet(): Promise<{
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
} | null> {
  const keys = [
    "GOOGLE_SERVICE_ACCOUNT_PROJECT_ID",
    "GOOGLE_SERVICE_ACCOUNT_KEY_ID",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    "GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL",
    "GOOGLE_SERVICE_ACCOUNT_CLIENT_ID",
  ] as const;

  const values = await Promise.all(keys.map((key) => getEnvValue(key)));
  const [projectId, keyId, privateKey, clientEmail, clientId] = values;

  if (!projectId || !keyId || !privateKey || !clientEmail || !clientId) {
    return null;
  }

  return {
    type: "service_account",
    project_id: projectId,
    private_key_id: keyId,
    private_key: privateKey.replace(/\\n/g, "\n"),
    client_email: clientEmail,
    client_id: clientId,
  };
}

// Helper function to get or create a folder in Google Drive
type DriveFolderClient = {
  files: {
    list(options: Record<string, unknown>): Promise<{
      data: { files?: Array<{ id?: string | null; name?: string | null }> };
    }>;
    create(options: {
      requestBody: Record<string, unknown>;
      fields?: string;
      supportsAllDrives?: boolean;
    }): Promise<{ data: { id?: string | null } }>;
  };
  permissions: {
    create(options: {
      fileId: string;
      requestBody: {
        type: "anyone";
        role: "reader";
        allowFileDiscovery: boolean;
      };
      sendNotificationEmail?: boolean;
      supportsAllDrives?: boolean;
    }): Promise<unknown>;
  };
};

async function getOrCreateFolder(
  drive: DriveFolderClient,
  folderName: string,
  parentFolderId: string,
  sharedDriveId?: string | null,
): Promise<string> {
  try {
    // Search for existing folder
    const listOptions: Record<string, unknown> = {
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    };

    if (sharedDriveId) {
      listOptions.corpora = "drive";
      listOptions.driveId = sharedDriveId;
    }

    const response = await drive.files.list(listOptions);

    const folders = response.data.files ?? [];
    if (folders.length > 0 && folders[0]?.id) {
      const existingFolderId = folders[0].id;
      await ensurePublicFolderLink(drive, existingFolderId, sharedDriveId);
      return existingFolderId;
    }

    // Create new folder if not found
    const folderMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    };

    const folderResponse = await drive.files.create({
      requestBody: folderMetadata,
      fields: "id",
      supportsAllDrives: true,
    });

    const createdFolderId = folderResponse.data.id ?? parentFolderId;
    await ensurePublicFolderLink(drive, createdFolderId, sharedDriveId);
    return createdFolderId;
  } catch (error) {
    console.error("[drive] Error in getOrCreateFolder:", error);
    throw error;
  }
}

async function ensurePublicFolderLink(
  drive: DriveFolderClient,
  folderId: string,
  sharedDriveId?: string | null,
) {
  const permissionOptions = {
    fileId: folderId,
    requestBody: {
      type: "anyone" as const,
      role: "reader" as const,
      allowFileDiscovery: false,
    },
    sendNotificationEmail: false,
    supportsAllDrives: true,
  };

  if (sharedDriveId) {
    await drive.permissions.create(permissionOptions);
    return;
  }

  await drive.permissions.create(permissionOptions);
}

function isSharedDriveId(value: string) {
  return /^0A[0-9A-Za-z_-]{10,}$/.test(value);
}