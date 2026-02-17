
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { uidCookieOptions } from "@/src/lib/uid";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Invalid email" }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find user by email
        const user = await prisma.user.findFirst({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return NextResponse.json({ error: "No purchase found for this email." }, { status: 404 });
        }

        // Return success and SET the cookie to this user's ID
        // This effectively "logs them in" on this device.
        const response = NextResponse.json({
            success: true,
            credits: user.credits,
            message: "Restored successfully"
        });

        response.cookies.set("uid", user.id, uidCookieOptions);

        return response;

    } catch (e: any) {
        console.error("Restore API Error:", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
