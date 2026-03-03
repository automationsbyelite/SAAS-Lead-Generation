"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
    Search, Users, PhoneCall, Mail, Megaphone, Zap, ArrowRight,
    Loader2, TrendingUp, Sparkles, Target, BarChart3, Activity
} from "lucide-react";

interface Lead {
    id: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    createdAt: string;
}

interface Campaign {
    id: string;
    name: string;
    moduleType: "AI_CALL" | "EMAIL";
    status: string;
    totalItems?: number;
    createdAt: string;
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [leadsRes, campaignsRes] = await Promise.all([
                api.get("/leads"),
                api.get("/campaigns"),
            ]);
            setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : leadsRes.data.data || []);
            setCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : campaignsRes.data.data || []);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const stats = useMemo(() => {
        const leadsWithEmail = leads.filter(l => l.email).length;
        const leadsWithPhone = leads.filter(l => l.phone).length;
        const totalCampaigns = campaigns.length;
        const runningCampaigns = campaigns.filter(c => c.status === "RUNNING" || c.status === "IN_PROGRESS").length;
        const contactRate = leads.length > 0 ? Math.round(((leadsWithEmail + leadsWithPhone) / (leads.length * 2)) * 100) : 0;

        return {
            totalLeads: leads.length,
            leadsWithEmail,
            leadsWithPhone,
            totalCampaigns,
            runningCampaigns,
            contactRate,
        };
    }, [leads, campaigns]);

    const recentLeads = useMemo(() =>
        [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
        [leads]
    );

    const recentCampaigns = useMemo(() =>
        [...campaigns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
        [campaigns]
    );

    const leadsByDay = useMemo(() => {
        const days: { label: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
            const dateStr = d.toISOString().split("T")[0];
            const count = leads.filter(l => l.createdAt?.startsWith(dateStr)).length;
            days.push({ label: dayStr, count });
        }
        return days;
    }, [leads]);

    const maxLeadsInDay = Math.max(...leadsByDay.map(d => d.count), 1);

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20" />
                    <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin absolute inset-0" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8 max-w-full"
        >
            {/* Welcome Header */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white">
                        {getGreeting()}, <span className="text-gradient">{user?.firstName || "there"}</span> 👋
                    </h1>
                    <p className="text-sm lg:text-base text-slate-400 mt-2">Here's what's happening in your workspace today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/dashboard/scraper")}
                        className="glass-button flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl text-sm shadow-[0_0_20px_rgba(99,102,241,0.2)] border-indigo-500/30 hover:border-indigo-400"
                    >
                        <Search className="w-4 h-4 text-indigo-400" /> Start Scraping
                    </button>
                    <button
                        onClick={() => router.push("/dashboard/campaigns")}
                        className="glass-button flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl text-sm border-white/5 hover:border-white/20"
                    >
                        <Megaphone className="w-4 h-4 text-violet-400" /> New Campaign
                    </button>
                </div>
            </motion.div>

            {/* Key Metrics */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {[
                    { name: "Total Leads", value: stats.totalLeads, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10", shadow: "shadow-indigo-500/20", sub: `${stats.leadsWithPhone} with phone` },
                    { name: "Campaigns", value: stats.totalCampaigns, icon: Megaphone, color: "text-violet-400", bg: "bg-violet-500/10", shadow: "shadow-violet-500/20", sub: `${stats.runningCampaigns} running` },
                    { name: "Emails Available", value: stats.leadsWithEmail, icon: Mail, color: "text-emerald-400", bg: "bg-emerald-500/10", shadow: "shadow-emerald-500/20", sub: `${leads.length > 0 ? Math.round((stats.leadsWithEmail / leads.length) * 100) : 0}% coverage` },
                    { name: "Contact Rate", value: `${stats.contactRate}%`, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10", shadow: "shadow-amber-500/20", sub: "email + phone" },
                ].map(stat => (
                    <div key={stat.name} className="glass-card p-6 border-white/5 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700`} />
                        <div className="flex items-center justify-between mb-4 relative">
                            <div className={`p-3 rounded-xl ${stat.bg} shadow-[0_0_15px_rgba(0,0,0,0)] group-hover:${stat.shadow} transition-shadow duration-300`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1 tracking-tight">{stat.value}</div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.name}</div>
                        <div className="text-[11px] text-slate-500 mt-1">{stat.sub}</div>
                    </div>
                ))}
            </motion.div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Left: Lead Activity Chart + Recent Leads */}
                <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                    {/* Lead Activity Chart */}
                    <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-6 lg:p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" /> Lead Activity
                                </h3>
                                <p className="text-sm text-slate-400 mt-1">Leads scraped over the last 7 days</p>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300">Last 7 days</span>
                        </div>
                        <div className="flex items-end gap-4 h-40">
                            {leadsByDay.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group cursor-crosshair">
                                    <span className="text-[11px] text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity -translate-y-2 group-hover:translate-y-0 duration-300">{day.count}</span>
                                    <div className="w-full relative rounded-t-lg overflow-hidden bg-slate-800/50 border border-white/5 border-b-0 h-full group-hover:bg-slate-800 transition-colors">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.max((day.count / maxLeadsInDay) * 100, 4)}%` }}
                                            transition={{ duration: 1, delay: i * 0.1, type: "spring", bounce: 0.2 }}
                                            className="absolute bottom-0 left-0 right-0 rounded-t-lg bg-gradient-to-t from-indigo-600 to-violet-400 shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:brightness-110"
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-slate-500 group-hover:text-slate-300 transition-colors">{day.label}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Recent Leads */}
                    <motion.div variants={itemVariants} className="glass-panel rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-white/5 bg-white/[0.02]">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" /> Recent Leads
                            </h3>
                            <button
                                onClick={() => router.push("/dashboard/leads")}
                                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors font-medium"
                            >
                                View all <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        {recentLeads.length === 0 ? (
                            <div className="px-8 py-12 text-center">
                                <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center mb-4">
                                    <Users className="w-8 h-8 text-slate-500" />
                                </div>
                                <h4 className="text-white font-medium mb-1">No leads yet</h4>
                                <p className="text-slate-400 text-sm">Start scraping to populate your CRM pipeline!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {recentLeads.map(lead => (
                                    <div key={lead.id} className="flex items-center gap-4 px-6 lg:px-8 py-4 hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:border-indigo-500/50 transition-all duration-300 shadow-lg">
                                            <span className="text-sm font-bold text-indigo-300">
                                                {(lead.companyName || "?")[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate group-hover:text-indigo-200 transition-colors">{lead.companyName || "Unknown"}</div>
                                            <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500 mt-1">
                                                {lead.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {lead.email}</span>}
                                                {lead.phone && <span className="flex items-center gap-1.5"><PhoneCall className="w-3 h-3" /> {lead.phone}</span>}
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold border ${lead.status === "NEW"
                                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                                            : "bg-slate-800 text-slate-400 border-slate-700"
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Right: Quick Actions + Campaigns */}
                <div className="space-y-6 lg:space-y-8">
                    {/* Quick Actions */}
                    <motion.div variants={itemVariants} className="glass-panel rounded-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-50 pointer-events-none" />
                        <div className="relative p-6 lg:p-8">
                            <div className="flex items-center gap-2.5 mb-6">
                                <Sparkles className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                <h3 className="text-base font-bold text-white">Quick Actions</h3>
                            </div>
                            <div className="space-y-3">
                                <button
                                    onClick={() => router.push("/dashboard/scraper")}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-950/50 hover:bg-slate-900 border border-white/5 hover:border-indigo-500/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all group text-left"
                                >
                                    <div className="p-2.5 rounded-lg bg-indigo-500/10 shadow-inner group-hover:scale-110 transition-transform">
                                        <Search className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors">Find Leads</div>
                                        <div className="text-xs text-slate-400 mt-0.5">Scrape B2B prospects</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors -translate-x-2 group-hover:translate-x-0" />
                                </button>

                                <button
                                    onClick={() => router.push("/dashboard/campaigns")}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-950/50 hover:bg-slate-900 border border-white/5 hover:border-violet-500/30 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all group text-left"
                                >
                                    <div className="p-2.5 rounded-lg bg-violet-500/10 shadow-inner group-hover:scale-110 transition-transform">
                                        <Megaphone className="w-4 h-4 text-violet-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-white group-hover:text-violet-200 transition-colors">Launch Campaign</div>
                                        <div className="text-xs text-slate-400 mt-0.5">AI calls or email outreach</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors -translate-x-2 group-hover:translate-x-0" />
                                </button>

                                <button
                                    onClick={() => router.push("/dashboard/leads")}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-950/50 hover:bg-slate-900 border border-white/5 hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all group text-left"
                                >
                                    <div className="p-2.5 rounded-lg bg-emerald-500/10 shadow-inner group-hover:scale-110 transition-transform">
                                        <Target className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-white group-hover:text-emerald-200 transition-colors">Manage Leads</div>
                                        <div className="text-xs text-slate-400 mt-0.5">View your CRM</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors -translate-x-2 group-hover:translate-x-0" />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Recent Campaigns */}
                    <motion.div variants={itemVariants} className="glass-panel rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-white/5 bg-white/[0.02]">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" /> Campaigns
                            </h3>
                            <button
                                onClick={() => router.push("/dashboard/campaigns")}
                                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors font-medium"
                            >
                                View all <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        {recentCampaigns.length === 0 ? (
                            <div className="px-6 py-10 text-center">
                                <p className="text-slate-500 text-sm">No campaigns yet. Create one to get started!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {recentCampaigns.map(c => (
                                    <div key={c.id} className="flex items-center gap-4 px-6 lg:px-8 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                        <div className={`p-2.5 rounded-xl border border-white/5 group-hover:scale-110 transition-transform ${c.moduleType === "AI_CALL" ? "bg-violet-500/10 shadow-[0_0_10px_rgba(139,92,246,0.1)]" : "bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]"}`}>
                                            {c.moduleType === "AI_CALL"
                                                ? <PhoneCall className="w-4 h-4 text-violet-400" />
                                                : <Mail className="w-4 h-4 text-emerald-400" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{c.name}</div>
                                            <div className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">
                                                {c.totalItems ?? 0} leads · {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold border ${c.status === "DRAFT" ? "bg-slate-800 text-slate-400 border-slate-700" :
                                            c.status === "RUNNING" || c.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]" :
                                                c.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]" :
                                                    "bg-red-500/10 text-red-400 border-red-500/20"
                                            }`}>
                                            {c.status === "RUNNING" || c.status === "IN_PROGRESS" ? (
                                                <span className="flex items-center gap-1.5"><Loader2 className="w-2.5 h-2.5 animate-spin" /> RUNNING</span>
                                            ) : c.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
