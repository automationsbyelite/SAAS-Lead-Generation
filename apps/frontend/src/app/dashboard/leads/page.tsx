"use client";

import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import {
    Loader2, Mail, Phone, ExternalLink, MoreHorizontal, Users,
    Search, Globe, Linkedin, Instagram, Facebook, CheckCircle2,
    Circle, Trash2, Copy, Tag, ChevronDown, Plus, X
} from "lucide-react";
import toast from "react-hot-toast";

interface Lead {
    id: string;
    firstName?: string;
    lastName?: string;
    title?: string;
    companyName: string;
    category?: string;
    website?: string;
    email?: string;
    phone?: string;
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    status: string;
    customData?: any;
    createdAt: string;
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Add lead form state
    const [newLead, setNewLead] = useState({
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
        if (statusFilter !== "ALL") {
            result = result.filter(l => l.status === statusFilter);
        }
        if (categoryFilter !== "ALL") {
            result = result.filter(l => l.category === categoryFilter);
        }
        return result;
    }, [leads, search, statusFilter, categoryFilter]);

    const stats = useMemo(() => ({
        total: leads.length,
        withEmail: leads.filter(l => l.email).length,
        withPhone: leads.filter(l => l.phone).length,
        new: leads.filter(l => l.status === "NEW").length,
    }), [leads]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/leads/${id}`);
            toast.success("Lead deleted.");
            setActiveMenu(null);
            fetchLeads();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete lead");
        }
    };

    const formatWebsite = (url: string) => {
        try {
            return new URL(url).hostname.replace("www.", "");
        } catch {
            return url;
        }
    };

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLead.companyName.trim()) {
            toast.error("Company name is required.");
            return;
        }
        setIsAdding(true);
        try {
            await api.post("/leads", {
                companyName: newLead.companyName,
                contactName: newLead.contactName || undefined,
                email: newLead.email || undefined,
                phone: newLead.phone || undefined,
                website: newLead.website || undefined,
                category: newLead.category || undefined,
                facebook: newLead.facebook || undefined,
                linkedin: newLead.linkedin || undefined,
                instagram: newLead.instagram || undefined,
                source: "MANUAL",
            });
            toast.success("Lead added successfully!");
            setShowAddModal(false);
            setNewLead({ companyName: "", contactName: "", email: "", phone: "", website: "", category: "", facebook: "", linkedin: "", instagram: "" });
            fetchLeads();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add lead");
        } finally {
            setIsAdding(false);
        }
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leads CRM</h1>
                    <p className="text-slate-400 mt-1">Manage and view all prospects generated by your Scraper jobs.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20 text-sm"
                >
                    <Plus className="w-4 h-4" /> Add Lead
                </button>
            </div>

            {/* Stat Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Leads", value: stats.total, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                    { label: "New Leads", value: stats.new, icon: Circle, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "With Email", value: stats.withEmail, icon: Mail, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "With Phone", value: stats.withPhone, icon: Phone, color: "text-violet-400", bg: "bg-violet-500/10" },
                ].map(s => (
                    <div key={s.label} className="bg-slate-900 border border-white/5 rounded-xl p-4 flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${s.bg}`}>
                            <s.icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{s.value}</div>
                            <div className="text-xs text-slate-500">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by company, email, phone, or website..."
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    {["ALL", "NEW", "CONTACTED", "QUALIFIED"].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${statusFilter === s
                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                : "bg-slate-900 text-slate-400 border-white/5 hover:border-white/10"
                                }`}
                        >
                            {s === "ALL" ? "All" : s}
                        </button>
                    ))}
                </div>
                {categories.length > 0 && (
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <select
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="pl-9 pr-8 py-2 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
                        >
                            <option value="ALL">All Categories</option>
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/50 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Company</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Info</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Socials</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Users className="w-8 h-8 text-slate-600" />
                                        </div>
                                        <p className="font-medium text-white mb-1">No leads found</p>
                                        <p className="text-sm text-slate-400">
                                            {search ? "Try a different search term." : "Start a Scraper job to generate some!"}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                                        {/* Company Column */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/5 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-sm font-bold text-indigo-300">
                                                        {(lead.companyName || "?")[0].toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-white truncate max-w-[220px]">{lead.companyName || "Unknown"}</div>
                                                    {lead.website ? (
                                                        <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-400 transition-colors mt-0.5">
                                                            <Globe className="w-3 h-3" />
                                                            {formatWebsite(lead.website)}
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-slate-600 mt-0.5 block">No website</span>
                                                    )}
                                                    {lead.category && (
                                                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-medium rounded border border-indigo-500/20">
                                                            <Tag className="w-2.5 h-2.5" /> {lead.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contact Info Column - Email & Phone stacked */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1.5">
                                                {lead.email ? (
                                                    <button
                                                        onClick={() => copyToClipboard(lead.email!)}
                                                        className="flex items-center gap-1.5 text-slate-300 hover:text-indigo-300 transition-colors group/copy"
                                                    >
                                                        <Mail className="w-3.5 h-3.5 text-emerald-500/70" />
                                                        <span className="text-xs truncate max-w-[200px]">{lead.email}</span>
                                                        <Copy className="w-3 h-3 text-slate-600 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                                                    </button>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-xs text-slate-600">
                                                        <Mail className="w-3.5 h-3.5" /> No email
                                                    </span>
                                                )}
                                                {lead.phone ? (
                                                    <button
                                                        onClick={() => copyToClipboard(lead.phone!)}
                                                        className="flex items-center gap-1.5 text-slate-300 hover:text-indigo-300 transition-colors group/copy"
                                                    >
                                                        <Phone className="w-3.5 h-3.5 text-violet-500/70" />
                                                        <span className="text-xs">{lead.phone}</span>
                                                        <Copy className="w-3 h-3 text-slate-600 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                                                    </button>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-xs text-slate-600">
                                                        <Phone className="w-3.5 h-3.5" /> No phone
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${lead.status === "NEW"
                                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                : lead.status === "CONTACTED"
                                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                    : lead.status === "QUALIFIED"
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        : "bg-slate-800 text-slate-400 border-slate-700"
                                                }`}>
                                                {lead.status === "NEW" && <Circle className="w-2.5 h-2.5 fill-current" />}
                                                {lead.status === "CONTACTED" && <CheckCircle2 className="w-3 h-3" />}
                                                {lead.status === "QUALIFIED" && <CheckCircle2 className="w-3 h-3" />}
                                                {lead.status}
                                            </span>
                                        </td>

