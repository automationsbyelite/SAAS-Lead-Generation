"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import {
    Loader2, Megaphone, Plus, Play, MoreVertical, Building2,
    Search, CheckCircle2, Circle, Users, Phone, Mail,
    ArrowRight, ArrowLeft, Zap, Globe, Trash2, ChevronDown, Tag, PlayCircle, Sparkles
} from "lucide-react";

interface Campaign {
    id: string;
    name: string;
    moduleType: "AI_CALL" | "EMAIL";
    status: string;
    customPrompt?: string;
    tenantId: string;
    totalItems?: number;
    createdAt: string;
}

interface Lead {
    id: string;
    companyName: string | null;
    contactName: string | null;
    category: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    status: string;
    createdAt: string;
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function CampaignsPage() {
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Wizard step control
    const [wizardStep, setWizardStep] = useState(0);

    // Lead selection
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
    const [leadSearch, setLeadSearch] = useState("");
    const [leadFilter, setLeadFilter] = useState<"all" | "with_email" | "with_phone">("all");
    const [leadCategoryFilter, setLeadCategoryFilter] = useState<string>("ALL");

    // Form state
    const [name, setName] = useState("");
    const [moduleType, setModuleType] = useState<"AI_CALL" | "EMAIL">("EMAIL");
    const [customPrompt, setCustomPrompt] = useState("");
    const [hasAiModule, setHasAiModule] = useState(false);
    const [hasEmailModule, setHasEmailModule] = useState(false);

    // Email config state
    const [emailSenderName, setEmailSenderName] = useState("");
    const [emailSenderRole, setEmailSenderRole] = useState("");
    const [emailSenderCompany, setEmailSenderCompany] = useState("");
    const [emailOffering, setEmailOffering] = useState("");
    const [emailPainPoint, setEmailPainPoint] = useState("");
    const [emailCtaText, setEmailCtaText] = useState("");
    const [emailCtaLink, setEmailCtaLink] = useState("");
    const [emailTone, setEmailTone] = useState("PROFESSIONAL");

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [viewMode, setViewMode] = useState<"mine" | "all">("all");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [campaignsRes, leadsRes, profileRes] = await Promise.all([
                api.get("/campaigns"),
                api.get("/leads"),
                api.get("/tenants/me")
            ]);
            setCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : campaignsRes.data.data || []);
            setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : leadsRes.data.data || []);

            const modules = profileRes.data.enabledModules || [];
            setHasAiModule(modules.includes("AI_CALL"));
            setHasEmailModule(modules.includes("EMAIL"));
            if (modules.includes("AI_CALL")) setModuleType("AI_CALL");
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast.error("Network sync failed");
        } finally {
            setIsLoading(false);
        }
    };

    const leadCategories = useMemo(() => {
        const cats = new Set<string>();
        leads.forEach(l => { if (l.category) cats.add(l.category); });
        return Array.from(cats).sort();
    }, [leads]);

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const filteredLeads = useMemo(() => {
        let result = leads;
        if (leadSearch) {
            const q = leadSearch.toLowerCase();
            result = result.filter(l =>
                l.companyName?.toLowerCase().includes(q) ||
                l.contactName?.toLowerCase().includes(q) ||
                l.phone?.includes(q) ||
                l.email?.toLowerCase().includes(q)
            );
        }
        if (leadFilter === "with_email") result = result.filter(l => l.email);
        if (leadFilter === "with_phone") result = result.filter(l => l.phone);
        if (leadCategoryFilter !== "ALL") result = result.filter(l => l.category === leadCategoryFilter);
        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [leads, leadSearch, leadFilter, leadCategoryFilter]);

    const filteredCampaigns = useMemo(() => {
        let result = campaigns;
        if (isSuperAdmin && viewMode === "mine" && user?.tenantId) {
            result = result.filter(c => c.tenantId === user.tenantId);
        } else if (isSuperAdmin && viewMode === "all" && user?.tenantId) {
            result = result.filter(c => c.tenantId !== user.tenantId);
        }
        if (statusFilter !== "ALL") result = result.filter(c => c.status === statusFilter);
        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [campaigns, statusFilter, viewMode, isSuperAdmin, user?.tenantId]);

    const toggleLead = (id: string) => {
        setSelectedLeadIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedLeadIds.size === filteredLeads.length) {
            setSelectedLeadIds(new Set());
        } else {
            setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
        }
    };

    const openWizard = () => {
        setWizardStep(1);
        setSelectedLeadIds(new Set());
        setName("");
        setCustomPrompt("");
        setLeadSearch("");
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedLeadIds.size === 0) return toast.error("Select at least one lead infrastructure to target.");
        setIsCreating(true);
        try {
            await api.post("/campaigns", {
                name,
                moduleType,
                customPrompt: moduleType === "AI_CALL" ? (customPrompt || undefined) : undefined,
                emailConfig: moduleType === "EMAIL" ? {
                    senderName: emailSenderName,
                    senderRole: emailSenderRole,
                    senderCompany: emailSenderCompany,
                    offering: emailOffering,
                    painPoint: emailPainPoint,
                    ctaText: emailCtaText,
                    ctaLink: emailCtaLink || undefined,
                    tone: emailTone,
                } : undefined,
                leadIds: Array.from(selectedLeadIds)
            });
            toast.success("Campaign framework initialized");
            setWizardStep(0);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to structure campaign");
        } finally {
            setIsCreating(false);
        }
    };

    const handleStartCampaign = async (id: string) => {
        try {
            await api.post(`/campaigns/${id}/start`);
            toast.success("Outbound sequence invoked");
            setActiveDropdown(null);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Execution failed");
        }
    };

    const handleDeleteCampaign = async (id: string) => {
        try {
            await api.delete(`/campaigns/${id}`);
            toast.success("Campaign sequence purged");
            setActiveDropdown(null);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Purge failed");
        }
    };

    const statCounts = useMemo(() => ({
        total: campaigns.length,
        draft: campaigns.filter(c => c.status === "DRAFT").length,
        running: campaigns.filter(c => c.status === "RUNNING" || c.status === "IN_PROGRESS").length,
        completed: campaigns.filter(c => c.status === "COMPLETED").length,
    }), [campaigns]);

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
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-full pb-10">
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Outbound <span className="text-gradient">Campaigns</span></h1>
                    <p className="text-slate-400 mt-1">Design, target, and launch AI sequences to your scraped prospects.</p>
                </div>
                <button
                    onClick={openWizard}
                    className="glass-button flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.2)] border-indigo-500/30 text-indigo-100"
                >
                    <Plus className="w-4 h-4 text-indigo-400" /> New Campaign
                </button>
            </motion.div>

            {/* Stat Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Campaigns", value: statCounts.total, icon: Megaphone, color: "text-slate-400", bg: "bg-slate-500/10", shadow: "shadow-slate-500/20" },
                    { label: "Drafts", value: statCounts.draft, icon: Circle, color: "text-amber-400", bg: "bg-amber-500/10", shadow: "shadow-amber-500/20" },
                    { label: "Running", value: statCounts.running, icon: Zap, color: "text-blue-400", bg: "bg-blue-500/10", shadow: "shadow-blue-500/20" },
                    { label: "Completed", value: statCounts.completed, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", shadow: "shadow-emerald-500/20" },
                ].map((stat) => (
                    <motion.div key={stat.label} className="glass-card p-5 border-white/5 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700`} />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className={`p-3 rounded-xl ${stat.bg} group-hover:${stat.shadow} transition-shadow duration-300`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white tracking-tight">{stat.value}</div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{stat.label}</div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Action Bar (Filters + SuperAdmin Toggle) */}
            <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {["ALL", "DRAFT", "RUNNING", "COMPLETED", "FAILED"].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl border transition-all duration-300 ${statusFilter === s
                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                : "bg-slate-950/50 backdrop-blur-sm text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-200"
                                }`}
                        >
                            {s === "ALL" ? "All Frameworks" : s.replace("_", " ")}
                        </button>
                    ))}
                </div>

                {isSuperAdmin && (
                    <div className="flex items-center gap-1 glass-input p-1">
                        <button onClick={() => setViewMode("mine")} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${viewMode === "mine" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-slate-400 hover:text-white"}`}>🛡️ My Engine</button>
                        <button onClick={() => setViewMode("all")} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${viewMode === "all" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-slate-400 hover:text-white"}`}>🏢 All Tenants</button>
                    </div>
                )}
            </motion.div>

            {/* Content Display (Desktop Table + Mobile Cards) */}
            <motion.div variants={itemVariants} className="glass-panel rounded-2xl">
                {filteredCampaigns.length === 0 ? (
                    <div className="px-6 py-20 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                            <Megaphone className="w-10 h-10 text-slate-600" />
                        </div>
                        <p className="text-xl font-bold text-white mb-2 tracking-tight">System idle.</p>
                        <p className="text-sm text-slate-400 max-w-sm mx-auto">
                            No campaigns detected in the current matrix. Initiate a new sequence to blast your prospects.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-950/50 border-b border-white/5 text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Campaign Identity</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Vector Type</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Target Mass</th>
                                        {user?.role === 'SUPER_ADMIN' && <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Tenant Node</th>}
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Execution State</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Overrides</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredCampaigns.map(campaign => (
                                        <tr key={campaign.id} className="hover:bg-white/[0.03] transition-colors group cursor-default">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white text-base group-hover:text-indigo-200 transition-colors uppercase tracking-tight">{campaign.name}</div>
                                                <div className="font-medium text-slate-500 text-[11px] mt-1 flex items-center gap-1.5 uppercase tracking-wider">
                                                    {campaign.customPrompt ? <span className="text-amber-400">Custom Neural Prompt</span> : "Standard Vector"} · {new Date(campaign.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${campaign.moduleType === "AI_CALL" ? "bg-violet-500/10 text-violet-400 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.1)]" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                                    }`}>
                                                    {campaign.moduleType === "AI_CALL" ? <Phone className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                                                    {campaign.moduleType === "AI_CALL" ? "Voice AI" : "Email AI"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="flex items-center gap-1.5 text-slate-300 text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg w-fit">
                                                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                                                    {campaign.totalItems ?? "—"} Entities
                                                </span>
                                            </td>
                                            {user?.role === 'SUPER_ADMIN' && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono font-bold">
                                                        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                                                        {campaign.tenantId?.split("-")[0]}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold border ${campaign.status === "DRAFT" ? "bg-slate-800 text-slate-400 border-slate-700" :
                                                    campaign.status === "RUNNING" || campaign.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]" :
                                                        campaign.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]" :
                                                            "bg-red-500/10 text-red-400 border-red-500/30"
                                                    }`}>
                                                    {(campaign.status === "RUNNING" || campaign.status === "IN_PROGRESS") && <Loader2 className="w-3 h-3 animate-spin" />}
                                                    {campaign.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right relative">
                                                <div className="flex justify-end gap-2">
                                                    {campaign.status === "DRAFT" && (
                                                        <button onClick={() => handleStartCampaign(campaign.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors font-bold border border-emerald-500/30 text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.15)] group/exec">
                                                            <PlayCircle className="w-3.5 h-3.5 group-hover/exec:scale-110 transition-transform" /> Execute Protocol
                                                        </button>
                                                    )}
                                                    <button onClick={() => setActiveDropdown(activeDropdown === campaign.id ? null : campaign.id)} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {activeDropdown === campaign.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                                                        <div className="absolute right-6 mt-2 w-48 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] z-50 py-1 origin-top-right animate-in fade-in zoom-in-95 duration-200">
                                                            <button onClick={() => handleDeleteCampaign(campaign.id)} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 font-medium transition-colors">
                                                                <Trash2 className="w-4 h-4 text-red-500" /> Terminate Sequence
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Stacked Card View */}
                        <div className="lg:hidden flex flex-col divide-y divide-white/5">
                            {filteredCampaigns.map((campaign) => (
                                <div key={`mob-${campaign.id}`} className="p-5 flex flex-col gap-4 relative">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${campaign.moduleType === "AI_CALL" ? "bg-violet-500/10 border-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.1)]" : "bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"}`}>
                                                {campaign.moduleType === "AI_CALL" ? <Phone className={`w-5 h-5 ${campaign.moduleType === "AI_CALL" ? "text-violet-400" : "text-emerald-400"}`} /> : <Mail className="w-5 h-5 text-emerald-400" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-base leading-tight uppercase tracking-tight">{campaign.name}</div>
                                                <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${campaign.status === "DRAFT" ? "bg-slate-800 text-slate-400 border-slate-700" :
                                                    campaign.status === "RUNNING" || campaign.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                                                        campaign.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                                                            "bg-red-500/10 text-red-400 border-red-500/30"
                                                    }`}>
                                                    {(campaign.status === "RUNNING" || campaign.status === "IN_PROGRESS") && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                                    {campaign.status}
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={() => setActiveDropdown(activeDropdown === campaign.id ? null : campaign.id)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 hover:border-white/20">
                                            <MoreVertical className="w-4 h-4 text-slate-300" />
                                        </button>
                                    </div>
                                    <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
                                            <Users className="w-4 h-4 text-indigo-400" />
                                            {campaign.totalItems ?? 0} Targets
                                        </div>
                                        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                                            {new Date(campaign.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Action row explicitly generated on mobile */}
                                    {campaign.status === "DRAFT" && (
                                        <button onClick={() => handleStartCampaign(campaign.id)} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-colors font-bold border border-emerald-500/30 text-xs uppercase tracking-wider">
                                            <PlayCircle className="w-4 h-4" /> Execute Protocol
                                        </button>
                                    )}

                                    {/* Mobile Dropdown Portal */}
                                    {activeDropdown === campaign.id && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                                            <div className="absolute top-14 right-5 w-48 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] z-50 bg-slate-900/90 backdrop-blur-xl border border-white/10 py-1 origin-top-right animate-in fade-in zoom-in-95 duration-200">
                                                <button onClick={() => handleDeleteCampaign(campaign.id)} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 font-medium transition-colors">
                                                    <Trash2 className="w-4 h-4 text-red-500" /> Terminate Sequence
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </motion.div>

            {/* WIZARD MODAL */}
            <AnimatePresence>
                {wizardStep > 0 && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setWizardStep(0)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden shadow-black/80">

                            {/* Wizard Header */}
                            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/20 ${wizardStep >= 1 ? "bg-indigo-600 text-white border border-indigo-400/50" : "bg-slate-800 text-slate-500"}`}>1</div>
                                        <div className={`w-10 h-0.5 rounded-full ${wizardStep >= 2 ? "bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.5)]" : "bg-slate-700"}`} />
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${wizardStep >= 2 ? "bg-indigo-600 text-white border border-indigo-400/50 shadow-lg shadow-indigo-500/20" : "bg-slate-800 text-slate-500"}`}>2</div>
                                    </div>
                                    <span className="text-base font-bold text-white tracking-tight ml-2">
                                        {wizardStep === 1 ? "Select Entities" : "Configure Sequence"}
                                    </span>
                                </div>
                                <button onClick={() => setWizardStep(0)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors"><ChevronDown className="w-5 h-5" /></button>
                            </div>

                            {/* Step 1: Lead Selector */}
                            {wizardStep === 1 && (
                                <>
                                    <div className="px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/[0.01]">
                                        <div className="relative flex-1 group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                            <input
                                                type="text"
                                                value={leadSearch}
                                                onChange={e => setLeadSearch(e.target.value)}
                                                placeholder="Search matrix..."
                                                className="w-full pl-11 pr-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(["all", "with_phone", "with_email"] as const).map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => setLeadFilter(f)}
                                                    className={`px-3 py-2 text-[10px] uppercase font-bold tracking-wider rounded-xl border transition-all ${leadFilter === f
                                                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                                                        : "bg-slate-950 text-slate-400 border-white/5 hover:border-white/20 hover:text-white"
                                                        }`}
                                                >
                                                    {f === "all" ? "All" : f === "with_phone" ? "Phone" : "Email"}
                                                </button>
                                            ))}
                                            {leadCategories.length > 0 && (
                                                <div className="relative ml-1">
                                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                                    <select
                                                        value={leadCategoryFilter}
                                                        onChange={e => setLeadCategoryFilter(e.target.value)}
                                                        className="pl-9 pr-8 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl text-[10px] uppercase font-bold tracking-wider text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
                                                    >
                                                        <option value="ALL">ALL SECTORS</option>
                                                        {leadCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-6 py-2.5 border-b border-white/5 flex justify-between items-center bg-indigo-500/5">
                                        <button onClick={toggleAll} className="text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                                            {selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0 ? "Deselect Mass" : "Select Entire Mass"}
                                        </button>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider"><strong className="text-indigo-400">{selectedLeadIds.size}</strong> / {filteredLeads.length} Selected</span>
                                    </div>

                                    <div className="overflow-y-auto flex-1 max-h-[400px] scrollbar-none">
                                        {filteredLeads.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                                <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center mb-4"><Users className="w-8 h-8 text-slate-600" /></div>
                                                <p className="font-bold text-white mb-1">No compatible leads</p>
                                                <p className="text-sm">Scrape targets using the Engine to populate this list.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-white/5">
                                                {filteredLeads.map(lead => (
                                                    <div
                                                        key={lead.id}
                                                        onClick={() => toggleLead(lead.id)}
                                                        className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all border-l-2 ${selectedLeadIds.has(lead.id)
                                                            ? "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500"
                                                            : "hover:bg-white/[0.03] border-transparent"
                                                            }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedLeadIds.has(lead.id) ? "bg-indigo-600 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "border-slate-600"}`}>
                                                            {selectedLeadIds.has(lead.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                                        </div>
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-white/5 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-xs font-bold text-indigo-400">{(lead.companyName || "?")[0].toUpperCase()}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-white text-sm truncate">{lead.companyName || "Unknown Entity"}</div>
                                                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">
                                                                {lead.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-violet-400/70" /> {lead.phone}</span>}
                                                                {lead.email && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-emerald-400/70" /> {lead.email}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-6 py-5 border-t border-white/5 flex justify-between items-center bg-black/20">
                                        <button onClick={() => setWizardStep(0)} className="px-5 py-2.5 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-all text-sm">Abort</button>
                                        <button
                                            onClick={() => setWizardStep(2)}
                                            disabled={selectedLeadIds.size === 0}
                                            className="glass-button flex items-center gap-2 px-6 py-2.5 bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(99,102,241,0.4)] border-indigo-500/50 text-sm"
                                        >
                                            Next Phase <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Step 2: Configure Campaign */}
                            {wizardStep === 2 && (
                                <form onSubmit={handleCreateCampaign} className="flex flex-col flex-1 min-h-0">
                                    <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6 scrollbar-none">

                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Campaign Identity</label>
                                            <input
                                                type="text" required value={name} onChange={e => setName(e.target.value)}
                                                className="glass-input w-full px-4 py-3" placeholder="e.g. Q3 Outreach Matrix"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Delivery Vector</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => hasAiModule && setModuleType("AI_CALL")}
                                                    className={`relative p-5 rounded-2xl border-2 transition-all text-left ${moduleType === "AI_CALL"
                                                        ? "border-violet-500 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                                                        : "border-white/5 bg-slate-900/50 hover:bg-slate-800"
                                                        } ${!hasAiModule ? "opacity-30 cursor-not-allowed grayscale" : "cursor-pointer"}`}
                                                >
                                                    <div className={`p-3 rounded-xl w-fit mb-3 ${moduleType === "AI_CALL" ? "bg-violet-500/20" : "bg-white/5"}`}><Phone className={`w-6 h-6 ${moduleType === "AI_CALL" ? "text-violet-400" : "text-slate-500"}`} /></div>
                                                    <div className="font-bold text-white text-sm mb-1 uppercase tracking-wider">Voice AI</div>
                                                    <div className="text-xs text-slate-400 font-medium">Hyper-realistic autonomous cold calling</div>
                                                    {!hasAiModule && <span className="absolute top-4 right-4 text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">Pro</span>}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => hasEmailModule && setModuleType("EMAIL")}
                                                    className={`relative p-5 rounded-2xl border-2 transition-all text-left ${moduleType === "EMAIL"
                                                        ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                                                        : "border-white/5 bg-slate-900/50 hover:bg-slate-800"
                                                        } ${!hasEmailModule ? "opacity-30 cursor-not-allowed grayscale" : "cursor-pointer"}`}
                                                >
                                                    <div className={`p-3 rounded-xl w-fit mb-3 ${moduleType === "EMAIL" ? "bg-emerald-500/20" : "bg-white/5"}`}><Mail className={`w-6 h-6 ${moduleType === "EMAIL" ? "text-emerald-400" : "text-slate-500"}`} /></div>
                                                    <div className="font-bold text-white text-sm mb-1 uppercase tracking-wider">Email Sequence</div>
                                                    <div className="text-xs text-slate-400 font-medium">AI generated drip methodology</div>
                                                    {!hasEmailModule && <span className="absolute top-4 right-4 text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">Pro</span>}
                                                </button>
                                            </div>
                                        </div>

                                        {moduleType === "AI_CALL" ? (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Neural Prompt Injection (Optional)</label>
                                                <textarea
                                                    value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                                                    className="glass-input w-full px-4 py-3 min-h-[120px]"
                                                    placeholder="Override the base personality..."
                                                />
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
                                                    <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                                    <p className="text-xs text-emerald-300 font-medium">The AI engine will construct dynamic copy based on the underlying knowledge graphs for each target entity.</p>
                                                </div>

                                                <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] space-y-4">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Sender Profile</label>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <input type="text" value={emailSenderName} onChange={e => setEmailSenderName(e.target.value)} placeholder="Full Name" required className="glass-input px-4 py-2.5" />
                                                            <input type="text" value={emailSenderRole} onChange={e => setEmailSenderRole(e.target.value)} placeholder="Job Title" required className="glass-input px-4 py-2.5" />
                                                            <input type="text" value={emailSenderCompany} onChange={e => setEmailSenderCompany(e.target.value)} placeholder="Company" required className="glass-input px-4 py-2.5" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Core Value</label><textarea value={emailOffering} onChange={e => setEmailOffering(e.target.value)} placeholder="e.g. Fully managed Web3 integration" required className="glass-input w-full px-4 py-3 min-h-[80px]" /></div>
                                                        <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Friction Point</label><textarea value={emailPainPoint} onChange={e => setEmailPainPoint(e.target.value)} placeholder="e.g. Existing networks are too slow and expensive" required className="glass-input w-full px-4 py-3 min-h-[80px]" /></div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">CTA Copy</label><input type="text" value={emailCtaText} onChange={e => setEmailCtaText(e.target.value)} placeholder="e.g. Reply to schedule" required className="glass-input w-full px-4 py-3" /></div>
                                                        <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">CTA URL</label><input type="text" value={emailCtaLink} onChange={e => setEmailCtaLink(e.target.value)} placeholder="https://..." className="glass-input w-full px-4 py-3" /></div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Synthesized Tone</label>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            {["PROFESSIONAL", "FRIENDLY", "CASUAL"].map(t => (
                                                                <button key={t} type="button" onClick={() => setEmailTone(t)} className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${emailTone === t ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "bg-slate-900 border-white/5 text-slate-400 hover:border-white/10"}`}>
                                                                    {t}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-6 py-5 border-t border-white/5 flex justify-between items-center bg-black/20">
                                        <button type="button" onClick={() => setWizardStep(1)} className="flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors text-sm"><ArrowLeft className="w-4 h-4" /> Revert</button>
                                        <button type="submit" disabled={isCreating || !name.trim() || (moduleType === "EMAIL" && (!emailSenderName || !emailOffering || !emailPainPoint || !emailCtaText))} className="glass-button flex items-center gap-2 px-8 py-2.5 bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(99,102,241,0.4)] border-indigo-500/50 text-sm tracking-wider uppercase">
                                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />} Initialize Protocol
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
