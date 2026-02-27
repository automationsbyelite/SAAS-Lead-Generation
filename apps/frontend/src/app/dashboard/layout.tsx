import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toaster } from "react-hot-toast";
import { SocketProvider } from "@/components/providers/SocketProvider";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SocketProvider>
            <div className="flex h-screen overflow-hidden bg-slate-950">
                <Sidebar />
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <Topbar />
                    <main className="flex-1 overflow-y-auto w-full">
                        <div className="p-8 max-w-7xl mx-auto w-full">
                            {children}
                        </div>
                    </main>
                </div>
                <Toaster position="bottom-right" toastOptions={{
                    className: '!bg-slate-900 !text-white !border !border-white/10 !rounded-xl',
                }} />
            </div>
        </SocketProvider>
    );
}
