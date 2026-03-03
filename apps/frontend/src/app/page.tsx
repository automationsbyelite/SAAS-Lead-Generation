"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Database, Zap, Shield, ChevronRight, Globe2, BarChart3, CheckCircle2, BrainCircuit, Sparkles, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

export default function LandingPage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 overflow-hidden">

      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center shadow-lg shadow-indigo-500/20">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Reach<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Stack</span></span>
          </div>
          <div className="flex items-center gap-6">
            {!isLoading && (
              user ? (
                <Link href="/dashboard" className="flex items-center gap-2 group">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30 group-hover:bg-indigo-500/40 transition-colors">
                    {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors flex items-center gap-1">
                    Dashboard <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </span>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                    Sign In
                  </Link>
                  <Link href="/register" className="text-sm font-bold px-6 py-2.5 rounded-full bg-white text-slate-950 hover:bg-slate-200 transition-colors shadow-xl shadow-white/10 hover:shadow-white/20">
                    Start Free Trial
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 pt-32 pb-24 lg:pt-48 lg:pb-32">
          <div className="text-center max-w-4xl mx-auto">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-slate-300 mb-8 backdrop-blur-md"
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              AI-Powered Outreach Engine — Now Live
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-6xl lg:text-8xl font-black tracking-tight mb-8"
            >
              The AI-Powered <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">
                Outreach Engine.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl lg:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              Scrape leads with AI precision, build your CRM, and launch personalized voice calls and email campaigns—all from one intelligent dashboard.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/register" className="w-full sm:w-auto px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-all shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 group">
                Launch Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="#features" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-lg transition-all flex items-center justify-center gap-2">
                View Capabilities
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Value Prop Cards */}
        <div id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 bg-slate-950/50 backdrop-blur-md">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Replace Your Entire Tech Stack</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Stop paying for five different tools. Our engine handles the entire outbound lifecycle automatically.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">

            {/* Card 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-slate-900/50 border border-white/5 hover:bg-slate-900 transition-colors group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 grid place-items-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                <Globe2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Web Scraping Engine</h3>
              <p className="text-slate-400 leading-relaxed text-sm mb-6">
                Tell our background workers what you're looking for. We autonomously scrape domains, extract clean lead data, and bypass captchas.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Deep Domain Extraction</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Automated Lead Formatting</li>
              </ul>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-3xl bg-slate-900/50 border border-white/5 hover:bg-slate-900 transition-colors group"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 grid place-items-center mb-6 group-hover:bg-indigo-500/20 transition-colors">
                <Database className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Isolated CRM Vault</h3>
              <p className="text-slate-400 leading-relaxed text-sm mb-6">
                All scraped data is instantly written to your secure, tenant-isolated CRM. Manage prospects, track statuses, and organize your pipeline.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Multi-Tenant Architecture</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Real-time PostgreSQL Sync</li>
              </ul>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-3xl bg-slate-900/50 border border-white/5 hover:bg-slate-900 transition-colors group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-3xl rounded-full" />
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 grid place-items-center mb-6 group-hover:bg-violet-500/20 transition-colors relative z-10">
                <Bot className="w-7 h-7 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 relative z-10">3. AI Voice & Email Execution</h3>
              <p className="text-slate-400 leading-relaxed text-sm mb-6 relative z-10">
                Turn data into conversations. Select your leads and deploy our VAPI-powered AI to call them, or use our SMTP engine for cold email sequencing.
              </p>
              <ul className="space-y-2 text-sm text-slate-300 relative z-10">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-violet-500" /> Autonomous Voice Calling</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-violet-500" /> Dynamic Prompt Injection</li>
              </ul>
            </motion.div>

          </div>
        </div>

        {/* CTA Section */}
        <div className="py-24 border-t border-white/5 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-2xl bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Ready to scale your outreach?</h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">Create your tenant workspace today and instantly unlock the AI Voice Agent module for free.</p>
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-slate-950 font-bold text-lg hover:bg-slate-200 transition-colors shadow-xl shadow-white/10 group">
              Create Workspace
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
