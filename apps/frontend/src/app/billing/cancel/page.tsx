import Link from "next/link";
import { XCircle, ArrowLeft } from "lucide-react";

export default function CheckoutCancelPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-white/5 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
                {/* Error Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-red-500/10 blur-[100px] pointer-events-none" />

                <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6 relative z-10">
                    <XCircle className="w-10 h-10 text-red-400" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-3 relative z-10">Checkout Canceled</h1>
                <p className="text-slate-400 mb-8 relative z-10">
                    Your transaction was aborted. No charges were made to your account and your modules were not upgraded.
                </p>

                <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all relative z-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Billing
                </Link>
            </div>
        </div>
    );
}
