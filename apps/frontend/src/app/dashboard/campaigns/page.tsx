"use client";

import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/AuthProvider";
import {
    Loader2, Megaphone, Plus, Play, MoreHorizontal, Building2,
    Search, CheckCircle2, Circle, Users, Phone, Mail,
    ArrowRight, ArrowLeft, Zap, Globe, Trash2, ChevronDown, Filter, Tag
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

export default function CampaignsPage() {
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Wizard step control
    const [wizardStep, setWizardStep] = useState(0); // 0 = closed, 1 = select leads, 2 = configure

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

    // Campaign actions dropdown
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    // Campaign status filter
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    // SuperAdmin view mode
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
        } finally {
            setIsLoading(false);
        }
    };

    // Lead categories for dropdown
    const leadCategories = useMemo(() => {
        const cats = new Set<string>();
        leads.forEach(l => { if (l.category) cats.add(l.category); });
        return Array.from(cats).sort();
    }, [leads]);

    // Filtered leads for step 1 selector
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
        return result;
    }, [leads, leadSearch, leadFilter, leadCategoryFilter]);

    // Filtered campaigns
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const filteredCampaigns = useMemo(() => {
        let result = campaigns;
        // SuperAdmin view separation
        if (isSuperAdmin && viewMode === "mine" && user?.tenantId) {
            result = result.filter(c => c.tenantId === user.tenantId);
        } else if (isSuperAdmin && viewMode === "all" && user?.tenantId) {
            result = result.filter(c => c.tenantId !== user.tenantId);
        }
        if (statusFilter !== "ALL") result = result.filter(c => c.status === statusFilter);
        return result;
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
        if (selectedLeadIds.size === 0) {
            toast.error("Select at least one lead to create a campaign.");
            return;
        }
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
            toast.success("Campaign drafted successfully!");
            setWizardStep(0);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create campaign");
        } finally {
            setIsCreating(false);
        }
    };

    const handleStartCampaign = async (id: string) => {
        try {
            await api.post(`/campaigns/${id}/start`);
            toast.success("Campaign execution started!");
            setActiveDropdown(null);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to start campaign");
        }
    };

    const handleDeleteCampaign = async (id: string) => {
        try {
            await api.delete(`/campaigns/${id}`);
            toast.success("Campaign deleted.");
            setActiveDropdown(null);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete campaign");
        }
    };

    const statusColors: Record<string, string> = {
        DRAFT: "bg-slate-700/50 text-slate-300 border-slate-600",
        IN_PROGRESS: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        RUNNING: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        FAILED: "bg-red-500/10 text-red-400 border-red-500/30",
    };

    const statCounts = useMemo(() => ({
        total: campaigns.length,
        draft: campaigns.filter(c => c.status === "DRAFT").length,
        running: campaigns.filter(c => c.status === "RUNNING" || c.status === "IN_PROGRESS").length,
        completed: campaigns.filter(c => c.status === "COMPLETED").length,
    }), [campaigns]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
                    <p className="text-slate-400 mt-1">Design, target, and launch outbound sequences to your scraped leads.</p>
                </div>
                <button
                    onClick={openWizard}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                >
                    <Plus className="w-4 h-4" /> New Campaign
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Campaigns", value: statCounts.total, icon: Megaphone, color: "text-slate-400" },
                    { label: "Drafts", value: statCounts.draft, icon: Circle, color: "text-amber-400" },
                    { label: "Running", value: statCounts.running, icon: Zap, color: "text-blue-400" },
                    { label: "Completed", value: statCounts.completed, icon: CheckCircle2, color: "text-emerald-400" },
                ].map((stat) => (
                    <div key={stat.label} className="bg-slate-900 border border-white/5 rounded-xl p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{stat.value}</div>
                            <div className="text-xs text-slate-500">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* SuperAdmin View Toggle */}
            {isSuperAdmin && (
                <div className="flex items-center gap-1 bg-slate-900 border border-white/5 rounded-xl p-1 w-fit">
                    <button
                        onClick={() => setViewMode("mine")}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${viewMode === "mine"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-400 hover:text-white"
                            }`}
                    >
                        🛡️ My Campaigns
                    </button>
                    <button
                        onClick={() => setViewMode("all")}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${viewMode === "all"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-400 hover:text-white"
                            }`}
                    >
                        🏢 All Tenants
                    </button>
                </div>
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-wrap">
                {["ALL", "DRAFT", "RUNNING", "COMPLETED", "FAILED"].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${statusFilter === s
                            ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                            : "bg-slate-900 text-slate-400 border-white/5 hover:border-white/10"
                            }`}
                    >
                        {s === "ALL" ? "All Statuses" : s.replace("_", " ")}
                    </button>
                ))}
            </div>

            {/* Campaign List */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-950/50 border-b border-white/5 text-slate-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">Campaign</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Leads</th>
                                {user?.role === 'SUPER_ADMIN' && <th className="px-6 py-4 font-medium">Tenant</th>}
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Megaphone className="w-8 h-8 text-slate-600" />
                                        </div>
                                        <p className="font-medium text-white mb-1">No campaigns yet</p>
                                        <p className="text-sm">Click &quot;New Campaign&quot; to create your first outbound sequence.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredCampaigns.map(campaign => (
                                    <tr key={campaign.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{campaign.name}</div>
                                            <div className="text-slate-500 text-xs mt-0.5">
                                                {campaign.customPrompt ? "🤖 Custom Prompt" : "Default Mode"} · {new Date(campaign.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${campaign.moduleType === "AI_CALL"
                                                ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                }`}>
                                                {campaign.moduleType === "AI_CALL" ? <Phone className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                                                {campaign.moduleType === "AI_CALL" ? "AI Call" : "Email"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1.5 text-slate-300 text-xs">
                                                <Users className="w-3.5 h-3.5 text-indigo-400" />
                                                {campaign.totalItems ?? "—"}
                                            </span>
                                        </td>
                                        {user?.role === 'SUPER_ADMIN' && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
                                                    <Building2 className="w-3 h-3 text-indigo-400" />
                                                    {campaign.tenantId?.split("-")[0]}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${statusColors[campaign.status] || statusColors.DRAFT}`}>
                                                {campaign.status === "RUNNING" || campaign.status === "IN_PROGRESS" ? (
                                                    <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                                                ) : null}
                                                {campaign.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative inline-block">
                                                <div className="flex items-center gap-2">
                                                    {campaign.status === "DRAFT" && (
                                                        <button
                                                            onClick={() => handleStartCampaign(campaign.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors font-medium border border-emerald-500/20 text-xs"
                                                        >
                                                            <Play className="w-3 h-3" /> Execute
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setActiveDropdown(activeDropdown === campaign.id ? null : campaign.id)}
                                                        className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {activeDropdown === campaign.id && (
                                                    <div className="absolute right-0 mt-1 w-36 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-20 py-1">
                                                        <button
                                                            onClick={() => handleDeleteCampaign(campaign.id)}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* WIZARD MODAL */}
            {wizardStep > 0 && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setWizardStep(0)}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Wizard Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${wizardStep >= 1 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-500"}`}>1</div>
                                    <div className={`w-12 h-0.5 ${wizardStep >= 2 ? "bg-indigo-500" : "bg-slate-700"}`} />
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${wizardStep >= 2 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-500"}`}>2</div>
                                </div>
                                <span className="text-sm text-slate-400 ml-2">
                                    {wizardStep === 1 ? "Select Target Leads" : "Configure Campaign"}
                                </span>
                            </div>
                            <button onClick={() => setWizardStep(0)} className="text-slate-400 hover:text-white text-lg">✕</button>
                        </div>

                        {/* Step 1: Lead Selector */}
                        {wizardStep === 1 && (
                            <>
                                <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            value={leadSearch}
                                            onChange={e => setLeadSearch(e.target.value)}
                                            placeholder="Search leads by name, phone, or email..."
                                            className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {(["all", "with_phone", "with_email"] as const).map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setLeadFilter(f)}
                                                className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all ${leadFilter === f
                                                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                                    : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                                                    }`}
                                            >
                                                {f === "all" ? "All" : f === "with_phone" ? "📞 Phone" : "✉️ Email"}
                                            </button>
                                        ))}
                                        {leadCategories.length > 0 && (
                                            <div className="relative ml-1">
                                                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                                                <select
                                                    value={leadCategoryFilter}
                                                    onChange={e => setLeadCategoryFilter(e.target.value)}
                                                    className="pl-7 pr-6 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
                                                >
                                                    <option value="ALL">All Categories</option>
                                                    {leadCategories.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="px-6 py-2 border-b border-white/5 flex justify-between items-center">
                                    <button
                                        onClick={toggleAll}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                                    >
                                        {selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0 ? "Deselect All" : "Select All"}
                                    </button>
                                    <span className="text-xs text-slate-500">{selectedLeadIds.size} of {filteredLeads.length} selected</span>
                                </div>

                                <div className="overflow-y-auto flex-1 max-h-[400px]">
                                    {filteredLeads.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                            <Users className="w-10 h-10 mb-3 text-slate-600" />
                                            <p className="font-medium text-white mb-1">No leads found</p>
                                            <p className="text-sm">Scrape some leads first, then come back to target them.</p>
                                        </div>
                                    ) : (
                                        filteredLeads.map(lead => (
                                            <div
                                                key={lead.id}
                                                onClick={() => toggleLead(lead.id)}
                                                className={`flex items-center gap-4 px-6 py-3 cursor-pointer border-b border-white/5 transition-all ${selectedLeadIds.has(lead.id)
                                                    ? "bg-indigo-500/5 hover:bg-indigo-500/10"
                                                    : "hover:bg-white/[0.02]"
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedLeadIds.has(lead.id)
                                                    ? "bg-indigo-600 border-indigo-500"
                                                    : "border-slate-600"
                                                    }`}>
                                                    {selectedLeadIds.has(lead.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-white text-sm truncate">{lead.companyName || "Unknown"}</div>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                        {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>}
                                                        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>}
                                                        {lead.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {new URL(lead.website).hostname}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-sm text-slate-400">
                                        <strong className="text-indigo-400">{selectedLeadIds.size}</strong> leads selected
                                    </span>
                                    <button
                                        onClick={() => setWizardStep(2)}
                                        disabled={selectedLeadIds.size === 0}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Next: Configure <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Step 2: Configure Campaign */}
                        {wizardStep === 2 && (
                            <form onSubmit={handleCreateCampaign} className="flex flex-col flex-1 min-h-0">
                                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-3 text-sm">
                                        <Users className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                                        <span className="text-indigo-300">
                                            Targeting <strong>{selectedLeadIds.size}</strong> selected leads
                                        </span>
                                        <button type="button" onClick={() => setWizardStep(1)} className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 underline">
                                            Change
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Campaign Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                            placeholder="e.g. Q3 Real Estate AI Pitch"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                            Outbound Channel
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => hasAiModule && setModuleType("AI_CALL")}
                                                className={`relative p-4 rounded-xl border-2 transition-all text-left ${moduleType === "AI_CALL"
                                                    ? "border-violet-500 bg-violet-500/10"
                                                    : "border-slate-700 bg-slate-800 hover:border-slate-600"
                                                    } ${!hasAiModule ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                                            >
                                                <Phone className="w-6 h-6 text-violet-400 mb-2" />
                                                <div className="font-medium text-white text-sm">VAPI AI Caller</div>
                                                <div className="text-xs text-slate-400 mt-0.5">Automated cold calls with AI voice</div>
                                                {!hasAiModule && <span className="absolute top-2 right-2 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Pro</span>}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => hasEmailModule && setModuleType("EMAIL")}
                                                className={`relative p-4 rounded-xl border-2 transition-all text-left ${moduleType === "EMAIL"
                                                    ? "border-emerald-500 bg-emerald-500/10"
                                                    : "border-slate-700 bg-slate-800 hover:border-slate-600"
                                                    } ${!hasEmailModule ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                                            >
                                                <Mail className="w-6 h-6 text-emerald-400 mb-2" />
                                                <div className="font-medium text-white text-sm">Email Outreach</div>
                                                <div className="text-xs text-slate-400 mt-0.5">Automated email via SMTP</div>
                                                {!hasEmailModule && <span className="absolute top-2 right-2 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Pro</span>}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Conditional: AI Call → System Prompt | Email → Structured Config */}
                                    {moduleType === "AI_CALL" ? (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Custom System Prompt (Optional)</label>
                                            <textarea
                                                value={customPrompt}
                                                onChange={e => setCustomPrompt(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors min-h-[100px] resize-none text-sm"
                                                placeholder="e.g. 'Speak with an Australian accent and focus on scheduling a meeting.'"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Injected directly into the VAPI call payload.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                                                <p className="text-xs text-emerald-400">✨ AI will generate a unique personalized email for each lead using the info below.</p>
                                            </div>

                                            {/* Sender Info Row */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Info</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <input
                                                        type="text" value={emailSenderName} onChange={e => setEmailSenderName(e.target.value)}
                                                        placeholder="Your Name" required
                                                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                                    />
                                                    <input
                                                        type="text" value={emailSenderRole} onChange={e => setEmailSenderRole(e.target.value)}
                                                        placeholder="Your Role" required
                                                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                                    />
                                                    <input
                                                        type="text" value={emailSenderCompany} onChange={e => setEmailSenderCompany(e.target.value)}
                                                        placeholder="Company Name" required
                                                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                            </div>

                                            {/* Offering */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">What You're Offering</label>
                                                <textarea
                                                    value={emailOffering} onChange={e => setEmailOffering(e.target.value)}
                                                    placeholder="e.g. 'SEO and Google Ads management for dental practices'" required
                                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 resize-none min-h-[60px]"
                                                />
                                            </div>

                                            {/* Pain Point */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Pain Point</label>
                                                <textarea
                                                    value={emailPainPoint} onChange={e => setEmailPainPoint(e.target.value)}
                                                    placeholder="e.g. 'Most dentists lose 40% of new patients to competitors with better Google rankings'" required
                                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 resize-none min-h-[60px]"
                                                />
                                            </div>

                                            {/* CTA Row */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Call to Action</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="text" value={emailCtaText} onChange={e => setEmailCtaText(e.target.value)}
                                                        placeholder="e.g. 'Book a free strategy call'" required
                                                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                                    />
                                                    <input
                                                        type="text" value={emailCtaLink} onChange={e => setEmailCtaLink(e.target.value)}
                                                        placeholder="https://calendly.com/... (optional)"
                                                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                            </div>

                                            {/* Tone */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tone</label>
                                                <div className="flex gap-2">
                                                    {["PROFESSIONAL", "FRIENDLY", "CASUAL"].map(t => (
                                                        <button
                                                            key={t} type="button"
                                                            onClick={() => setEmailTone(t)}
                                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${emailTone === t
                                                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                                                : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                                                                }`}
                                                        >
                                                            {t === "PROFESSIONAL" ? "💼 Professional" : t === "FRIENDLY" ? "🤝 Friendly" : "😊 Casual"}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center">
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(1)}
                                        className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating || !name.trim() || (moduleType === "EMAIL" && (!emailSenderName || !emailOffering || !emailPainPoint || !emailCtaText))}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                                    >
                                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                                        {isCreating ? "Creating..." : "Draft Campaign"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
