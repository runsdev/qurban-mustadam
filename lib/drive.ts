import { google } from "googleapis";
import { getEnvValue } from "./sheets";
import fs from "fs/promises";
import { Readable } from "node:stream";

// Google Drive API scopes
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Folder structure: /(id hewan)/(proses qurban)/
// We'll create folders if they don't exist

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
    let rootParent = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ?? null;
    if (!rootParent) {
      // Try reading from Env sheet if not provided in env.
      rootParent =
        (await getEnvValue("GOOGLE_DRIVE_PARENT_FOLDER_ID")) ??
        (await getEnvValue("GOOGLE_DRIVE_FOLDER_ID"));
    }

    const parentForAnimal = parentFolderId ?? rootParent ?? "root";

    // Find or create the animal folder
    let animalFolderId = await getOrCreateFolder(
      drive,
      animalId,
      parentForAnimal as string,
    );

    // Find or create the process stage subfolder
    const processFolderId = await getOrCreateFolder(
      drive,
      processStage,
      animalFolderId
    );

    // Upload the file
    const fileMetadata = {
      name: file.name || `upload_${Date.now()}.${mimeType.split("/")[1]}`,
      parents: [processFolderId],
    };

    // Convert Blob to a Node.js stream for googleapis upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const media = {
      mimeType,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink",
    });

    return response.data.webViewLink || "";
  } catch (error) {
    console.error("[drive] Failed to upload media:", error);
    throw error;
  }
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
async function getOrCreateFolder(
  drive: any,
  folderName: string,
  parentFolderId: string
): Promise<string> {
  try {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
      fields: "files(id, name)",
    });

    const folders = response.data.files;
    if (folders.length > 0) {
      return folders[0].id;
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
    });

    return folderResponse.data.id;
  } catch (error) {
    console.error("[drive] Error in getOrCreateFolder:", error);
    throw error;
  }
}