                                        {/* Socials */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {lead.linkedin && (
                                                    <a href={lead.linkedin} target="_blank" rel="noreferrer"
                                                        className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-colors" title="LinkedIn">
                                                        <Linkedin className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                                {lead.facebook && (
                                                    <a href={lead.facebook} target="_blank" rel="noreferrer"
                                                        className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 hover:bg-sky-500/20 transition-colors" title="Facebook">
                                                        <Facebook className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                                {lead.instagram && (
                                                    <a href={lead.instagram} target="_blank" rel="noreferrer"
                                                        className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 hover:bg-pink-500/20 transition-colors" title="Instagram">
                                                        <Instagram className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                                {!lead.linkedin && !lead.facebook && !lead.instagram && (
                                                    <span className="text-xs text-slate-600">—</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() => setActiveMenu(activeMenu === lead.id ? null : lead.id)}
                                                    className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                                {activeMenu === lead.id && (
                                                    <div className="absolute right-0 mt-1 w-40 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-20 py-1">
                                                        {lead.website && (
                                                            <a href={lead.website} target="_blank" rel="noreferrer"
                                                                className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2 block">
                                                                <ExternalLink className="w-3.5 h-3.5" /> Visit Website
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(lead.id)}
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

                {/* Footer */}
                {filteredLeads.length > 0 && (
                    <div className="px-6 py-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                            Showing <strong className="text-slate-300">{filteredLeads.length}</strong> of {leads.length} leads
                        </span>
                    </div>
                )}
            </div>

            {/* Add Lead Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-indigo-400" />
                                </div>
                                <h3 className="text-base font-semibold text-white">Add New Lead</h3>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleAddLead}>
                            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                                {/* Company & Contact */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Company Info</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text" value={newLead.companyName}
                                            onChange={e => setNewLead({ ...newLead, companyName: e.target.value })}
                                            placeholder="Company Name *" required
                                            className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                        />
                                        <input
                                            type="text" value={newLead.contactName}
                                            onChange={e => setNewLead({ ...newLead, contactName: e.target.value })}
                                            placeholder="Contact Name"
                                            className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Email & Phone */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Contact Details</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                            <input
                                                type="email" value={newLead.email}
                                                onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                                                placeholder="Email address"
                                                className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                            <input
                                                type="text" value={newLead.phone}
                                                onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
                                                placeholder="Phone number"
                                                className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Website & Category */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Additional Info</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                            <input
                                                type="text" value={newLead.website}
                                                onChange={e => setNewLead({ ...newLead, website: e.target.value })}
                                                placeholder="https://website.com"
                                                className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                            <input
                                                type="text" value={newLead.category}
                                                onChange={e => setNewLead({ ...newLead, category: e.target.value })}
                                                placeholder="Category (e.g. Dentist)"
                                                className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Social Links */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Social Links (Optional)</label>
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400" />
                                            <input
                                                type="text" value={newLead.linkedin}
                                                onChange={e => setNewLead({ ...newLead, linkedin: e.target.value })}
                                                placeholder="LinkedIn URL"
                                                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="relative">
                                                <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500" />
                                                <input
                                                    type="text" value={newLead.facebook}
                                                    onChange={e => setNewLead({ ...newLead, facebook: e.target.value })}
                                                    placeholder="Facebook URL"
                                                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pink-400" />
                                                <input
                                                    type="text" value={newLead.instagram}
                                                    onChange={e => setNewLead({ ...newLead, instagram: e.target.value })}
                                                    placeholder="Instagram URL"
                                                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAdding || !newLead.companyName.trim()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 text-sm"
                                >
                                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    {isAdding ? "Adding..." : "Add Lead"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
