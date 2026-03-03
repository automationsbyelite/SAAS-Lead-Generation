"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SocketProvider } from "@/components/providers/SocketProvider";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <SocketProvider>
            <div className="flex h-screen overflow-hidden bg-transparent">
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative overflow-hidden transition-all duration-300">
                    <Topbar setIsSidebarOpen={setIsSidebarOpen} />
                    <main className="flex-1 overflow-y-auto w-full scrollbar-none pb-24 lg:pb-8 relative">
                        {/* Decorative Top Gradient for depth inside the main view */}
                        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none -z-10" />

                        <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full relative z-10">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </SocketProvider>
    );
}
