import { NextResponse } from "next/server";
import { serverClient } from "@/lib/streamServer";
import { adminAuth } from "@/lib/firebaseAdmin";
import { z } from "zod";

// ── Zod schema: validate each user object in the array ────────────────────
const UserSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().max(256).optional(),
  image: z.string().url().optional().or(z.literal("")),
  role: z.enum(["student", "teacher", "admin"]).optional(),
});

const BodySchema = z.object({
  users: z.array(UserSchema).min(1).max(50),
});

export async function POST(req: Request) {
  try {
    // ── Auth verification ──────────────────────────────────────────────
    if (!adminAuth) throw new Error("Firebase Admin SDK not initialized.");

    const authHeader = req.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 });
    }

    await adminAuth.verifyIdToken(match[1]);

    // ── Input validation ───────────────────────────────────────────────
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ugyldig input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { users } = parsed.data;

    await serverClient.upsertUsers(
      users.map((u) => ({
        id: u.id,
        name: u.name || undefined,
        image: u.image || undefined,
      }))
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Error in /api/stream/upsert-users:", e);
    return NextResponse.json({ error: e?.message || "Upsert failed" }, { status: 500 });
  }
}
