"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
    Search, Building2, Users, Shield, Loader2, Edit3, X,
    CheckCircle2, Circle, Zap, Package, Phone, Mail, Crown, Share2
} from "lucide-react";
import toast from "react-hot-toast";

interface Tenant {
    id: string;
    name: string;
    isActive: boolean;
    enabledModules: string[];
    createdAt: string;
}

export default function TenantsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modals state
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);

    // Users state
    const [tenantUsers, setTenantUsers] = useState<any[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Modules state
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [isSavingModules, setIsSavingModules] = useState(false);

    // Guard: Redirect non-admins
    useEffect(() => {
        if (!authLoading && user?.role !== 'SUPER_ADMIN') {
            router.replace('/dashboard');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user?.role === 'SUPER_ADMIN') {
            fetchTenants();
        }
    }, [user]);

    const fetchTenants = async () => {
        try {
            const { data } = await api.get<Tenant[]>("/tenants");
            setTenants(data);
        } catch (error) {
            toast.error("Failed to fetch workspaces");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTenants = useMemo(() => {
        if (!searchQuery) return tenants;
        const q = searchQuery.toLowerCase();
        return tenants.filter(t =>
            t.id.toLowerCase().includes(q) ||
            t.name?.toLowerCase().includes(q)
        );
    }, [tenants, searchQuery]);

    const stats = useMemo(() => ({
        total: tenants.length,
        active: tenants.filter(t => t.isActive).length,
        withModules: tenants.filter(t => t.enabledModules.length > 0).length,
        free: tenants.filter(t => t.enabledModules.length === 0).length,
    }), [tenants]);

    const openUsersModal = async (tenantId: string) => {
        setSelectedTenantId(tenantId);
        setIsUsersModalOpen(true);
        setIsLoadingUsers(true);
        try {
            const { data } = await api.get(`/tenants/${tenantId}/users`);
            setTenantUsers(data);
        } catch (error) {
            toast.error("Failed to fetch tenant users");
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const openModulesModal = (tenant: Tenant) => {
        setSelectedTenantId(tenant.id);
        setSelectedModules([...tenant.enabledModules]);
        setIsModulesModalOpen(true);
    };

    const saveModules = async () => {
        if (!selectedTenantId) return;
        setIsSavingModules(true);
        try {
            await api.patch(`/tenants/${selectedTenantId}/modules`, {
                enabledModules: selectedModules
            });
            toast.success("Modules updated successfully");
            setIsModulesModalOpen(false);
            fetchTenants();
        } catch (error) {
            toast.error("Failed to update modules");
        } finally {
            setIsSavingModules(false);
        }
    };

    const moduleLabels: Record<string, { label: string; icon: any; color: string; bg: string }> = {
        AI_CALL: { label: "AI Voice", icon: Phone, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
        EMAIL: { label: "Email", icon: Mail, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        SCRAPER_PRO: { label: "Scraper Pro", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
        SOCIAL_PUBLISHER: { label: "Social Publisher", icon: Share2, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (user?.role !== 'SUPER_ADMIN') return null;

    return (
        <div className="space-y-6 max-w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Shield className="h-7 w-7 text-indigo-400" />
                        <h1 className="text-3xl font-bold tracking-tight">Tenant Manager</h1>
                    </div>
                    <p className="text-slate-400 mt-1">Manage all registered workspaces, users, and module configurations.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-72 pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Tenants", value: stats.total, icon: Building2, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                    { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "With Modules", value: stats.withModules, icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10" },
                    { label: "Free Tier", value: stats.free, icon: Circle, color: "text-slate-400", bg: "bg-slate-500/10" },
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

            {/* Table */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/50 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Workspace</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Modules</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTenants.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Building2 className="w-8 h-8 text-slate-600" />
                                        </div>
                                        <p className="font-medium text-white mb-1">No tenants found</p>
                                        <p className="text-sm text-slate-400">
                                            {searchQuery ? "Try a different search term." : "No workspaces have been registered yet."}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredTenants.map(t => (
                                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                                        {/* Workspace */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/5 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-sm font-bold text-indigo-300">
                                                        {(t.name || "T")[0].toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{t.name || "Unnamed Workspace"}</div>
                                                    <div className="text-xs text-slate-500 font-mono mt-0.5">{t.id.split('-')[0]}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${t.isActive
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                : "bg-red-500/10 text-red-400 border-red-500/20"
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                                {t.isActive ? "Active" : "Suspended"}
                                            </span>
                                        </td>

                                        {/* Modules */}
                                        <td className="px-6 py-4">
                                            {t.enabledModules.length === 0 ? (
                                                <span className="text-xs text-slate-500 italic">Free Tier</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {t.enabledModules.map(mod => {
                                                        const info = moduleLabels[mod];
                                                        if (!info) return (
                                                            <span key={mod} className="px-2 py-0.5 rounded-md bg-slate-800 text-xs text-slate-300 border border-slate-700">
                                                                {mod}
                                                            </span>
                                                        );
                                                        return (
                                                            <span key={mod} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${info.bg}`}>
                                                                <info.icon className={`w-3 h-3 ${info.color}`} />
                                                                <span className={info.color}>{info.label}</span>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </td>

                                        {/* Joined */}
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {new Date(t.createdAt).toLocaleDateString("en-US", {
                                                month: "short", day: "numeric", year: "numeric"
                                            })}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openUsersModal(t.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-white/5 transition-colors"
                                                    title="View Users"
                                                >
                                                    <Users className="h-3.5 w-3.5" /> Users
                                                </button>
                                                <button
                                                    onClick={() => openModulesModal(t)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition-colors"
                                                    title="Edit Modules"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" /> Modules
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                {filteredTenants.length > 0 && (
                    <div className="px-6 py-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                            Showing <strong className="text-slate-300">{filteredTenants.length}</strong> of {tenants.length} workspaces
                        </span>
                    </div>
                )}
            </div>

            {/* Users Modal */}
            {isUsersModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setIsUsersModalOpen(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Workspace Users</h2>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedTenantId?.split('-')[0]}</p>
                            </div>
                            <button onClick={() => setIsUsersModalOpen(false)} className="text-slate-400 hover:text-white transition-colors text-lg">✕</button>
                        </div>
                        <div className="p-6 max-h-[400px] overflow-y-auto">
                            {isLoadingUsers ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                </div>
                            ) : tenantUsers.length === 0 ? (
                                <p className="text-center text-slate-400 py-4">No users found.</p>
                            ) : (
                                <div className="space-y-2">
                                    {tenantUsers.map(u => (
                                        <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-slate-950/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/5 flex items-center justify-center">
                                                    <span className="text-sm font-bold text-indigo-300">
                                                        {(u.firstName || "?")[0].toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-white">{u.firstName} {u.lastName}</p>
                                                        {u.role === 'TENANT_OWNER' && (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">OWNER</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-white/5">
                                                {u.role.replace('_', ' ')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modules Modal */}
            {isModulesModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setIsModulesModalOpen(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Manage Modules</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Toggle premium features for this workspace</p>
                            </div>
                            <button onClick={() => setIsModulesModalOpen(false)} className="text-slate-400 hover:text-white transition-colors text-lg">✕</button>
                        </div>
                        <div className="p-6 space-y-3">
                            {['AI_CALL', 'EMAIL', 'SCRAPER_PRO', 'SOCIAL_PUBLISHER'].map(mod => {
                                const info = moduleLabels[mod];
                                const isChecked = selectedModules.includes(mod);
                                return (
                                    <label
                                        key={mod}
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isChecked
                                            ? "border-indigo-500 bg-indigo-500/5"
                                            : "border-white/5 bg-slate-950/50 hover:border-white/10"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedModules([...selectedModules, mod]);
                                                } else {
                                                    setSelectedModules(selectedModules.filter(m => m !== mod));
                                                }
                                            }}
                                        />
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${info.bg}`}>
                                            <info.icon className={`w-5 h-5 ${info.color}`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-white text-sm">
                                                {mod === 'AI_CALL' ? 'VAPI AI Voice Agent' : mod === 'EMAIL' ? 'SMTP Email Outreach' : mod === 'SOCIAL_PUBLISHER' ? 'Social Publisher' : 'Scraper Pro (Uncapped)'}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {mod === 'AI_CALL' ? 'Automated AI cold calls via VAPI' : mod === 'EMAIL' ? 'Bulk email campaigns via SMTP' : mod === 'SOCIAL_PUBLISHER' ? 'Multi-platform social media auto-posting' : 'No lead limits, priority queue'}
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isChecked
                                            ? "bg-indigo-600 border-indigo-500"
                                            : "border-slate-600"
                                            }`}>
                                            {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    </label>
                                );
                            })}

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsModulesModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveModules}
                                    disabled={isSavingModules}
                                    className="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                                >
                                    {isSavingModules && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
