import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function CheckoutSuccessPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-white/5 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
                {/* Success Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-emerald-500/20 blur-[100px] pointer-events-none" />

                <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 relative z-10">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-3 relative z-10">Payment Successful!</h1>
                <p className="text-slate-400 mb-8 relative z-10">
                    Your new module has been successfully unlocked. Your workspace quotas have been updated automatically.
                </p>

                <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/25 relative z-10"
                >
                    Return to Dashboard
                    <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </div>
    );
}
