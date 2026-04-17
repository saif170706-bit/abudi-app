import { NextResponse } from "next/server";
import { streamVideoServer } from "@/lib/streamVideoServer";
import { adminAuth } from "@/lib/firebaseAdmin";
import { z } from "zod";

// ── In-memory rate limiter (max 10 video tokens per minute per user) ───────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

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

// ── Optional body validation if callId is passed ──────────────────────────
const BodySchema = z.object({
  callId: z.string().min(1).max(256).optional(),
  callType: z.string().max(64).optional(),
}).optional();

export async function GET() {
  return NextResponse.json({ status: "warming" });
}

export async function POST(req: Request) {
  try {
    // ── Auth verification ──────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    if (!adminAuth) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const userId = decoded.uid;

    // ── Rate limiting ──────────────────────────────────────────────────
    if (isRateLimited(userId)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // ── Optional body validation ───────────────────────────────────────
    let body: z.infer<typeof BodySchema> = {};
    try {
      const raw = await req.json();
      const parsed = BodySchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Ugyldig input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      body = parsed.data;
    } catch {
      // Body is optional — proceed without it
    }

    // ── Issue Stream Video token ───────────────────────────────────────
    const streamToken = streamVideoServer.createToken(userId);
    return NextResponse.json({ token: streamToken });
  } catch (err: any) {
    console.error("Error in /api/stream/video-token:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create token" },
      { status: 500 }
    );
  }
}