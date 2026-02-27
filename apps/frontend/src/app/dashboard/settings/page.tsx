"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import toast from "react-hot-toast";
import { Users, Mail, UserPlus, Shield, Loader2, Building } from "lucide-react";

interface TenantProfile {
    id: string;
    name: string;
    enabledModules: string[];
    createdAt: string;
}

interface TenantUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    createdAt: string;
}

export default function SettingsPage() {
    const { user } = useAuth();
    const [tenant, setTenant] = useState<TenantProfile | null>(null);
    const [users, setUsers] = useState<TenantUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviting, setIsInviting] = useState(false);

    // Form State
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [role, setRole] = useState("MEMBER");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [tenantRes, usersRes] = await Promise.all([
                api.get("/tenants/me"),
                api.get("/tenants/me/users")
            ]);
            setTenant(tenantRes.data);
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        } catch (error) {
            console.error("Failed to fetch settings data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsInviting(true);
        try {
            await api.post("/tenants/me/users", {
                email,
                firstName,
                lastName,
                role
            });

            toast.success("Team member invited successfully!");
            setEmail("");
            setFirstName("");
            setLastName("");
            setRole("MEMBER");
            fetchData(); // Refresh list
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to invite user");
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-full">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Workspace Settings</h1>
                <p className="text-slate-400 mt-1">Manage your tenant profile and invite team members.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">

                {/* Tenant Profile Data */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                            <Building className="w-5 h-5 text-indigo-400" />
                            Tenant Profile
                        </h2>

                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        ) : tenant ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Workspace ID</label>
                                    <div className="text-sm font-mono text-slate-300 bg-black/20 p-2 rounded border border-white/5 break-all">
                                        {tenant.id}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Company Name</label>
                                    <div className="text-sm text-slate-200 font-medium">
                                        {tenant.name}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Active Modules</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {tenant.enabledModules?.map(mod => (
                                            <span key={mod} className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                {mod}
                                            </span>
                                        )) || <span className="text-slate-500 text-sm">None</span>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm">Could not load profile.</p>
                        )}
                    </div>

                    {/* Add User Form */}
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_OWNER') && (
                        <form onSubmit={handleInviteUser} className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                                <UserPlus className="w-5 h-5 text-emerald-400" />
                                Invite Member
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                >
                                    <option value="MEMBER">Standard Member</option>
                                    <option value="TENANT_OWNER">Workspace Admin</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isInviting}
                                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                            >
                                {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Invitation"}
                            </button>
                        </form>
                    )}
                </div>

                {/* User List Table */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full">
                        <div className="p-6 border-b border-white/5 flex items-center gap-3">
                            <Users className="w-5 h-5 text-indigo-400" />
                            <h2 className="text-xl font-bold text-white">Team Directory</h2>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-950/50 border-b border-white/5 text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">User Details</th>
                                        <th className="px-6 py-4 font-medium">Role</th>
                                        <th className="px-6 py-4 font-medium">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                                Loading team members...
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                                No team members found.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((member) => (
                                            <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-white">
                                                        {member.firstName || member.lastName ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : "Unknown User"}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-400 text-xs mt-0.5">
                                                        <Mail className="w-3 h-3" />
                                                        {member.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${member.role === 'TENANT_OWNER' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                            member.role === 'SUPER_ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        }`}>
                                                        <Shield className="w-3 h-3 mr-1" />
                                                        {member.role === 'TENANT_OWNER' ? 'Admin' : member.role === 'SUPER_ADMIN' ? 'System' : 'Member'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400">
                                                    {new Date(member.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
