
import { StreamClient } from "@stream-io/node-sdk";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const secret = process.env.STREAM_API_SECRET_KEY;

if (!apiKey || !secret) {
  console.error("Missing Stream API keys in .env.local");
  process.exit(1);
}

const client = new StreamClient(apiKey, secret);

async function setup() {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!bucket || !projectId || !clientEmail || !privateKey) {
    console.error("Missing Firebase credentials for storage setup");
    return;
  }

  console.log(`Setting up external storage: ${bucket}`);

  const gcsCredentials = JSON.stringify({
    type: "service_account",
    project_id: projectId,
    private_key: privateKey,
    client_email: clientEmail,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    // Adding client_id if possible (often same as project id's numeric part? No, but let's try without first)
  });

  try {
    // 1. Create or Update Storage
    // Use upsert-like behavior: create then catch conflict if needed
    try {
      await client.video.createExternalStorage({
        name: 'firebase-storage',
        storage_type: 'gcs',
        bucket: bucket,
        gcs_credentials: gcsCredentials,
        path: 'recordings/'
      });
      console.log("✅ Successfully created firebase-storage configuration");
    } catch (e: any) {
      if (e.status === 409) {
        console.log("ℹ️ firebase-storage already exists, proceeding to update call type...");
      } else {
        throw e;
      }
    }

    // 2. Check the storage (this will upload a test file)
    console.log("Testing storage configuration...");
    try {
        await client.video.checkExternalStorage({
            name: 'firebase-storage',
        });
        console.log("✅ Storage check passed! (Test file uploaded to Firebase)");
    } catch (e: any) {
        console.error("❌ Storage check failed:", e.message || e);
        console.error("Details:", JSON.stringify(e.response?.data || {}, null, 2));
        return;
    }

    // 3. Update 'livestream' call type to use this storage by default
    console.log("Updating 'livestream' call type default storage...");
    await client.video.updateCallType('livestream', {
        external_storage: 'firebase-storage',
        settings: {
            recording: {
                mode: 'available',
                quality: '1080p',
            }
        }
    });
    console.log("✅ 'livestream' call type now uses firebase-storage by default");

    // 4. Update 'default' call type too
    console.log("Updating 'default' call type default storage...");
    await client.video.updateCallType('default', {
        external_storage: 'firebase-storage',
    });
    console.log("✅ 'default' call type now uses firebase-storage by default");

  } catch (err: any) {
    console.error("Setup failed:", err.message || err);
    if (err.response) {
        console.error("Server responded with:", JSON.stringify(err.response.data, null, 2));
    }
  }
}

setup();
