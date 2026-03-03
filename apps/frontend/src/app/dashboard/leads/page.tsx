"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import {
    Loader2, Mail, Phone, ExternalLink, MoreVertical, Users,
    Search, Globe, Linkedin, Instagram, Facebook, CheckCircle2,
    Circle, Trash2, Copy, Tag, ChevronDown, Plus, X, Edit2
} from "lucide-react";
import { toast } from "sonner";

interface Lead {
    id: string;
    companyName: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    category?: string | null;
    facebook?: string | null;
    linkedin?: string | null;
    instagram?: string | null;
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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Modals state
    const [showAddModal, setShowAddModal] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newLead, setNewLead] = useState({
        companyName: "", contactName: "", email: "", phone: "",
        website: "", category: "", facebook: "", linkedin: "", instagram: ""
    });

    const [showEditModal, setShowEditModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEditLeadId, setCurrentEditLeadId] = useState<string | null>(null);
    const [editLeadData, setEditLeadData] = useState({
        companyName: "", contactName: "", email: "", phone: "",
        website: "", category: "", facebook: "", linkedin: "", instagram: ""
    });

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const { data } = await api.get("/leads");
            setLeads(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            console.error("Failed to fetch leads", error);
            toast.error("Failed to load CRM data");
        } finally {
            setIsLoading(false);
        }
    };

    const categories = useMemo(() => {
        const cats = new Set<string>();
        leads.forEach(l => { if (l.category) cats.add(l.category); });
        return Array.from(cats).sort();
    }, [leads]);

    const filteredLeads = useMemo(() => {
        let result = leads;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(l =>
                l.companyName?.toLowerCase().includes(q) ||
                l.email?.toLowerCase().includes(q) ||
                l.phone?.includes(q) ||
                l.website?.toLowerCase().includes(q) ||
                l.category?.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== "ALL") result = result.filter(l => l.status === statusFilter);
        if (categoryFilter !== "ALL") result = result.filter(l => l.category === categoryFilter);

        // Sort by newest first
        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [leads, search, statusFilter, categoryFilter]);

    const stats = useMemo(() => ({
        total: leads.length,
        withEmail: leads.filter(l => l.email).length,
        withPhone: leads.filter(l => l.phone).length,
        new: leads.filter(l => l.status === "NEW").length,
    }), [leads]);

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${type} copied to clipboard!`);
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/leads/${id}`);
            toast.success("Lead isolated and deleted");
            setActiveMenu(null);
            fetchLeads();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete lead");
        }
    };

    const formatWebsite = (url: string) => {
        try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
    };

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLead.companyName.trim()) return toast.error("Company name is required");
        setIsAdding(true);
        try {
            await api.post("/leads", { ...newLead, source: "MANUAL" });
            toast.success("New lead injected into CRM");
            setShowAddModal(false);
            setNewLead({ companyName: "", contactName: "", email: "", phone: "", website: "", category: "", facebook: "", linkedin: "", instagram: "" });
            fetchLeads();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Injection failed");
        } finally {
            setIsAdding(false);
        }
    };

    const openEditModal = (lead: Lead) => {
        setEditLeadData({
            companyName: lead.companyName || "",
            contactName: lead.contactName || "",
            email: lead.email || "",
            phone: lead.phone || "",
            website: lead.website || "",
            category: lead.category || "",
            facebook: lead.facebook || "",
            linkedin: lead.linkedin || "",
            instagram: lead.instagram || ""
        });
        setCurrentEditLeadId(lead.id);
        setShowEditModal(true);
        setActiveMenu(null);
    };

    const handleEditLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editLeadData.companyName.trim() || !currentEditLeadId) return toast.error("Company name is required");
        setIsEditing(true);
        try {
            await api.patch(`/leads/${currentEditLeadId}`, editLeadData);
            toast.success("Lead profile synchronized");
            setShowEditModal(false);
            fetchLeads();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Update failed");
        } finally {
            setIsEditing(false);
        }
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
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-full pb-10">
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Leads <span className="text-gradient">CRM</span></h1>
                    <p className="text-slate-400 mt-1">Manage and view all prospects generated by your Scraper jobs.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="glass-button flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.2)] border-indigo-500/30 text-indigo-100"
                >
                    <Plus className="w-4 h-4 text-indigo-400" /> Add Lead
                </button>
            </motion.div>

            {/* Stat Summary */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Leads", value: stats.total, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10", shadow: "shadow-indigo-500/20" },
                    { label: "New Leads", value: stats.new, icon: Circle, color: "text-blue-400", bg: "bg-blue-500/10", shadow: "shadow-blue-500/20" },
                    { label: "With Email", value: stats.withEmail, icon: Mail, color: "text-emerald-400", bg: "bg-emerald-500/10", shadow: "shadow-emerald-500/20" },
                    { label: "With Phone", value: stats.withPhone, icon: Phone, color: "text-violet-400", bg: "bg-violet-500/10", shadow: "shadow-violet-500/20" },
                ].map((s, i) => (
                    <motion.div key={s.label} className="glass-card p-5 border-white/5 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700`} />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className={`p-3 rounded-xl ${s.bg} group-hover:${s.shadow} transition-shadow duration-300`}>
                                <s.icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white tracking-tight">{s.value}</div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{s.label}</div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Search & Filter Bar */}
            <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by company, email, phone, or website..."
                        className="glass-input w-full pl-11 pr-4 py-3 text-sm transition-all shadow-inner"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {["ALL", "NEW", "CONTACTED", "QUALIFIED"].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all duration-300 ${statusFilter === s
                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                : "bg-slate-950/50 backdrop-blur-sm text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-200"
                                }`}
                        >
                            {s === "ALL" ? "All" : s}
                        </button>
                    ))}
                    {categories.length > 0 && (
                        <div className="relative flex-1 sm:flex-none">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="glass-input w-full sm:w-auto pl-10 pr-10 py-2.5 text-xs font-bold uppercase tracking-wider appearance-none cursor-pointer"
                            >
                                <option value="ALL">ALL CATEGORIES</option>
                                {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Responsive Data Presentation (Cards on Mobile, Table on Desktop) */}
            <motion.div variants={itemVariants} className="glass-panel rounded-2xl">
                {filteredLeads.length === 0 ? (
                    <div className="px-6 py-20 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                            <Search className="w-10 h-10 text-slate-600" />
                        </div>
                        <p className="text-xl font-bold text-white mb-2 tracking-tight">Zero anomalies detected.</p>
                        <p className="text-sm text-slate-400 max-w-sm mx-auto">
                            {search ? "No leads matched your stringent criteria." : "Your CRM matrix is empty. Initiate a Scraper job to acquire prospects."}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View (Hidden on mobile) */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950/50 border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Target Entity</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Comms Relays</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Aura Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredLeads.map((lead) => (
                                        <tr key={lead.id} className="hover:bg-white/[0.03] transition-colors group cursor-default">
                                            {/* Entity Column */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                                                        <span className="text-sm font-bold text-indigo-300">
                                                            {(lead.companyName || "?")[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-white truncate text-base group-hover:text-indigo-200 transition-colors">{lead.companyName}</div>
                                                        {lead.website ? (
                                                            <a href={lead.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-400 transition-colors mt-1">
                                                                <Globe className="w-3.5 h-3.5" /> {formatWebsite(lead.website)}
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-slate-600 mt-1 block font-medium">No domain located</span>
                                                        )}
                                                        {lead.category && (
                                                            <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] uppercase font-bold tracking-wider rounded border border-indigo-500/20">
                                                                <Tag className="w-3 h-3" /> {lead.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Comms Column */}
                                            <td className="px-6 py-4">
                                                <div className="space-y-2">
                                                    {lead.email ? (
                                                        <button onClick={() => copyToClipboard(lead.email!, "Email")} className="flex items-center gap-2 text-slate-300 hover:text-indigo-300 transition-colors font-medium group/copy text-xs">
                                                            <Mail className="w-4 h-4 text-emerald-500/70" /> {lead.email}
                                                            <Copy className="w-3 h-3 text-slate-600 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                                                        </button>
                                                    ) : (
                                                        <span className="flex items-center gap-2 text-xs font-medium text-slate-600"><Mail className="w-4 h-4" /> No email relay</span>
                                                    )}
                                                    {lead.phone ? (
                                                        <button onClick={() => copyToClipboard(lead.phone!, "Phone")} className="flex items-center gap-2 text-slate-300 hover:text-indigo-300 transition-colors font-medium group/copy text-xs">
                                                            <Phone className="w-4 h-4 text-violet-500/70" /> {lead.phone}
                                                            <Copy className="w-3 h-3 text-slate-600 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                                                        </button>
                                                    ) : (
                                                        <span className="flex items-center gap-2 text-xs font-medium text-slate-600"><Phone className="w-4 h-4" /> No voice comms</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${lead.status === "NEW" ? "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]" :
                                                    lead.status === "CONTACTED" ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]" :
                                                        lead.status === "QUALIFIED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]" :
                                                            "bg-slate-800 text-slate-400 border-slate-700"
                                                    }`}>
                                                    {lead.status === "NEW" && <Circle className="w-3 h-3 fill-current" />}
                                                    {(lead.status === "CONTACTED" || lead.status === "QUALIFIED") && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    {lead.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="relative inline-block text-left">
                                                    <button onClick={() => setActiveMenu(activeMenu === lead.id ? null : lead.id)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 hover:border-white/20">
                                                        <MoreVertical className="w-4 h-4 text-slate-300" />
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    {activeMenu === lead.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                                                            <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] z-50 glass-panel border border-white/10 py-1 origin-top-right animate-in fade-in zoom-in-95 duration-200">
                                                                <button onClick={() => { openEditModal(lead); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:text-white hover:bg-white/10 flex items-center gap-2 font-medium transition-colors">
                                                                    <Edit2 className="w-4 h-4 text-indigo-400" /> Edit Profile
                                                                </button>
                                                                {lead.website && (
                                                                    <a href={lead.website} target="_blank" rel="noreferrer" className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:text-white hover:bg-white/10 flex items-center gap-2 font-medium transition-colors">
                                                                        <ExternalLink className="w-4 h-4 text-slate-400" /> Open Target Domain
                                                                    </a>
                                                                )}
                                                                <div className="h-px bg-white/10 my-1 mx-2" />
                                                                <button onClick={() => handleDelete(lead.id)} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 font-medium transition-colors">
                                                                    <Trash2 className="w-4 h-4 text-red-500" /> Purge Entity
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Stacked Card View */}
                        <div className="lg:hidden flex flex-col divide-y divide-white/5">
                            {filteredLeads.map((lead) => (
                                <div key={`mob-${lead.id}`} className="p-5 flex flex-col gap-4 relative">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                                                <span className="text-sm font-bold text-indigo-300">{(lead.companyName || "?")[0].toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-base leading-tight">{lead.companyName}</div>
                                                <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${lead.status === "NEW" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                                                    lead.status === "CONTACTED" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                                                        lead.status === "QUALIFIED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                                                            "bg-slate-800 text-slate-400 border-slate-700"
                                                    }`}>
                                                    {lead.status}
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={() => setActiveMenu(activeMenu === lead.id ? null : lead.id)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                                            <MoreVertical className="w-4 h-4 text-slate-300" />
                                        </button>
                                    </div>
                                    <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 space-y-2">
                                        <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                                            <Mail className="w-3.5 h-3.5 text-emerald-500/70" />
                                            <span className="truncate">{lead.email || "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                                            <Phone className="w-3.5 h-3.5 text-violet-500/70" />
                                            <span className="truncate">{lead.phone || "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                                            <Globe className="w-3.5 h-3.5 text-indigo-500/70" />
                                            <span className="truncate">{lead.website ? formatWebsite(lead.website) : "N/A"}</span>
                                        </div>
                                    </div>

                                    {/* Mobile Dropdown Portal */}
                                    {activeMenu === lead.id && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                                            <div className="absolute top-14 right-5 w-48 rounded-xl shadow-2xl z-50 glass-panel border border-white/10 py-1 origin-top-right animate-in fade-in zoom-in-95 duration-200">
                                                <button onClick={() => { openEditModal(lead); setActiveMenu(null); }} className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-white/10 flex items-center gap-3 font-medium">
                                                    <Edit2 className="w-4 h-4 text-indigo-400" /> Edit Profile
                                                </button>
                                                <div className="h-px bg-white/10 mx-2" />
                                                <button onClick={() => handleDelete(lead.id)} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 font-medium">
                                                    <Trash2 className="w-4 h-4 text-red-500" /> Purge Entity
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

            {/* ADD MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg glass-panel rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                            <h2 className="text-xl font-bold text-white tracking-tight">Manual Injection</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto scrollbar-none">
                            <form id="addLeadForm" onSubmit={handleAddLead} className="space-y-4">
                                <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Entity</label><input type="text" required value={newLead.companyName} onChange={e => setNewLead({ ...newLead, companyName: e.target.value })} className="glass-input w-full px-4 py-3" placeholder="Acme Corp" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">POC Name</label><input type="text" value={newLead.contactName} onChange={e => setNewLead({ ...newLead, contactName: e.target.value })} className="glass-input w-full px-4 py-3" placeholder="John Doe" /></div>
                                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sector</label><input type="text" value={newLead.category} onChange={e => setNewLead({ ...newLead, category: e.target.value })} className="glass-input w-full px-4 py-3" placeholder="SaaS" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Relay</label><input type="email" value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} className="glass-input w-full px-4 py-3" placeholder="john@example.com" /></div>
                                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Voice Comms</label><input type="text" value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} className="glass-input w-full px-4 py-3" placeholder="+1..." /></div>
                                </div>
                                <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Domain</label><input type="url" value={newLead.website} onChange={e => setNewLead({ ...newLead, website: e.target.value })} className="glass-input w-full px-4 py-3" placeholder="https://" /></div>
                                <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">LinkedIn URL</label><input type="url" value={newLead.linkedin} onChange={e => setNewLead({ ...newLead, linkedin: e.target.value })} className="glass-input w-full px-4 py-3" placeholder="https://linkedin.com/..." /></div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3 mt-auto">
                            <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-all text-sm">Cancel</button>
                            <button type="submit" form="addLeadForm" disabled={isAdding} className="glass-button px-6 py-2.5 rounded-xl font-bold bg-indigo-600/80 hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] border-indigo-500/50 text-white disabled:opacity-50 text-sm flex items-center gap-2">
                                {isAdding ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : "Inject Entity"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* EDIT MODAL */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg glass-panel rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2"><Edit2 className="w-5 h-5 text-indigo-400" /> Update Profile</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto scrollbar-none">
                            <form id="editLeadForm" onSubmit={handleEditLeadSubmit} className="space-y-4">
                                <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Entity</label><input type="text" required value={editLeadData.companyName} onChange={e => setEditLeadData({ ...editLeadData, companyName: e.target.value })} className="glass-input w-full px-4 py-3" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">POC Name</label><input type="text" value={editLeadData.contactName} onChange={e => setEditLeadData({ ...editLeadData, contactName: e.target.value })} className="glass-input w-full px-4 py-3" /></div>
                                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sector</label><input type="text" value={editLeadData.category} onChange={e => setEditLeadData({ ...editLeadData, category: e.target.value })} className="glass-input w-full px-4 py-3" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Relay</label><input type="email" value={editLeadData.email} onChange={e => setEditLeadData({ ...editLeadData, email: e.target.value })} className="glass-input w-full px-4 py-3" /></div>
                                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Voice Comms</label><input type="text" value={editLeadData.phone} onChange={e => setEditLeadData({ ...editLeadData, phone: e.target.value })} className="glass-input w-full px-4 py-3" /></div>
                                </div>
                                <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Domain</label><input type="url" value={editLeadData.website} onChange={e => setEditLeadData({ ...editLeadData, website: e.target.value })} className="glass-input w-full px-4 py-3" /></div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3 mt-auto">
                            <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-all text-sm">Cancel</button>
                            <button type="submit" form="editLeadForm" disabled={isEditing} className="glass-button px-6 py-2.5 rounded-xl font-bold bg-indigo-600/80 hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] border-indigo-500/50 text-white disabled:opacity-50 text-sm flex items-center gap-2">
                                {isEditing ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing...</> : "Sync Changes"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
