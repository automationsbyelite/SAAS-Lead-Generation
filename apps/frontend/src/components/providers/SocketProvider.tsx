"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthProvider";
import toast from "react-hot-toast";

interface ScraperProgress {
    progress: number;
    found: number;
    status: string;
    jobId: string;
}

interface SocketContextType {
    scraperProgress: ScraperProgress | null;
    scraperDone: boolean;
    resetScraperState: () => void;
}

const SocketContext = createContext<SocketContextType>({
    scraperProgress: null,
    scraperDone: false,
    resetScraperState: () => { },
});

export const useSocketContext = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const { token } = useAuth();
    const [scraperProgress, setScraperProgress] = useState<ScraperProgress | null>(null);
    const [scraperDone, setScraperDone] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const resetScraperState = () => {
        setScraperProgress(null);
        setScraperDone(false);
    };

    useEffect(() => {
        if (!token) return;

        const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000", {
            extraHeaders: {
                Authorization: `Bearer ${token}`,
            },
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("🟢 WebSockets Connected to Background Workers");
        });

        // Real-time scraper progress
        socket.on("scraper.progress", (data: any) => {
            setScraperProgress({
                progress: data.progress,
                found: data.found,
                status: data.status,
                jobId: data.jobId,
            });
        });

        // Scraper completed
        socket.on("scraper.completed", (data: any) => {
            setScraperProgress(prev => prev ? { ...prev, progress: 100, status: "Complete! Redirecting..." } : null);
            setScraperDone(true);
            toast.success("Leads generated successfully!", { icon: "🤖" });
        });

        // Scraper failed
        socket.on("scraper.failed", (data: any) => {
            setScraperProgress(null);
            setScraperDone(false);
            toast.error(`Scraper Job Failed: ${data.error || "Unknown error"}`, { icon: "❌" });
        });

        // Campaign Events
        socket.on("campaign.completed", () => {
            toast.success("Outbound Campaign completed successfully!", { icon: "✅" });
        });
        socket.on("campaign.failed", (data: any) => {
            toast.error(`Outbound Campaign Failed: ${data.error || "Unknown error"}`, { icon: "⚠️" });
        });

        return () => {
            socket.disconnect();
        };
    }, [token]);

    return (
        <SocketContext.Provider value={{ scraperProgress, scraperDone, resetScraperState }}>
            {children}
        </SocketContext.Provider>
    );
}
