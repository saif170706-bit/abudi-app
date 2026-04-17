import { NextResponse } from "next/server";
import { streamVideoServer } from "@/lib/streamVideoServer";
import { adminAuth } from "@/lib/firebaseAdmin";

/**
 * API route to securely list recordings for a specific call.
 * This uses the server-side client with administrative privileges.
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

    // Verify the Firebase ID token
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId, callType = 'livestream' } = await req.json();
    if (!callId) {
      return NextResponse.json({ error: "Missing callId" }, { status: 400 });
    }

    // Use the call instance method which is standard in the Node SDK for listing recordings
    const callInstance = streamVideoServer.video.call(callType, callId);
    const response = await callInstance.listRecordings();

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("Error in /api/stream/list-recordings:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list recordings" },
      { status: 500 }
    );
  }
}
