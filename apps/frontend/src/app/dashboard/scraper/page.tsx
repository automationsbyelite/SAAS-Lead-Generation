"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useSocketContext } from "@/components/providers/SocketProvider";
import { Search, MapPin, AtSign, Loader2, ArrowRight, ShieldAlert, Hash, ChevronDown, Zap, CheckCircle2 } from "lucide-react";

const POPULAR_LOCATIONS = [
    "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX",
    "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA",
    "Dallas, TX", "Austin, TX", "Jacksonville, FL", "San Jose, CA",
    "Fort Worth, TX", "Columbus, OH", "Charlotte, NC", "Indianapolis, IN",
    "San Francisco, CA", "Seattle, WA", "Denver, CO", "Washington, DC",
    "Boston, MA", "Miami, FL", "Atlanta, GA", "Toronto, ON", "London, UK",
    "Sydney, NSW", "Dubai, UAE", "Singapore"
];

export default function ScraperPage() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [location, setLocation] = useState("");
    const [emailDomain, setEmailDomain] = useState("");
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
    const [limit, setLimit] = useState<number>(10);
    const [isLoading, setIsLoading] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const [showProgress, setShowProgress] = useState(false);

    // Quota state
    const [quotaUsed, setQuotaUsed] = useState(0);
    const [quotaLimit, setQuotaLimit] = useState(10);
    const [quotaRemaining, setQuotaRemaining] = useState(10);

    const { scraperProgress, scraperDone, resetScraperState } = useSocketContext();
    const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Fetch quota info
        api.get("/scraper/quota").then((res) => {
            const q = res.data;
            setIsPro(q.isPro);
            if (!q.isPro) {
                setQuotaUsed(q.used);
                setQuotaLimit(q.totalLimit);
                setQuotaRemaining(q.remaining);
                // Set default limit to remaining or 10, whichever is smaller
                setLimit(Math.min(q.remaining, 10));
            }
        }).catch(err => console.error(err));
    }, []);

    // Listen for progress events and show the overlay
    useEffect(() => {
        if (scraperProgress && showProgress) {
            // Progress is being tracked
        }
    }, [scraperProgress, showProgress]);

    // Auto-redirect when scraper is done
    useEffect(() => {
        if (scraperDone && showProgress) {
            redirectTimerRef.current = setTimeout(() => {
                resetScraperState();
                setShowProgress(false);
                setIsLoading(false);
                router.push("/dashboard/leads");
            }, 1500);
        }
        return () => {
            if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
        };
    }, [scraperDone, showProgress, router, resetScraperState]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        resetScraperState();

        try {
            await api.post("/scraper/jobs", { query, location, emailDomain: emailDomain || undefined, limit });
            setShowProgress(true);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to queue scraper job");
            setIsLoading(false);
        }
    };

    const progress = scraperProgress?.progress ?? 0;
    const found = scraperProgress?.found ?? 0;
    const statusText = scraperProgress?.status ?? "Initializing search engine...";
    const quotaExhausted = !isPro && quotaRemaining <= 0;
    const quotaPercent = !isPro ? Math.min(100, Math.round((quotaUsed / quotaLimit) * 100)) : 0;

    return (
        <div className="max-w-3xl relative">
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Scraper Engine</h1>
                    <p className="text-slate-400 mt-2">Deploy background workers to find fresh B2B leads by querying the web.</p>
                </div>
                {!isPro && (
                    <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg flex items-center gap-2 text-sm font-medium">
                        <ShieldAlert className="w-4 h-4" />
                        Free Tier ({quotaUsed} / {quotaLimit} leads)
                    </div>
                )}
            </div>

            {/* Quota Usage Bar (Free users only) */}
            {!isPro && (
                <div className={`mb-6 p-4 rounded-xl border ${quotaExhausted ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900 border-white/5'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-300">
                            {quotaExhausted ? '🚫 Lead Quota Exhausted' : '📊 Lead Quota'}
                        </span>
                        <span className={`text-sm font-bold ${quotaExhausted ? 'text-red-400' : 'text-indigo-400'}`}>
                            {quotaUsed} / {quotaLimit}
                        </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${quotaPercent}%`,
                                background: quotaExhausted
                                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                    : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            }}
                        />
                    </div>
                    {quotaExhausted && (
                        <p className="text-xs text-red-400/80 mt-2">
                            You&apos;ve used all {quotaLimit} free leads. Upgrade to Pro for unlimited scraping.
                        </p>
                    )}
                    {!quotaExhausted && quotaRemaining <= 5 && (
                        <p className="text-xs text-amber-400/80 mt-2">
                            Only {quotaRemaining} leads remaining on your free plan.
                        </p>
                    )}
                </div>
            )}

            {/* Progress Overlay */}
            {showProgress && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-10 max-w-md w-full mx-4 text-center shadow-2xl">
                        {/* Animated Icon */}
                        <div className="mb-6 flex justify-center">
                            {scraperDone ? (
                                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-bounce">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                </div>
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center relative">
                                    <Zap className="w-10 h-10 text-indigo-400 animate-pulse" />
                                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
                                </div>
                            )}
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {scraperDone ? "Leads Ready!" : "Fetching Leads"}
                        </h2>
                        <p className="text-sm text-slate-400 mb-6 truncate px-4">{statusText}</p>

                        {/* Progress Bar */}
                        <div className="relative mb-3">
                            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500 ease-out"
                                    style={{
                                        width: `${scraperDone ? 100 : progress}%`,
                                        background: scraperDone
                                            ? "linear-gradient(90deg, #10b981, #34d399)"
                                            : "linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)"
                                    }}
                                />
                            </div>
                        </div>

                        {/* Percentage */}
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">{found} leads verified</span>
                            <span className={`font-bold text-lg ${scraperDone ? "text-emerald-400" : "text-indigo-400"}`}>
                                {scraperDone ? 100 : progress}%
                            </span>
                        </div>

                        {scraperDone && (
                            <p className="text-sm text-emerald-400/70 mt-4 animate-pulse">
                                Redirecting to Leads CRM...
                            </p>
                        )}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-slate-900 border border-white/5 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Search Query / Keyword</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            required
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            placeholder="e.g. Real Estate Agents, Plumbers"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">The core keyword describing your target prospects.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MapPin className="h-5 w-5 text-slate-500" />
                            </div>
                            <input
                                type="text"
                                required
                                value={location}
                                onFocus={() => setIsLocationDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setIsLocationDropdownOpen(false), 200)}
                                onChange={(e) => {
                                    setLocation(e.target.value);
                                    setIsLocationDropdownOpen(true);
                                }}
                                className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                placeholder="e.g. Dallas, TX"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <ChevronDown className="h-4 w-4 text-slate-500" />
                            </div>
                            {isLocationDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {POPULAR_LOCATIONS.filter(loc => loc.toLowerCase().includes(location.toLowerCase())).length > 0 ? (
                                        POPULAR_LOCATIONS.filter(loc => loc.toLowerCase().includes(location.toLowerCase())).map((loc) => (
                                            <button
                                                key={loc}
                                                type="button"
                                                onClick={() => {
                                                    setLocation(loc);
                                                    setIsLocationDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm"
                                            >
                                                {loc}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-2 text-sm text-slate-500">Press enter to use custom location</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Specific Domain (Optional)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <AtSign className="h-5 w-5 text-slate-500" />
                            </div>
                            <input
                                type="text"
                                value={emailDomain}
                                onChange={(e) => setEmailDomain(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                placeholder="e.g. gmail.com"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Number of Leads
                        {!isPro && <span className="ml-2 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{quotaRemaining} remaining</span>}
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Hash className="h-5 w-5 text-slate-500" />
                        </div>
                        <input
                            type="number"
                            required
                            min={1}
                            max={isPro ? 1000 : quotaRemaining}
                            value={limit}
                            onChange={(e) => setLimit(parseInt(e.target.value) || 1)}
                            className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                            disabled={!isPro && quotaExhausted}
                        />
                    </div>
                    {!isPro && !quotaExhausted && <p className="text-xs text-slate-500 mt-2">You can scrape up to {quotaRemaining} more leads on your free plan.</p>}
                    {!isPro && quotaExhausted && <p className="text-xs text-red-400 mt-2">No leads remaining. Upgrade to Pro for unlimited access.</p>}
                </div>

                <div className="pt-4 border-t border-white/5">
                    <button
                        type="submit"
                        disabled={isLoading || quotaExhausted}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {quotaExhausted ? (
                            <>
                                <ShieldAlert className="w-5 h-5" />
                                Upgrade to Pro to Continue
                            </>
                        ) : isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                Queue Search Job
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
