"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
    Search, Users, PhoneCall, Mail, Megaphone, Zap, ArrowRight, ArrowUpRight,
    Loader2, Globe, Phone, TrendingUp, CheckCircle2, Circle, Clock,
    Sparkles, Target, BarChart3, Activity
} from "lucide-react";

interface Lead {
    id: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
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
        const completedCampaigns = campaigns.filter(c => c.status === "COMPLETED").length;
        const contactRate = leads.length > 0 ? Math.round(((leadsWithEmail + leadsWithPhone) / (leads.length * 2)) * 100) : 0;

        return {
            totalLeads: leads.length,
            leadsWithEmail,
            leadsWithPhone,
            totalCampaigns,
            runningCampaigns,
            completedCampaigns,
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

    // Generate a simple bar chart from leads per day (last 7 days)
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
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-full">
            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {getGreeting()}, <span className="text-indigo-400">{user?.firstName || "there"}</span> 👋
                    </h1>
                    <p className="text-slate-400 mt-1">Here's what's happening in your workspace today.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push("/dashboard/scraper")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20 text-sm"
                    >
                        <Search className="w-4 h-4" /> Start Scraping
                    </button>
                    <button
                        onClick={() => router.push("/dashboard/campaigns")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-all border border-white/5 text-sm"
                    >
                        <Megaphone className="w-4 h-4" /> New Campaign
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { name: "Total Leads", value: stats.totalLeads, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10", sub: `${stats.leadsWithPhone} with phone` },
                    { name: "Campaigns", value: stats.totalCampaigns, icon: Megaphone, color: "text-violet-400", bg: "bg-violet-500/10", sub: `${stats.runningCampaigns} running` },
                    { name: "Emails Available", value: stats.leadsWithEmail, icon: Mail, color: "text-emerald-400", bg: "bg-emerald-500/10", sub: `${leads.length > 0 ? Math.round((stats.leadsWithEmail / leads.length) * 100) : 0}% coverage` },
                    { name: "Contact Rate", value: `${stats.contactRate}%`, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10", sub: "email + phone" },
                ].map(stat => (
                    <div key={stat.name} className="p-5 rounded-2xl bg-slate-900 border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-white mb-0.5">{stat.value}</div>
                        <div className="text-xs text-slate-500">{stat.name}</div>
                        <div className="text-[11px] text-slate-600 mt-1">{stat.sub}</div>
                    </div>
                ))}
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left: Lead Activity Chart + Recent Leads */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Lead Activity Chart */}
                    <div className="p-6 rounded-2xl bg-slate-900 border border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-indigo-400" /> Lead Activity
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Leads scraped over the last 7 days</p>
                            </div>
                            <span className="text-xs text-slate-500">Last 7 days</span>
                        </div>
                        <div className="flex items-end gap-3 h-32">
                            {leadsByDay.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                    <span className="text-[10px] text-slate-500 font-medium">{day.count}</span>
                                    <div className="w-full relative rounded-t-md overflow-hidden bg-slate-800" style={{ height: "100%" }}>
                                        <div
                                            className="absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-500"
                                            style={{ height: `${Math.max((day.count / maxLeadsInDay) * 100, 4)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-600">{day.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Leads */}
                    <div className="rounded-2xl bg-slate-900 border border-white/5 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-400" /> Recent Leads
                            </h3>
                            <button
                                onClick={() => router.push("/dashboard/leads")}
                                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                            >
                                View all <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        {recentLeads.length === 0 ? (
                            <div className="px-6 py-10 text-center text-slate-500 text-sm">
                                No leads yet. Start scraping to populate your CRM!
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {recentLeads.map(lead => (
                                    <div key={lead.id} className="flex items-center gap-3 px-6 py-3 hover:bg-white/[0.02] transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/5 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-indigo-300">
                                                {(lead.companyName || "?")[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-white truncate">{lead.companyName || "Unknown"}</div>
                                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                                                {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>}
                                                {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${lead.status === "NEW"
                                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                            : "bg-slate-800 text-slate-400 border-slate-700"
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Quick Actions + Campaigns */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => router.push("/dashboard/scraper")}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group text-left"
                            >
                                <div className="p-2 rounded-lg bg-indigo-500/10">
                                    <Search className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-white">Find Leads</div>
                                    <div className="text-[11px] text-slate-500">Scrape B2B prospects</div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                            </button>

                            <button
                                onClick={() => router.push("/dashboard/campaigns")}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group text-left"
                            >
                                <div className="p-2 rounded-lg bg-violet-500/10">
                                    <Megaphone className="w-4 h-4 text-violet-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-white">Launch Campaign</div>
                                    <div className="text-[11px] text-slate-500">AI calls or email outreach</div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
                            </button>

                            <button
                                onClick={() => router.push("/dashboard/leads")}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group text-left"
                            >
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                    <Target className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-white">Manage Leads</div>
                                    <div className="text-[11px] text-slate-500">View your CRM</div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                            </button>
                        </div>
                    </div>

                    {/* Recent Campaigns */}
                    <div className="rounded-2xl bg-slate-900 border border-white/5 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Activity className="w-4 h-4 text-violet-400" /> Campaigns
                            </h3>
                            <button
                                onClick={() => router.push("/dashboard/campaigns")}
                                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                            >
                                View all <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        {recentCampaigns.length === 0 ? (
                            <div className="px-6 py-10 text-center text-slate-500 text-sm">
                                No campaigns yet. Create one to get started!
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {recentCampaigns.map(c => (
                                    <div key={c.id} className="flex items-center gap-3 px-6 py-3 hover:bg-white/[0.02] transition-colors">
                                        <div className={`p-2 rounded-lg ${c.moduleType === "AI_CALL" ? "bg-violet-500/10" : "bg-emerald-500/10"}`}>
                                            {c.moduleType === "AI_CALL"
                                                ? <PhoneCall className="w-3.5 h-3.5 text-violet-400" />
                                                : <Mail className="w-3.5 h-3.5 text-emerald-400" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-white truncate">{c.name}</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                {c.totalItems ?? 0} leads · {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${c.status === "DRAFT" ? "bg-slate-800 text-slate-400 border-slate-700" :
                                            c.status === "RUNNING" || c.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                c.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                    "bg-red-500/10 text-red-400 border-red-500/20"
                                            }`}>
                                            {c.status === "RUNNING" || c.status === "IN_PROGRESS" ? (
                                                <span className="flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" /> RUNNING</span>
                                            ) : c.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pipeline Summary */}
                    <div className="rounded-2xl bg-slate-900 border border-white/5 p-6">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                            <Zap className="w-4 h-4 text-amber-400" /> Pipeline Summary
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: "New Leads", count: leads.filter(l => l.status === "NEW").length, color: "bg-blue-500", total: leads.length },
                                { label: "Contacted", count: leads.filter(l => l.status === "CONTACTED").length, color: "bg-amber-500", total: leads.length },
                                { label: "Qualified", count: leads.filter(l => l.status === "QUALIFIED").length, color: "bg-emerald-500", total: leads.length },
                            ].map(item => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">{item.label}</span>
                                        <span className="text-slate-500">{item.count}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${item.color} transition-all duration-500`}
                                            style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
