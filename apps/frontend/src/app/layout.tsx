import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReachStack — AI-Powered Lead Generation & Outreach",
  description: "Scrape leads, build your CRM, and launch AI-driven voice calls and email campaigns from one intelligent dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${jakarta.variable} antialiased bg-[#050505] text-slate-200 min-h-screen selection:bg-indigo-500/30 font-sans overflow-x-hidden`}
      >
        {/* Global Atmospheric Radial Gradient */}
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(65,58,180,0.15),rgba(255,255,255,0))] pointer-events-none" />

        <AuthProvider>
          {children}
        </AuthProvider>

        <Toaster theme="dark" position="bottom-right" className="font-sans" toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
          }
        }} />
      </body>
    </html>
  );
}
