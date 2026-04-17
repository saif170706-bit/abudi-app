import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { streamVideoServer } from "@/lib/streamVideoServer";

function getFilenameFromUrl(url: string) {
  try {
    const decoded = decodeURIComponent(url);
    const parts = decoded.split("/");
    return parts[parts.length - 1] || null;
  } catch (e) {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({ status: "warming" });
}

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      throw new Error("Firebase Admin SDK not initialized correctly.");
    }
    
    // Auth Check
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const livestreamId = String(body.livestreamId || body.docId || "");
    const callId = String(body.callId || "");
    const callType = String(body.callType || "livestream");

    if (!callId) {
      return NextResponse.json({ error: "callId is required" }, { status: 400 });
    }

    console.log(`Publishing recording for callId: ${callId}`);

    // ── 1. Get Recording from Stream API ─────────────────────────────
    const callInstance = streamVideoServer.video.call(callType, callId);
    const recordingsResponse = await callInstance.listRecordings();
    const recordings = recordingsResponse.recordings ?? [];

    if (recordings.length === 0) {
      return NextResponse.json(
        { error: "Optagelsen behandles stadig hos Stream. Prøv igen om et øjeblik.", callId },
        { status: 404 }
      );
    }

    // Sort to get the latest
    const latest = [...recordings].sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    )[0];

    const streamUrl = latest.url;

    if (!streamUrl) {
      return NextResponse.json(
        { error: "Optagelses-URL er ikke klar endnu.", latest },
        { status: 500 }
      );
    }

    const filename = getFilenameFromUrl(streamUrl);
    if (!filename) {
      return NextResponse.json(
        { error: "Kunne ikke læse filnavnet fra Stream URL.", streamUrl },
        { status: 500 }
      );
    }

    // ── 2. Create Proxy URL ──────────────────────────────────────────
    // This URL points to our own server-side streaming endpoint
    const proxyUrl = `/api/stream/recording-proxy?callId=${encodeURIComponent(callId)}&filename=${encodeURIComponent(filename)}&callType=${encodeURIComponent(callType)}`;

    const payload = {
      callId,
      callType,
      streamRecordingUrl: streamUrl,
      recordingFilename: filename,
      recordingUrl: proxyUrl,
      isRecordingAvailable: true,
      isActive: false,
      recordingPublishedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // ── 3. Update Firestore ─────────────────────────────────────────
    const docId = livestreamId || callId;
    await adminDb.collection("livestreams").doc(docId).set(payload, { merge: true });

    return NextResponse.json({
      success: true,
      callId,
      filename,
      recordingUrl: proxyUrl,
    });

  } catch (error: any) {
    console.error("publish-recording error:", error);
    return NextResponse.json(
      { error: error?.message || "Kunne ikke udgive optagelse." },
      { status: 500 }
    );
  }
}
