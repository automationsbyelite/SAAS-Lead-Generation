"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Bell, LogOut, Menu } from "lucide-react";
import Link from "next/link";

export function Topbar() {
    const { user, logout } = useAuth();

    return (
        <header className="h-16 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-20">
            <div className="flex items-center gap-4">
                {/* Mobile menu button could go here */}
                <button className="lg:hidden text-slate-400 hover:text-white">
                    <Menu className="h-6 w-6" />
                </button>

                <div className="hidden sm:flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm text-slate-400">Worker Connected</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 border-2 border-slate-950" />
                </button>

                <div className="h-8 w-px bg-white/10" />

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-white leading-none">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-slate-400 mt-1">{user?.role.replace('_', ' ')}</p>
                    </div>

                    <Link href="/dashboard/settings" className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors cursor-pointer">
                        {user?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </Link>

                    <button
                        onClick={logout}
                        className="ml-2 p-2 text-slate-400 hover:text-red-400 transition-colors rounded-full hover:bg-red-400/10"
                        title="Sign Out"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </header>
    );
}
