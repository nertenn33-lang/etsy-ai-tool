/**
 * Waitlist signup: capture email. Logs to console (Vercel logs); optional file write when writable.
 * No DB or external service required — safe for landing-only deploy.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { email } = parsed.data;

    // Log for lead capture (Vercel logs / run output)
    console.log("[waitlist] email=%s", email.replace(/(.{2}).*(@.*)/, "$1***$2"));

    // Optional: append to file when writable (e.g. local /tmp; Vercel serverless often read-only)
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const dir = path.join(process.cwd(), "tmp");
      const file = path.join(dir, "waitlist.json");
      await fs.mkdir(dir, { recursive: true }).catch(() => {});
      const existing: string[] = [];
      try {
        const raw = await fs.readFile(file, "utf-8");
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) existing.push(...arr.map(String));
      } catch {
        // new file
      }
      if (!existing.includes(email)) {
        existing.push(email);
        await fs.writeFile(file, JSON.stringify(existing, null, 2), "utf-8");
      }
    } catch {
      // ignore file errors (e.g. Vercel read-only)
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waitlist]", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
