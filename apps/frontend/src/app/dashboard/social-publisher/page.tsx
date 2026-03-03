"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ContentCalendar } from "@/components/social-publisher/ContentCalendar";
import { QueueManager } from "@/components/social-publisher/QueueManager";
import {
    Facebook, Instagram, Linkedin, Plus, Trash2, Clock, CheckCircle2,
    XCircle, Image as ImageIcon, Video, Send, ShieldAlert, Calendar,
    Sparkles, Loader2, Camera, Palette, Film, Wand2, Type, Link2,
    Heart, MessageCircle, Share2, Grid3X3, List
} from "lucide-react";
import api from "@/lib/api";

const AI_STYLES = [
    { id: 'Photorealistic', label: 'Photo', icon: Camera },
    { id: 'Digital Art', label: 'Digital Art', icon: Palette },
    { id: 'Cinematic', label: 'Cinematic', icon: Film },
    { id: 'Anime', label: 'Anime', icon: Wand2 }
];
const AI_FORMATS = [
    { id: '1:1', label: 'Square (1:1)' },
    { id: '4:3', label: 'Landscape (4:3)' },
    { id: '9:16', label: 'Portrait (9:16)' },
];

interface SocialAccount {
    id: string;
    platform: string;
    platformId: string;
    username: string;
    profilePicture: string;
    isActive: boolean;
}

interface SocialPost {
    id: string;
    platform: string;
    caption: string;
    mediaUrl: string;
    mediaType: string;
    scheduledAt: string;
    status: string;
    platformPostId?: string;
    errorMessage?: string;
    socialAccount?: SocialAccount;
}

const platformConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    facebook: { icon: Facebook, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]", label: "Facebook" },
    instagram: { icon: Instagram, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.15)]", label: "Instagram" },
    linkedin: { icon: Linkedin, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.15)]", label: "LinkedIn" },
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    scheduled: { icon: Clock, color: "text-amber-400", label: "Scheduled" },
    posted: { icon: CheckCircle2, color: "text-emerald-400", label: "Published" },
    failed: { icon: XCircle, color: "text-red-400", label: "Failed" },
    pending: { icon: Clock, color: "text-slate-400", label: "Pending" },
};

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function SocialPublisherPage() {
    const searchParams = useSearchParams();
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [moduleEnabled, setModuleEnabled] = useState(true);
    const [activeView, setActiveView] = useState<'overview' | 'queue' | 'calendar'>('overview');
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Create post form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState("");
    const [caption, setCaption] = useState("");
    const [mediaUrl, setMediaUrl] = useState("");
    const [mediaType, setMediaType] = useState("IMAGE");
    const [imageSource, setImageSource] = useState<"UPLOAD" | "URL">("URL");
    const [scheduledAt, setScheduledAt] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // AI Generation state
    const [isAiMode, setIsAiMode] = useState(false);
    const [aiTopic, setAiTopic] = useState("");
    const [aiStyle, setAiStyle] = useState("Photorealistic");
    const [aiRatio, setAiRatio] = useState("1:1");
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadData();
        const connected = searchParams.get("connected");
        const error = searchParams.get("error");
        if (connected) toast.success(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!`);
        if (error) toast.error("Failed to connect account. Please try again.");
    }, [searchParams]);

    const loadData = async () => {
        try {
            const [accountsRes, postsRes] = await Promise.all([
                api.get("/social-publisher/accounts"),
                api.get("/social-publisher/posts"),
            ]);
            setAccounts(accountsRes.data);
            setPosts(postsRes.data.data || []);
            setModuleEnabled(true);
        } catch (err: any) {
            if (err.response?.status === 403) {
                setModuleEnabled(false);
            } else {
                toast.error("Network sync failed");
            }
        } finally {
            setLoading(false);
        }
    };

    const connectPlatform = async (platform: string) => {
        try {
            const res = await api.get(`/social-publisher/accounts/${platform}/connect`);
            window.location.href = res.data.url;
        } catch (err: any) {
            toast.error(err.response?.data?.message || `Failed to bridge ${platform}`);
        }
    };

    const disconnectAccount = async (id: string) => {
        try {
            await api.delete(`/social-publisher/accounts/${id}`);
            toast.success("Account disconnected");
            loadData();
        } catch {
            toast.error("Interruption failed");
        }
    };

    const submitPost = async (isImmediate: boolean) => {
        if (!selectedAccount) return toast.error("Please specify a target entity.");
        if (!caption && !mediaUrl) return toast.error("Content payload cannot be empty.");
        if (!isImmediate && !scheduledAt) return toast.error("Define temporal coordinate.");

        if (isImmediate) setSubmitting(true);
        else setIsScheduling(true);

        try {
            const account = accounts.find(a => a.id === selectedAccount);
            const scheduledTime = isImmediate ? new Date(Date.now() + 60000).toISOString() : scheduledAt;

            await api.post("/social-publisher/posts", {
                socialAccountId: selectedAccount,
                platform: account?.platform,
                caption,
                mediaUrl,
                mediaType,
                scheduledAt: scheduledTime,
            });
            toast.success(isImmediate ? "Payload executed!" : "Temporal sequence queued!");
            setShowCreateForm(false);
            setCaption("");
            setMediaUrl("");
            setScheduledAt("");
            setSelectedAccount("");
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Transmission failed");
        } finally {
            setSubmitting(false);
            setIsScheduling(false);
        }
    };

    const handleCreatePost = (e: React.FormEvent) => {
        e.preventDefault();
        submitPost(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) return toast.error("File mass exceeds 50MB threshold");

        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        const tid = toast.loading("Uploading sector data...");

        try {
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();

            if (res.ok && data.url) {
                setMediaUrl(data.url);
                if (file.type.startsWith("video/")) setMediaType("VIDEO");
                else setMediaType("IMAGE");
                toast.success("Media transfer complete", { id: tid });
            } else {
                throw new Error(data.error || "Upload pipeline collapsed");
            }
        } catch (err: any) {
            toast.error(err.message || "Transfer failed", { id: tid });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const deletePost = async (id: string) => {
        try {
            await api.delete(`/social-publisher/posts/${id}`);
            toast.success("Post disintegrated");
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to purge post");
        }
    };

    const handleGenerateAI = async () => {
        if (!aiTopic.trim()) return toast.error("Define subject prompt.");
        setGenerating(true);
        try {
            const res = await api.post('/social-publisher/posts/ai/generate-image', {
                topic: aiTopic.trim(),
                style: aiStyle,
                aspectRatio: aiRatio
            });
            const data = res.data;
            setMediaUrl(data.imageUrl);
            setCaption(`${data.caption}\n\n${data.hashtags}`);
            toast.success("AI Synthesis Complete!");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Synthesis collapsed.");
        } finally {
            setGenerating(false);
        }
    };

    if (!loading && !moduleEnabled) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto py-20 text-center glass-card p-10">
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 mx-auto mb-6 grid place-items-center border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                    <ShieldAlert className="w-10 h-10 text-indigo-400" />
                </div>
                <h1 className="text-3xl font-bold mb-3 tracking-tight">Social Publisher</h1>
                <p className="text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
                    Auto-publish to Facebook, Instagram &amp; LinkedIn from one dashboard.
                    Equipped with state-of-the-art AI generation tools. Purchase module access to initialize.
                </p>
                <a
                    href="/dashboard/billing"
                    className="glass-button inline-flex items-center gap-2 px-8 py-3.5 font-bold rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] border-indigo-500/30 text-indigo-100 transition-all uppercase tracking-wider"
                >
                    Unlock Matrix
                </a>
            </motion.div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20" />
                    <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin absolute inset-0" />
                </div>
            </div>
        );
    }

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8 pb-10">
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Social <span className="text-gradient">Publisher</span></h1>
                    <p className="text-slate-400 mt-1">Design, auto-generate, and distribute content across your neural networks.</p>
                </div>
                <button
                    onClick={() => {
                        if (accounts.length === 0) toast.error("Initialization requires at least one bridged network.");
                        else setShowCreateForm(!showCreateForm);
                    }}
                    className="glass-button flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.2)] border-indigo-500/30 text-indigo-100"
                >
                    <Plus className="w-4 h-4 text-indigo-400" /> Compose Post
                </button>
            </motion.div>

            {/* Navigation Tabs */}
            <motion.div variants={itemVariants} className="flex items-center gap-2 p-1.5 glass-panel rounded-2xl w-fit mb-8 shadow-inner overflow-x-auto max-w-full">
                {[
                    { id: 'overview', label: 'Dashboard Hub' },
                    { id: 'queue', label: 'Transmission Queue' },
                    { id: 'calendar', label: 'Temporal Map' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveView(tab.id as any)}
                        className={`px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold transition-all shadow-sm ${activeView === tab.id
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </motion.div>

            {activeView === 'queue' && (
                <motion.div variants={itemVariants} initial="hidden" animate="show" exit="hidden"><QueueManager posts={posts} onRefresh={loadData} onNewPost={() => { setActiveView('overview'); setShowCreateForm(true); }} onViewCalendar={() => setActiveView('calendar')} /></motion.div>
            )}

            {activeView === 'calendar' && (
                <motion.div variants={itemVariants} initial="hidden" animate="show" exit="hidden">
                    <ContentCalendar
                        posts={posts} onRefresh={loadData} onNewPost={() => { setActiveView('overview'); setShowCreateForm(true); }}
                        onReschedule={async (postId, newDate) => {
                            try {
                                await api.patch(`/social-publisher/posts/${postId}/reschedule`, { scheduledAt: newDate.toISOString() });
                                const updatedPosts = posts.map(p => p.id === postId ? { ...p, scheduledAt: newDate.toISOString() } : p);
                                setPosts(updatedPosts);
                                toast.success("Temporal shift locked!");
                            } catch (e) {
                                toast.error("Temporal shift failed.");
                            }
                        }}
                    />
                </motion.div>
            )}

            {activeView === 'overview' && (
                <div className="space-y-8">
                    {/* Connected Accounts */}
                    <motion.div variants={itemVariants}>
                        <h2 className="text-sm font-bold tracking-wider uppercase text-slate-400 mb-4 flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-indigo-400" />
                            Bridged Networks
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {accounts.map((account) => {
                                const config = platformConfig[account.platform];
                                const PlatformIcon = config?.icon || Facebook;
                                return (
                                    <motion.div
                                        key={account.id} whileHover={{ y: -5 }}
                                        className={`p-4 rounded-2xl border ${config?.bg || "glass-panel"} flex items-center gap-4 transition-all duration-300 group`}
                                    >
                                        <div className="relative">
                                            {account.profilePicture ? (
                                                <img src={account.profilePicture} alt="" className="w-12 h-12 rounded-full object-cover shadow-lg border-2 border-white/10" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-white/10 grid place-items-center shadow-lg">
                                                    <PlatformIcon className={`w-6 h-6 ${config?.color}`} />
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-900 flex items-center justify-center">
                                                <PlatformIcon className={`w-2.5 h-2.5 ${config?.color}`} />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate group-hover:text-indigo-200 transition-colors">{account.username}</p>
                                            <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${config?.color}`}>{config?.label}</p>
                                        </div>
                                        <button onClick={() => disconnectAccount(account.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all" title="Disconnect">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                );
                            })}

                            {["facebook", "instagram", "linkedin"].map((platform) => {
                                const config = platformConfig[platform];
                                const PlatformIcon = config.icon;
                                const alreadyConnected = accounts.some(a => a.platform === platform);
                                return (
                                    <button
                                        key={platform} onClick={() => connectPlatform(platform)}
                                        className="p-4 rounded-2xl border border-dashed border-white/10 hover:border-indigo-500/30 glass-card bg-white/[0.01] flex flex-col justify-center items-center gap-3 transition-all duration-300 group min-h-[96px]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-900 group-hover:bg-slate-800 border border-white/5 grid place-items-center transition-colors shadow-inner">
                                                <PlatformIcon className={`w-5 h-5 ${config.color}`} />
                                            </div>
                                            <div className="text-left leading-tight">
                                                <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{alreadyConnected ? `Add Another` : `Bridge Network`}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">via {config.label} OAuth</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Compose Post UI */}
                    <AnimatePresence>
                        {showCreateForm && (
                            <motion.div initial={{ opacity: 0, height: 0, scale: 0.98 }} animate={{ opacity: 1, height: "auto", scale: 1 }} exit={{ opacity: 0, height: 0, scale: 0.98 }} className="overflow-hidden">
                                <form onSubmit={handleCreatePost} className="p-6 glass-panel rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                                    <div className="flex flex-col mb-8 pb-6 border-b border-white/5 relative z-10">
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <h2 className="text-2xl font-bold flex items-center gap-3 text-white uppercase tracking-tight">
                                                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                                    <Send className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                Payload Composer
                                            </h2>
                                            <button type="button" onClick={() => setIsAiMode(!isAiMode)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider transition-all duration-300 ${isAiMode ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-white/20' : 'bg-slate-900/80 border border-white/5 text-slate-400 hover:text-white hover:border-white/20'}`}>
                                                <Sparkles className="w-4 h-4" /> {isAiMode ? 'Artificial Studio Online' : 'Initialize Generator Engine'}
                                            </button>
                                        </div>
                                        {!isAiMode && <p className="text-slate-500 text-sm mt-3 font-medium">Construct payload manually or utilize the Neural Studio for automated generation.</p>}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                                        {/* LEFT SIDE: FORM */}
                                        <div className="space-y-6">
                                            {/* AI Mode Frame */}
                                            <AnimatePresence>
                                                {isAiMode && (
                                                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20, height: 0 }} className="p-5 bg-black/40 border border-indigo-500/30 rounded-2xl space-y-5 relative overflow-hidden ring-1 ring-inset ring-white/5">
                                                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                                                        <div>
                                                            <label className="block text-[10px] font-bold text-indigo-400 mb-2 uppercase tracking-widest flex items-center gap-2"><Type className="w-3.5 h-3.5" /> Prompt Subject</label>
                                                            <input type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="glass-input w-full px-4 py-3 bg-black/50 border border-indigo-500/20" placeholder="e.g. A dystopian cyberpunk city, high contrast..." />
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-bold text-indigo-400 mb-2 uppercase tracking-widest flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> Render Scheme</label>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                {AI_STYLES.map(style => (
                                                                    <button key={style.id} type="button" onClick={() => setAiStyle(style.id)} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[11px] font-bold uppercase transition-all ${aiStyle === style.id ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}>
                                                                        <style.icon className="w-4 h-4" /> {style.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row gap-4">
                                                            <div className="flex-1 w-full">
                                                                <label className="block text-[10px] font-bold text-indigo-400 mb-2 uppercase tracking-widest flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5" /> Dimension Frame</label>
                                                                <div className="flex gap-2">
                                                                    {AI_FORMATS.map(f => (
                                                                        <button key={f.id} type="button" onClick={() => setAiRatio(f.id)} className={`flex-1 py-3 font-bold text-[10px] rounded-xl border transition-all ${aiRatio === f.id ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}>
                                                                            {f.id}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <button type="button" onClick={handleGenerateAI} disabled={generating || !aiTopic} className="glass-button w-full sm:w-auto self-end px-6 py-3 bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 h-[42px] border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                                                                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {generating ? "Synthesizing..." : "Initialize"}
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="space-y-5">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Target Node</label>
                                                    <select required value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="glass-input w-full px-4 py-3.5">
                                                        <option value="">Select deployment target...</option>
                                                        {accounts.map(a => <option key={a.id} value={a.id}>{platformConfig[a.platform]?.label} — {a.username}</option>)}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payload Caption</label>
                                                    <textarea required value={caption} onChange={(e) => setCaption(e.target.value)} rows={5} className="glass-input w-full px-4 py-3.5 resize-none leading-relaxed text-sm" placeholder="Transcribe transmission..." />
                                                </div>

                                                <div className="p-5 rounded-2xl bg-black/20 border border-white/5 space-y-5">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Asset Construct</label></div>
                                                        <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-white/5">
                                                            <button type="button" onClick={() => setMediaType("IMAGE")} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all ${mediaType === "IMAGE" ? 'bg-gradient-to-r from-pink-500/80 to-purple-500/80 text-white shadow-md' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><ImageIcon className="w-3.5 h-3.5" /> Image Engine</button>
                                                            <button type="button" onClick={() => setMediaType("VIDEO")} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all ${mediaType === "VIDEO" ? 'bg-gradient-to-r from-pink-500/80 to-purple-500/80 text-white shadow-md' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><Video className="w-3.5 h-3.5" /> Video Engine</button>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ingestion Method</label>
                                                            <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5">
                                                                <button type="button" onClick={() => setImageSource("UPLOAD")} className={`px-4 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all ${imageSource === "UPLOAD" ? 'bg-pink-500/80 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>Disk</button>
                                                                <button type="button" onClick={() => setImageSource("URL")} className={`px-4 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all ${imageSource === "URL" ? 'bg-pink-500/80 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>Net</button>
                                                            </div>
                                                        </div>

                                                        {imageSource === "URL" ? (
                                                            <div className="flex gap-2">
                                                                <div className="relative flex-1">
                                                                    <Link2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                                    <input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="glass-input pl-11 pr-4 py-3 w-full" placeholder="Secure https:// link..." />
                                                                </div>
                                                                <button type="button" onClick={(e) => { e.preventDefault(); if (!mediaUrl) return; setMediaType(mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be') ? 'VIDEO' : 'IMAGE'); toast.success('Link acquired.'); }} className="px-6 glass-button bg-slate-800 hover:bg-slate-700 font-bold uppercase text-[10px] tracking-wider rounded-xl shrink-0 border-white/10">Fetch</button>
                                                            </div>
                                                        ) : (
                                                            <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all group cursor-pointer ${uploading ? 'bg-slate-900/50 border-indigo-500/50' : 'border-slate-700 bg-black/20 hover:bg-black/40 hover:border-pink-500/40'}`} onClick={() => !uploading && fileInputRef.current?.click()}>
                                                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
                                                                {uploading ? (
                                                                    <><Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" /><p className="text-xs uppercase tracking-wider text-indigo-400 font-bold animate-pulse">Processing Transfer...</p></>
                                                                ) : (
                                                                    <><div className="w-12 h-12 bg-slate-900 shadow-inner rounded-full flex items-center justify-center mb-4 border border-white/5 group-hover:scale-110 group-hover:bg-pink-500/10 transition-transform"><ImageIcon className="w-5 h-5 text-slate-500 group-hover:text-pink-400 transition-colors" /></div><p className="text-sm text-slate-300 font-bold">Mount Directory</p><p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mt-2">IMG: 5MB Max / VID: 50MB Max</p></>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-indigo-400" /> Temporal Coordinates</label>
                                                    <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="glass-input w-full px-4 py-3.5 [color-scheme:dark]" />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 mt-8">
                                                <button type="button" onClick={() => submitPost(true)} disabled={submitting || isScheduling} className="w-full glass-button bg-emerald-500/80 hover:bg-emerald-500 text-white font-bold tracking-widest uppercase py-4 rounded-xl flex items-center justify-center gap-2 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 text-sm">
                                                    {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> EXECUTING...</> : <><Sparkles className="w-5 h-5" /> BROADCAST NOW</>}
                                                </button>
                                                <div className="flex gap-3">
                                                    <button type="button" onClick={() => submitPost(false)} disabled={submitting || isScheduling} className="flex-1 glass-button bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold tracking-widest uppercase py-4 rounded-xl flex items-center justify-center gap-2 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)] disabled:opacity-50 text-sm">
                                                        {isScheduling ? <><Loader2 className="w-5 h-5 animate-spin" /> SECURING...</> : <><Clock className="w-5 h-5" /> QUEUE UPLOAD</>}
                                                    </button>
                                                    <button type="button" onClick={() => setShowCreateForm(false)} className="px-5 glass-button bg-slate-800/80 hover:bg-red-500/20 hover:text-red-400 text-slate-400 border border-white/10 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT SIDE: PREVIEW */}
                                        <div className="hidden lg:block lg:pl-10 xl:pl-16 relative">
                                            <div className="absolute left-0 top-10 bottom-10 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                                            <div className="sticky top-10">
                                                <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> Live Terminal
                                                </div>

                                                <div className="glass-card overflow-hidden shadow-2xl ring-1 ring-white/10">
                                                    <div className="p-4 border-b border-white/5 bg-slate-900/50">
                                                        <div className="flex items-center gap-3">
                                                            {selectedAccount ? (
                                                                <img src={accounts.find(a => a.id === selectedAccount)?.profilePicture || 'https://api.dicebear.com/7.x/avataaars/svg?seed=brand'} className="w-10 h-10 rounded-full object-cover border-2 border-white/10" alt="" />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-slate-800 grid place-items-center border-2 border-white/10"><span className="text-xs text-slate-500 font-bold uppercase">U</span></div>
                                                            )}
                                                            <div>
                                                                <div className="text-sm font-bold text-white capitalize">{selectedAccount ? accounts.find(a => a.id === selectedAccount)?.username : 'Simulation Node'}</div>
                                                                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mt-0.5">{selectedAccount ? accounts.find(a => a.id === selectedAccount)?.platform : 'Virtual Network'} • Real-Time</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="relative aspect-square xl:aspect-[4/3] bg-black border-none flex items-center justify-center overflow-hidden">
                                                        {mediaUrl ? (
                                                            mediaType === 'VIDEO' ? (
                                                                mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be') ? (
                                                                    <iframe className="w-full h-full" src={mediaUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/').replace('/shorts/', '/embed/')} frameBorder="0" allowFullScreen />
                                                                ) : (
                                                                    <video src={mediaUrl} controls className="w-full h-full object-cover" />
                                                                )
                                                            ) : (
                                                                <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                                                            )
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center text-slate-600 bg-gradient-to-br from-slate-900 to-black w-full h-full">
                                                                <div className="w-16 h-16 rounded-full border border-white/5 bg-white/[0.02] flex items-center justify-center mb-4"><ImageIcon className="w-6 h-6 opacity-40" /></div>
                                                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">No Signal Detected</span>
                                                            </div>
                                                        )}

                                                        <AnimatePresence>
                                                            {generating && (
                                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-10">
                                                                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-5" />
                                                                    <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold animate-pulse">Rendering Asset...</span>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>

                                                    <div className="p-5 bg-slate-900/50">
                                                        {caption ? (
                                                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                                {caption.length > 200 ? caption.substring(0, 200) + '...' : caption}
                                                            </p>
                                                        ) : (
                                                            <div className="space-y-2 opacity-30">
                                                                <div className="h-2 bg-slate-700 rounded w-full"></div>
                                                                <div className="h-2 bg-slate-700 rounded w-4/5"></div>
                                                                <div className="h-2 bg-slate-700 rounded w-1/2"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Posts List */}
                    <motion.div variants={itemVariants}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-400 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-400" /> Upload Log <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full ml-1 text-slate-300">{posts.length}</span>
                            </h2>
                            <div className="flex items-center gap-1 bg-slate-900 border border-white/5 rounded-lg p-1">
                                <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-white"}`}><Grid3X3 className="w-4 h-4" /></button>
                                <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-white"}`}><List className="w-4 h-4" /></button>
                            </div>
                        </div>

                        {posts.length === 0 ? (
                            <div className="text-center py-20 glass-card">
                                <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-white/5"><Send className="w-6 h-6 text-slate-500" /></div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Logs Empty.</p>
                            </div>
                        ) : (
                            viewMode === "list" ? (
                                <div className="space-y-3">
                                    {posts.map((post) => {
                                        const pConfig = platformConfig[post.platform];
                                        const sConfig = statusConfig[post.status];
                                        return (
                                            <motion.div key={post.id} className="p-4 glass-panel flex items-start sm:items-center gap-4 group">
                                                <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 grid place-items-center flex-shrink-0"><pConfig.icon className={`w-5 h-5 ${pConfig?.color}`} /></div>
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 ${pConfig?.color}`}>{pConfig?.label}</span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${sConfig?.color}`}><sConfig.icon className="w-3 h-3" /> {sConfig?.label}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-200 line-clamp-1">{post.caption}</p>
                                                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                        <span className="flex items-center gap-1.5">{post.mediaType === "IMAGE" ? <ImageIcon className="w-3 h-3 text-emerald-400" /> : <Video className="w-3 h-3 text-amber-400" />}{post.mediaType}</span>
                                                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-indigo-400" /> {new Date(post.scheduledAt).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {post.mediaUrl && <img src={post.mediaUrl} className="w-14 h-14 object-cover rounded-lg border border-white/10 hidden sm:block" alt="thumb" />}
                                                    {post.status !== "posted" && <button onClick={() => deletePost(post.id)} className="p-2.5 bg-slate-900 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/30"><Trash2 className="w-4 h-4" /></button>}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {posts.map((post) => {
                                        const pConfig = platformConfig[post.platform];
                                        const sConfig = statusConfig[post.status];
                                        return (
                                            <motion.div key={post.id} className="glass-panel flex flex-col group overflow-hidden relative">
                                                {post.errorMessage && <div className="absolute top-0 inset-x-0 bg-red-500/90 text-white text-[10px] font-bold uppercase tracking-wider text-center py-1 z-10 flex items-center justify-center gap-1"><ShieldAlert className="w-3 h-3" /> Error Detected</div>}
                                                <div className="relative aspect-square w-full bg-slate-950">
                                                    {post.mediaUrl ? (
                                                        post.mediaType === 'VIDEO' ? (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-900 relative"><Video className="w-8 h-8 text-slate-700 z-0 absolute" /><video src={post.mediaUrl} className="w-full h-full object-cover z-10 relative opacity-80" /></div>
                                                        ) : (
                                                            <img src={post.mediaUrl} className="w-full h-full object-cover" alt="thumb" />
                                                        )
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-900"><Type className="w-8 h-8 text-slate-700" /></div>
                                                    )}
                                                    <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start z-10 pt-4">
                                                        <div className={`p-1.5 rounded-md bg-white/10 backdrop-blur-md border border-white/20 ${pConfig?.color}`}><pConfig.icon className="w-3.5 h-3.5" /></div>
                                                        {post.status !== "posted" && <button onClick={() => deletePost(post.id)} className="p-1.5 rounded-md bg-black/50 text-slate-300 hover:text-red-400 hover:bg-red-500/20 backdrop-blur-md transition-all"><Trash2 className="w-3.5 h-3.5" /></button>}
                                                    </div>
                                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-between z-10">
                                                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${sConfig?.color}`}><sConfig.icon className="w-3.5 h-3.5" /> {sConfig?.label}</div>
                                                        {post.mediaType === "VIDEO" && <div className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1"><Video className="w-2.5 h-2.5" /></div>}
                                                    </div>
                                                </div>
                                                <div className="p-4 flex flex-col flex-1">
                                                    <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed flex-1 font-medium">{post.caption}</p>
                                                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                        <Clock className="w-3.5 h-3.5 text-indigo-400" /> {new Date(post.scheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
