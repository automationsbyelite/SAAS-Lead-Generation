"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Bell, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Topbar({ setIsSidebarOpen }: { setIsSidebarOpen: (v: boolean) => void }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    // Map path to a dynamic readable title
    const formattedTitle = pathname === '/dashboard' ? 'Overview' :
        pathname.includes('scraper') ? 'Scraper Engine' :
            pathname.includes('leads') ? 'Leads CRM' :
                pathname.includes('campaigns') ? 'Outreach Campaigns' :
                    pathname.includes('social-publisher') ? 'Social Publisher' :
                        pathname.includes('billing') ? 'Billing & Modules' :
                            pathname.includes('tenants') ? 'Tenants (Admin)' : 'Dashboard';

    return (
        <header className="h-20 flex items-center justify-between px-6 bg-slate-900/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-20 shadow-sm shadow-black/20">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Toggle Button */}
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                    <Menu className="h-6 w-6" />
                </button>

                <div className="flex flex-col">
                    <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{formattedTitle}</h1>
                    <div className="hidden sm:flex items-center gap-2 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Worker Connected</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-5">
                <button className="relative p-2.5 text-slate-400 hover:text-white transition-all duration-300 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10 hover:shadow-lg">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                </button>

                <div className="h-8 w-px bg-white/10 hidden sm:block" />

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-white leading-none tracking-tight">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">{user?.role.replace('_', ' ')}</p>
                    </div>

                    <Link href="/dashboard/settings" className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-500/30 hover:bg-indigo-500/30 hover:border-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all duration-300 cursor-pointer">
                        {user?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </Link>

                    <button
                        onClick={logout}
                        className="ml-1 p-2.5 text-slate-400 hover:text-red-400 transition-all duration-300 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                        title="Sign Out"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </header>
    );
}
