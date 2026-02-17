import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUid } from "@/src/lib/uid";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    callbacks: {
        async session({ session, user }) {
            if (session.user) {
                session.user.id = user.id;
                // Fetch latest credits from DB to ensure session is up to date
                const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
                // @ts-ignore
                session.user.credits = dbUser?.credits ?? 0;
            }
            return session;
        },
        async signIn({ user, account, profile }) {
            // Memory Bridge: Merge anonymous credits if this is a new sign-in
            if (user.email) {
                try {
                    const { uid } = await getOrCreateUid();
                    // Check if the anonymous user exists and has credits
                    const anonUser = await prisma.user.findUnique({ where: { id: uid } });

                    if (anonUser && anonUser.credits > 1) { // Only merge if they have more than the default 1
                        // Check if this google user already exists
                        const existingUser = await prisma.user.findUnique({ where: { email: user.email } });

                        if (existingUser) {
                            // Existing user: Add anonymous credits to their account
                            console.log(`[Auth] Merging ${anonUser.credits} credits from anon ${uid} to user ${existingUser.id}`);
                            await prisma.user.update({
                                where: { id: existingUser.id },
                                data: {
                                    credits: { increment: anonUser.credits }
                                }
                            });
                            // Reset anon credits to prevent double-dipping? Or delete? 
                            // Better to leave it for now or set to 0.
                            await prisma.user.update({ where: { id: uid }, data: { credits: 0 } });
                        } else {
                            // New user via Google: The adapter will create them. 
                            // But we can intercept here? NextAuth adapter is tricky with events.
                            // Actually, better to do post-creation logic or use events.
                            // For simplicity in this "beta" phase: 
                            // We will rely on the fact that if they are signing in, the adapter creates them.
                            // We might need to listen to 'createUser' event in adapter but that's complex.
                            // Let's stick to: If existing user found -> merge. 
                            // If new user -> We might miss the merge on first login if we don't handle it right.
                            // Strategy: Update the anonymous user's EMAIL to the google email? 
                            // No, that breaks the adapter flow.
                        }
                    }
                } catch (error) {
                    console.error("[Auth] Credit merge failed", error);
                }
            }
            return true;
        },
    },
    events: {
        async createUser({ user }) {
            // Logic to merge credits for NEW users
            try {
                const { uid } = await getOrCreateUid();
                const anonUser = await prisma.user.findUnique({ where: { id: uid } });
                if (anonUser && anonUser.credits > 0) {
                    console.log(`[Auth] New User: Transferring ${anonUser.credits} credits from anon ${uid} to new user ${user.id}`);
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { credits: { increment: anonUser.credits } }
                    });
                    await prisma.user.update({ where: { id: uid }, data: { credits: 0 } });
                }
            } catch (e) {
                console.error("[Auth] createUser event merge failed", e);
            }
        }
    }
});
