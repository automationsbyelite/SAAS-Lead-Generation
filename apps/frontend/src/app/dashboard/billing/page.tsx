"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import toast from "react-hot-toast";
import { CreditCard, CheckCircle2, Bot, Mail, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface TenantQuota {
    name: string;
    enabledModules: string[];
}

export default function BillingPage() {
    const { user } = useAuth();
    const [quota, setQuota] = useState<TenantQuota | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState<string | null>(null);

    useEffect(() => {
        fetchQuota();
    }, []);

    const fetchQuota = async () => {
        try {
            const { data } = await api.get("/tenants/me");
            setQuota(data);
        } catch (error) {
            console.error("Failed to fetch quota", error);
            toast.error("Could not load your workspace metrics.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckout = async (moduleType: string) => {
        setIsRedirecting(moduleType);
        try {
            const { data } = await api.post("/billing/checkout", { moduleType });
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to initiate checkout");
            setIsRedirecting(null);
        }
    };

    const hasAI = quota?.enabledModules?.includes("AI_CALL");
    const hasEmail = quota?.enabledModules?.includes("EMAIL");
    const hasScraperPro = quota?.enabledModules?.includes("SCRAPER_PRO");

    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing & Modules</h1>
                <p className="text-slate-400 mt-2">Manage your active subscriptions and expand your platform capabilities.</p>
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Current Workspace: {quota?.name || "..."}</h3>
                        <p className="text-sm text-slate-400">Module entitlements refresh every billing cycle.</p>
                    </div>
                </div>
                <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Core Scraper Access: ACTIVE
                </div>
            </div>

            <h2 className="text-xl font-bold text-white mt-12 mb-6">Available Upgrade Modules</h2>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Scraper Pro Module */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative p-8 rounded-2xl border ${hasScraperPro ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-slate-900 border-white/5'} flex flex-col`}
                >
                    {hasScraperPro && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> UNLOCKED
                        </div>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Scraper Pro</h3>
                    <p className="text-slate-400 mb-6 text-sm flex-1">
                        Remove the 10-lead restriction. Scrape up to 1,000 leads per query and instantly populate your CRM with massive datasets.
                    </p>
                    <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 1,000 Leads Per Search
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Priority Worker Queue
                        </div>
                    </div>

                    <button
                        onClick={() => handleCheckout("SCRAPER_PRO")}
                        disabled={hasScraperPro || isRedirecting !== null}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${hasScraperPro
                            ? 'bg-white/5 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                            }`}
                    >
                        {isRedirecting === "SCRAPER_PRO" ? <Loader2 className="w-5 h-5 animate-spin" /> : hasScraperPro ? "Already Activated" : "Purchase for $29/mo"}
                    </button>
                </motion.div>

                {/* AI Voice Caller Module */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative p-8 rounded-2xl border ${hasAI ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-slate-900 border-white/5'} flex flex-col`}
                >
                    {hasAI && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> UNLOCKED
                        </div>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 mb-6">
                        <Bot className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">AI Voice Agent</h3>
                    <p className="text-slate-400 mb-6 text-sm flex-1">
                        Unlock the VAPI conversational AI engine to automatically call the leads you scrape. Schedule meetings fully autonomously.
                    </p>
                    <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Custom System Prompts
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Webhook Call Transcripts
                        </div>
                    </div>

                    <button
                        onClick={() => handleCheckout("AI_CALL")}
                        disabled={hasAI || isRedirecting !== null}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${hasAI
                            ? 'bg-white/5 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                            }`}
                    >
                        {isRedirecting === "AI_CALL" ? <Loader2 className="w-5 h-5 animate-spin" /> : hasAI ? "Already Activated" : "Purchase for $99/mo"}
                    </button>
                </motion.div>

                {/* Email Outreach Module */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`relative p-8 rounded-2xl border ${hasEmail ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-slate-900 border-white/5'} flex flex-col`}
                >
                    {hasEmail && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> UNLOCKED
                        </div>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                        <Mail className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Email Sequencing</h3>
                    <p className="text-slate-400 mb-6 text-sm flex-1">
                        Unlock the standard SMTP mass-email engine. Automatically import scraped leads and blast out formatted HTML pitches.
                    </p>
                    <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Automated SMTP Sending
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> High-volume Delivery Rates
                        </div>
                    </div>

                    <button
                        onClick={() => handleCheckout("EMAIL")}
                        disabled={hasEmail || isRedirecting !== null}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${hasEmail
                            ? 'bg-white/5 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                            }`}
                    >
                        {isRedirecting === "EMAIL" ? <Loader2 className="w-5 h-5 animate-spin" /> : hasEmail ? "Already Activated" : "Purchase for $49/mo"}
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
