import { google } from "googleapis";

// Google Drive API scopes
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Folder structure: /(id hewan)/(proses qurban)/
// We'll create folders if they don't exist

export async function uploadMediaToDrive({
  animalId,
  processStage,
  file,
  mimeType,
}: {
  animalId: string;
  processStage: string;
  file: Blob;
  mimeType: string;
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
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
        private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID,
        private_key: (
          process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? ""
        ).replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
      },
      scopes: SCOPES,
    });

    const drive = google.drive({ version: "v3", auth });

    // Find or create the animal folder
    let animalFolderId = await getOrCreateFolder(
      drive,
      animalId,
      "root" // Parent folder ID for root
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