import { signIn } from "@/auth";
import { Zap } from "lucide-react";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl text-center shadow-2xl">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                    <Zap className="h-8 w-8" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-white">Welcome Back</h1>
                <p className="mb-8 text-sm text-slate-400">
                    Sign in to save your credits and access your history from any device.
                </p>

                <form
                    action={async (formData) => {
                        "use server";
                        await signIn("resend", formData);
                    }}
                    className="w-full space-y-4"
                >
                    <input
                        type="email"
                        name="email"
                        placeholder="name@example.com"
                        required
                        className="w-full rounded-lg bg-slate-800/50 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-500 hover:scale-[1.02] shadow-lg shadow-indigo-500/25"
                        type="submit"
                    >
                        <Zap className="h-4 w-4" />
                        Send Magic Link
                    </button>
                </form>
            </div>
        </div>
    );
}
