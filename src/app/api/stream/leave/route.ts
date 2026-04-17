import { NextResponse } from "next/server";
import { serverClient } from "@/lib/streamServer";
import { adminAuth } from "@/lib/firebaseAdmin";


export async function GET() {
  return NextResponse.json({ status: "warming up" });
}

export async function POST(req: Request) {
  try {
    if (!adminAuth) {
      throw new Error("Firebase Admin SDK not initialized.");
    }
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return new NextResponse("Missing auth token", { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { channelId, channelType, userName } = await req.json();

    if (!channelId || !channelType) {
      return new NextResponse("Missing channelId/channelType", { status: 400 });
    }

    const channel = serverClient.channel(channelType, channelId);

    // 1. Send departure message (if userName is provided)
    if (userName) {
        try {
            await channel.sendMessage({
                text: `${userName} har forladt chatten.`,
                type: 'system',
            });
        } catch (e) {
            console.error("Failed to send leave message, continuing removal:", e);
        }
    }

    // 2. Check current member count
    const state = await channel.query();
    const memberIds = Object.keys(state.members || {});
    
    if (memberIds.length <= 1) {
        // If they are the last one (or none left), delete the channel
        await channel.delete();
    } else {
        // Otherwise, just remove this specific user
        await channel.removeMembers([uid]);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("API leave error:", e);
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
