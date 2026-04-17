import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { serverClient } from "@/lib/streamServer";
import { z } from "zod";

// ── In-memory rate limiter (resets on server restart) ──────────────────────
// For production, use Redis or Upstash instead
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(uid: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(uid);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(uid, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT) return true;

  entry.count++;
  return false;
}

export async function GET() {
  return NextResponse.json({ status: "warming" });
}

export async function POST(req: Request) {
  try {
    if (!adminAuth) {
      throw new Error("Firebase Admin SDK is not initialized.");
    }

    // ── Auth verification ──────────────────────────────────────────────
    const authHeader = req.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 });
    }

    const idToken = match[1];
    const decoded = await adminAuth.verifyIdToken(idToken);

    // ── Rate limiting ──────────────────────────────────────────────────
    if (isRateLimited(decoded.uid)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // ── Issue token ────────────────────────────────────────────────────
    const streamToken = serverClient.createToken(decoded.uid);
    return NextResponse.json({ token: streamToken });
  } catch (err: any) {
    console.error("Error in /api/stream/token:", err);
    return NextResponse.json(
      { error: "Failed to create Stream token", details: err.message },
      { status: 500 }
    );
  }
}