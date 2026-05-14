import { google } from "googleapis";
import { getEnvValue } from "./sheets";
import fs from "fs/promises";

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
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID) {
    throw new Error("Google Drive API credentials not configured");
  }

  try {
    // Prefer Drive-specific service account env vars if provided
    let credentials: any = null;

    // 1) Explicit DRIVE-specific env vars
    if (
      process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PROJECT_ID &&
      process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_ID &&
      process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL &&
      process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_CLIENT_ID
    ) {
      credentials = {
        type: "service_account",
        project_id: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PROJECT_ID,
        private_key_id: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_ID,
        private_key: (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_CLIENT_ID,
      };
    }

    // 2) JSON file path (e.g. for local testing). Use env GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH
    if (!credentials && process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH) {
      try {
        const json = await fs.readFile(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH, "utf8");
        const parsed = JSON.parse(json);
        credentials = {
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

    // 3) Fallback to general GOOGLE_SERVICE_ACCOUNT_* env vars
    if (!credentials) {
      if (
        process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID &&
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID &&
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
        process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL &&
        process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID
      ) {
        credentials = {
          type: "service_account",
          project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
          private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID,
          private_key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
        };
      }
    }

    if (!credentials) {
      throw new Error("Google Drive API credentials not configured (no Drive or general service account found)");
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    const drive = google.drive({ version: "v3", auth });

    // Determine parent folder (root or provided)
    let rootParent = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ?? null;
    if (!rootParent) {
      // Try reading from Env sheet if not provided in env
      rootParent = await getEnvValue("GOOGLE_DRIVE_PARENT_FOLDER_ID");
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

    // Convert Blob to Buffer for upload
    const buffer = Buffer.from(await file.arrayBuffer());

    const media = {
      mimeType,
      body: buffer,
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