"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Search,
    Users,
    Megaphone,
    CreditCard,
    Settings,
    Shield,
    Share2,
    BrainCircuit,
    X
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import { useEffect } from "react";

const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Scraper Engine", href: "/dashboard/scraper", icon: Search },
    { name: "Leads CRM", href: "/dashboard/leads", icon: Users },
    { name: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
    { name: "Social Publisher", href: "/dashboard/social-publisher", icon: Share2 },
    { name: "Billing & Modules", href: "/dashboard/billing", icon: CreditCard },
];

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
    const pathname = usePathname();
    const { user } = useAuth();

    // Close sidebar on mobile when navigating
    useEffect(() => {
        setIsOpen(false);
    }, [pathname, setIsOpen]);

    const currentNav = [...navigation];
    if (user?.role === 'SUPER_ADMIN') {
        currentNav.push({ name: "Tenants (Admin)", href: "/dashboard/tenants", icon: Shield });
    }

    const SidebarContent = (
        <div className="flex h-full w-72 flex-col glass-panel md:border-y-0 md:border-l-0 md:rounded-none">
            <div className="flex h-20 items-center justify-between px-6 border-b border-white/5">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center flex-shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                        <BrainCircuit className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white truncate">Reach<span className="text-gradient">Stack</span></span>
                </Link>
                {/* Mobile Close Button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 scrollbar-none">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Main Menu</div>
                {currentNav.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${isActive ? "text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-activeIndicator"
                                    className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-violet-500/5 border border-indigo-500/20 rounded-xl"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <item.icon className={`h-5 w-5 z-10 ${isActive ? "text-indigo-400" : "group-hover:text-indigo-300 group-hover:scale-110 transition-all duration-300"}`} />
                            <span className="text-sm font-medium z-10">{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t border-white/5 bg-black/20">
                <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300 group"
                >
                    <Settings className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500 text-slate-500 group-hover:text-slate-300" />
                    <span className="text-sm font-medium">Settings</span>
                </Link>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar (Fixed) */}
            <div className="hidden md:block h-full relative z-30 shadow-2xl">
                {SidebarContent}
            </div>

            {/* Mobile Sidebar (Drawer) */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="fixed inset-y-0 left-0 z-50 md:hidden shadow-2xl"
                        >
                            {SidebarContent}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
