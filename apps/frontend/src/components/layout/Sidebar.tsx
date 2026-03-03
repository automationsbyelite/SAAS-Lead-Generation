"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    Search,
    Users,
    Megaphone,
    CreditCard,
    Settings,
    Shield,
    Share2,
    BrainCircuit
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";

const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Scraper Engine", href: "/dashboard/scraper", icon: Search },
    { name: "Leads CRM", href: "/dashboard/leads", icon: Users },
    { name: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
    { name: "Social Publisher", href: "/dashboard/social-publisher", icon: Share2 },
    { name: "Billing & Modules", href: "/dashboard/billing", icon: CreditCard },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    // Dynamically inject Tenants tab for Super Admins
    const currentNav = [...navigation];
    if (user?.role === 'SUPER_ADMIN') {
        currentNav.push({ name: "Tenants (Admin)", href: "/dashboard/tenants", icon: Shield });
    }

    return (
        <div className="flex h-full w-64 flex-col bg-slate-900 border-r border-white/5">
            <div className="flex h-16 items-center px-6 border-b border-white/5">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                        <BrainCircuit className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-white truncate">Reach<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Stack</span></span>
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {currentNav.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive ? "text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-indigo-500/10 rounded-lg"
                                    initial={false}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <item.icon className={`h-5 w-5 z-10 ${isActive ? "text-indigo-400" : "group-hover:text-indigo-300 transition-colors"}`} />
                            <span className="text-sm font-medium z-10">{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t border-white/5">
                <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors group"
                >
                    <Settings className="h-5 w-5 group-hover:rotate-45 transition-transform duration-300" />
                    <span className="text-sm font-medium">Settings</span>
                </Link>
            </div>
        </div>
    );
}
