import { NextResponse } from "next/server";
import { streamVideoServer } from "@/lib/streamVideoServer";
import { adminAuth } from "@/lib/firebaseAdmin";

/**
 * Server-side API to update call settings and configure external storage.
 * This ensures recordings are saved to Firebase Storage and bypasses client-side permission errors.
 */
export async function POST(req: Request) {
  try {
    if (!adminAuth) {
      throw new Error("Firebase Admin SDK not initialized.");
    }
    
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId, callType = 'livestream', quality = '1080p' } = await req.json();
    if (!callId) {
      return NextResponse.json({ error: "Missing callId" }, { status: 400 });
    }

    // 1. Register/Ensure Firebase Storage is linked to Stream (GCS)
    try {
      await streamVideoServer.video.createExternalStorage({
        name: 'firebase-storage',
        storage_type: 'gcs',
        bucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        path: 'recordings/',
        gcs_credentials: JSON.stringify({
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n").replace(/"/g, ""),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        })
      });
    } catch (e: any) {
      // 409 or "already exists" message means it's already configured correctly
      const isAlreadyExists = e.status === 409 || e.response?.status === 409 || 
                             (e.message && e.message.toLowerCase().includes("already exists"));
      if (!isAlreadyExists) {
          console.warn("External storage registration warning:", e.message || e);
      }
    }

    // 2. Update the 'livestream' and 'default' call types to use this by default for the entire app level
    try {
        await streamVideoServer.video.updateCallType('livestream', {
          external_storage: 'firebase-storage',
        } as any);
        await streamVideoServer.video.updateCallType('default', {
          external_storage: 'firebase-storage',
        } as any);
    } catch (e) {
        console.warn("Call type update warning:", e);
    }

    // 3. Update the specific call instance (quality/mode)
    const callInstance = streamVideoServer.video.call(callType, callId);
    await callInstance.update({
      settings_override: {
        recording: {
          mode: 'available',
          quality: quality,
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error in /api/stream/update-call:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update call settings" },
      { status: 500 }
    );
  }
}
