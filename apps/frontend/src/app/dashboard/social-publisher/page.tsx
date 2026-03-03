"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ContentCalendar } from "@/components/social-publisher/ContentCalendar";
import { QueueManager } from "@/components/social-publisher/QueueManager";
import {
    Facebook,
    Instagram,
    Linkedin,
    Plus,
    Trash2,
    Clock,
    CheckCircle2,
    XCircle,
    Image as ImageIcon,
    Video,
    Send,
    ShieldAlert,
    Calendar,
    Sparkles,
    Settings2,
    Loader2,
    Camera,
    Palette,
    Film,
    Wand2,
    Type,
    Link2,
    Heart,
    MessageCircle,
    Share2
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
    facebook: { icon: Facebook, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Facebook" },
    instagram: { icon: Instagram, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20", label: "Instagram" },
    linkedin: { icon: Linkedin, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20", label: "LinkedIn" },
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    scheduled: { icon: Clock, color: "text-amber-400", label: "Scheduled" },
    posted: { icon: CheckCircle2, color: "text-emerald-400", label: "Published" },
    failed: { icon: XCircle, color: "text-red-400", label: "Failed" },
    pending: { icon: Clock, color: "text-slate-400", label: "Pending" },
};

export default function SocialPublisherPage() {
    const searchParams = useSearchParams();
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [moduleEnabled, setModuleEnabled] = useState(true);
    const [activeView, setActiveView] = useState<'overview' | 'queue' | 'calendar'>('overview');

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

        // Show toast for OAuth callbacks
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
                toast.error("Failed to load data");
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
            toast.error(err.response?.data?.message || `Failed to connect ${platform}`);
        }
    };

    const disconnectAccount = async (id: string) => {
        try {
            await api.delete(`/social-publisher/accounts/${id}`);
            toast.success("Account disconnected");
            loadData();
        } catch {
            toast.error("Failed to disconnect account");
        }
    };

    const submitPost = async (isImmediate: boolean) => {
        if (!selectedAccount) return toast.error("Please select an account.");
        if (!caption && !mediaUrl) return toast.error("Please add a caption or media.");
        if (!isImmediate && !scheduledAt) return toast.error("Please select a schedule time.");

        if (isImmediate) {
            setSubmitting(true);
        } else {
            setIsScheduling(true);
        }

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
            toast.success(isImmediate ? "Posted successfully!" : "Post scheduled successfully!");
            setShowCreateForm(false);
            setCaption("");
            setMediaUrl("");
            setScheduledAt("");
            setSelectedAccount("");
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to create post");
        } finally {
            setSubmitting(false);
            setIsScheduling(false);
        }
    };

    const handleCreatePost = (e: React.FormEvent) => {
        e.preventDefault();
        submitPost(false); // Default to schedule if somehow submitted
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.size > 50 * 1024 * 1024) {
            return toast.error("File size must be less than 50MB");
        }

        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        const loadingToast = toast.loading("Uploading media...");

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (res.ok && data.url) {
                setMediaUrl(data.url);
                // Auto-detect type based on file type
                if (file.type.startsWith("video/")) setMediaType("VIDEO");
                else setMediaType("IMAGE");

                toast.success("Media uploaded successfully", { id: loadingToast });
            } else {
                throw new Error(data.error || "Upload failed");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to upload media", { id: loadingToast });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const deletePost = async (id: string) => {
        try {
            await api.delete(`/social-publisher/posts/${id}`);
            toast.success("Post deleted");
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to delete post");
        }
    };

    const handleGenerateAI = async () => {
        if (!aiTopic.trim()) return toast.error("Please enter a topic");
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
            toast.success("AI Content Generated!");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Generation failed.");
        } finally {
            setGenerating(false);
        }
    };

    // Module not purchased
    if (!loading && !moduleEnabled) {
        return (
            <div className="max-w-3xl mx-auto py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 mx-auto mb-6 grid place-items-center">
                    <ShieldAlert className="w-8 h-8 text-indigo-400" />
                </div>
                <h1 className="text-2xl font-bold mb-3">Social Publisher</h1>
                <p className="text-slate-400 mb-6">
                    Auto-publish to Facebook, Instagram &amp; LinkedIn from one dashboard.
                    <br />Purchase this module from the Billing page to get started.
                </p>
                <a
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
                >
                    Go to Billing
                </a>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Social Publisher</h1>
                    <p className="text-slate-400 mt-2">Connect your accounts and schedule posts to publish automatically.</p>
                </div>
                <button
                    onClick={() => {
                        if (accounts.length === 0) {
                            toast.error("Please connect at least one social account first.");
                        } else {
                            setShowCreateForm(!showCreateForm);
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Post
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 p-1 bg-slate-900 border border-white/5 rounded-2xl w-fit mb-8 shadow-inner">
                {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'queue', label: 'Queue Manager' },
                    { id: 'calendar', label: 'Content Calendar' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveView(tab.id as any)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeView === tab.id
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeView === 'queue' && (
                <QueueManager
                    posts={posts}
                    onRefresh={loadData}
                    onNewPost={() => { setActiveView('overview'); setShowCreateForm(true); }}
                    onViewCalendar={() => setActiveView('calendar')}
                />
            )}

            {activeView === 'calendar' && (
                <ContentCalendar
                    posts={posts}
                    onRefresh={loadData}
                    onNewPost={() => { setActiveView('overview'); setShowCreateForm(true); }}
                    onReschedule={async (postId, newDate) => {
                        try {
                            await api.patch(`/social-publisher/posts/${postId}/reschedule`, { scheduledAt: newDate.toISOString() });

                            const updatedPosts = posts.map(p => p.id === postId ? { ...p, scheduledAt: newDate.toISOString() } : p);
                            setPosts(updatedPosts);
                            toast.success("Post rescheduled successfully!");
                        } catch (e) {
                            toast.error("Failed to reschedule post.");
                        }
                    }}
                />
            )}

            {activeView === 'overview' && (
                <div className="space-y-8">
                    {/* Connected Accounts */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-indigo-400" />
                            Connected Accounts
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Existing accounts */}
                            {accounts.map((account) => {
                                const config = platformConfig[account.platform];
                                const PlatformIcon = config?.icon || Facebook;
                                return (
                                    <motion.div
                                        key={account.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-4 rounded-xl border ${config?.bg || "bg-slate-900 border-white/5"} flex items-center gap-3`}
                                    >
                                        {account.profilePicture ? (
                                            <img src={account.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-800 grid place-items-center">
                                                <PlatformIcon className={`w-5 h-5 ${config?.color}`} />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{account.username}</p>
                                            <p className={`text-xs ${config?.color}`}>{config?.label}</p>
                                        </div>
                                        <button
                                            onClick={() => disconnectAccount(account.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                                            title="Disconnect"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                );
                            })}

                            {/* Connect buttons */}
                            {["facebook", "instagram", "linkedin"].map((platform) => {
                                const config = platformConfig[platform];
                                const PlatformIcon = config.icon;
                                const alreadyConnected = accounts.some(a => a.platform === platform);
                                return (
                                    <button
                                        key={platform}
                                        onClick={() => connectPlatform(platform)}
                                        className="p-4 rounded-xl border border-dashed border-white/10 hover:border-indigo-500/30 bg-slate-900/50 hover:bg-slate-900 flex items-center gap-3 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-slate-700 grid place-items-center transition-colors">
                                            <PlatformIcon className={`w-5 h-5 ${config.color}`} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-white">
                                                {alreadyConnected ? `Add another ${config.label}` : `Connect ${config.label}`}
                                            </p>
                                            <p className="text-xs text-slate-500">via OAuth</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Create Post Form */}
                    <AnimatePresence>
                        {showCreateForm && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <form onSubmit={handleCreatePost} className="p-6 bg-slate-900 rounded-2xl border border-white/5 shadow-2xl">
                                    <div className="flex flex-col mb-6 pb-6 border-b border-white/5">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-bold flex items-center gap-2">
                                                <Send className="w-6 h-6 text-indigo-400" />
                                                Compose Post
                                            </h2>
                                            <button
                                                type="button"
                                                onClick={() => setIsAiMode(!isAiMode)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${isAiMode
                                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                                                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 hover:shadow-lg'
                                                    }`}
                                            >
                                                <Sparkles className="w-4 h-4" />
                                                {isAiMode ? 'AI Studio Active' : 'Use AI Studio'}
                                            </button>
                                        </div>
                                        {!isAiMode && (
                                            <p className="text-slate-500 text-sm mt-1">Write your own post or use AI to magically generate content and artwork.</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        {/* LEFT SIDE: FORM */}
                                        <div className="space-y-6">
                                            {/* AI Mode Controls */}
                                            <AnimatePresence>
                                                {isAiMode && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, height: "auto", scale: 1 }}
                                                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                                        className="overflow-hidden bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 mb-6 space-y-5 shadow-inner"
                                                    >
                                                        <div>
                                                            <label className="block text-xs font-bold text-indigo-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                                                                <Type className="w-4 h-4" /> What is the post about?
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={aiTopic}
                                                                onChange={(e) => setAiTopic(e.target.value)}
                                                                className="w-full px-4 py-3 bg-black/40 border border-indigo-500/30 rounded-xl text-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all text-sm placeholder:text-slate-600 shadow-inner"
                                                                placeholder="e.g. A futuristic workspace setup with neon lights..."
                                                            />
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div>
                                                                <label className="block text-xs font-bold text-indigo-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                                                                    <Palette className="w-4 h-4" /> Visual Style
                                                                </label>
                                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                                                    {AI_STYLES.map(style => {
                                                                        const Icon = style.icon;
                                                                        const active = aiStyle === style.id;
                                                                        return (
                                                                            <button
                                                                                key={style.id}
                                                                                type="button"
                                                                                onClick={() => setAiStyle(style.id)}
                                                                                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${active
                                                                                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                                                                    : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-300'
                                                                                    }`}
                                                                            >
                                                                                <Icon className="w-5 h-5" />
                                                                                <span className="truncate w-full text-center">{style.label}</span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                                                <div className="flex-1 w-full">
                                                                    <label className="block text-xs font-bold text-indigo-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                                                                        <ImageIcon className="w-4 h-4" /> Aspect Ratio
                                                                    </label>
                                                                    <div className="flex gap-2">
                                                                        {AI_FORMATS.map(format => (
                                                                            <button
                                                                                key={format.id}
                                                                                type="button"
                                                                                onClick={() => setAiRatio(format.id)}
                                                                                className={`flex-1 py-2.5 px-2 rounded-xl border text-[11px] font-bold tracking-wide transition-all text-center ${aiRatio === format.id
                                                                                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                                                                                    : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-300'
                                                                                    }`}
                                                                            >
                                                                                {format.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={handleGenerateAI}
                                                                    disabled={generating || !aiTopic}
                                                                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 h-[42px] shrink-0"
                                                                >
                                                                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                                    {generating ? "Generating..." : "Generate Magic"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Standard Form Inputs */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-300 mb-1.5">Select Account</label>
                                                    <select
                                                        value={selectedAccount}
                                                        onChange={(e) => setSelectedAccount(e.target.value)}
                                                        required
                                                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                                    >
                                                        <option value="">Choose an account...</option>
                                                        {accounts.map((a) => (
                                                            <option key={a.id} value={a.id}>
                                                                {platformConfig[a.platform]?.label} — {a.username}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-300 mb-1.5">Caption</label>
                                                    <textarea
                                                        value={caption}
                                                        onChange={(e) => setCaption(e.target.value)}
                                                        required
                                                        rows={4}
                                                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none leading-relaxed"
                                                        placeholder="What do you want to say?"
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Content Type</label>
                                                        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                                            <button
                                                                type="button"
                                                                onClick={() => setMediaType("IMAGE")}
                                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mediaType === "IMAGE"
                                                                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-purple-500/20'
                                                                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                                                    }`}
                                                            >
                                                                <ImageIcon className="w-4 h-4" /> IMAGE
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setMediaType("VIDEO")}
                                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mediaType === "VIDEO"
                                                                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-purple-500/20'
                                                                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                                                    }`}
                                                            >
                                                                <Video className="w-4 h-4" /> VIDEO
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Image Source</label>
                                                            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-bold">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setImageSource("UPLOAD")}
                                                                    className={`px-3 py-1.5 rounded-md transition-all ${imageSource === "UPLOAD"
                                                                        ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                                                                        : 'text-slate-400 hover:text-white'
                                                                        }`}
                                                                >
                                                                    UPLOAD
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setImageSource("URL")}
                                                                    className={`px-3 py-1.5 rounded-md transition-all ${imageSource === "URL"
                                                                        ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                                                                        : 'text-slate-400 hover:text-white'
                                                                        }`}
                                                                >
                                                                    URL
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {imageSource === "URL" ? (
                                                            <div className="flex gap-2">
                                                                <div className="relative flex-1">
                                                                    <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                                                    <input
                                                                        type="url"
                                                                        value={mediaUrl}
                                                                        onChange={(e) => setMediaUrl(e.target.value)}
                                                                        className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors text-sm"
                                                                        placeholder="https://example.com/image.jpg or YouTube URL"
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        if (!mediaUrl) return;
                                                                        if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be')) {
                                                                            setMediaType('VIDEO');
                                                                        } else {
                                                                            setMediaType('IMAGE');
                                                                        }
                                                                        toast.success('Media linked ready for preview!');
                                                                    }}
                                                                    className="px-5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors shrink-0"
                                                                >
                                                                    Link
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className={`border border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors group cursor-pointer ${uploading ? 'bg-slate-900 border-indigo-500/50' : 'bg-slate-950/50 hover:bg-slate-950 hover:border-pink-500/30'}`}
                                                                onClick={() => !uploading && fileInputRef.current?.click()}
                                                            >
                                                                <input
                                                                    type="file"
                                                                    ref={fileInputRef}
                                                                    onChange={handleFileUpload}
                                                                    className="hidden"
                                                                    accept="image/*,video/*"
                                                                />
                                                                {uploading ? (
                                                                    <>
                                                                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                                                                        <p className="text-sm text-indigo-300 font-medium animate-pulse">Uploading file...</p>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="w-10 h-10 bg-slate-900 shadow-inner rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                                            <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-pink-400 transition-colors" />
                                                                        </div>
                                                                        <p className="text-sm text-slate-300 font-medium">
                                                                            Click to browse files
                                                                        </p>
                                                                        <p className="text-[11px] text-slate-500 mt-1">Images (Max. 5MB) • Videos (Max. 50MB)</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                                        <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Schedule Date & Time
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="datetime-local"
                                                            value={scheduledAt}
                                                            onChange={(e) => setScheduledAt(e.target.value)}
                                                            className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm [color-scheme:dark]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 pt-4 border-t border-white/5 mt-6">
                                                <button
                                                    type="button"
                                                    onClick={() => submitPost(true)}
                                                    disabled={submitting || isScheduling}
                                                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-xl transition-all disabled:opacity-70 shadow-lg shadow-emerald-500/20"
                                                >
                                                    {submitting ? (
                                                        <><Loader2 className="w-5 h-5 animate-spin" /> POSTING...</>
                                                    ) : (
                                                        <><Sparkles className="w-5 h-5" /> POST NOW</>
                                                    )}
                                                </button>

                                                <div className="flex gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => submitPost(false)}
                                                        disabled={submitting || isScheduling}
                                                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold py-3.5 rounded-xl transition-all disabled:opacity-70 shadow-lg shadow-pink-500/20"
                                                    >
                                                        {isScheduling ? (
                                                            <><Loader2 className="w-5 h-5 animate-spin" /> SCHEDULING...</>
                                                        ) : (
                                                            <><Plus className="w-5 h-5" /> SCHEDULE POST</>
                                                        )}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCreateForm(false)}
                                                        className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT SIDE: LIVE PREVIEW */}
                                        <div className="hidden lg:block border-l border-white/5 pl-10">
                                            <div className="sticky top-6">
                                                <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                                    <ImageIcon className="w-4 h-4" /> Live Preview
                                                </h3>

                                                <div className="bg-slate-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
                                                    {/* Header Mockup */}
                                                    <div className="p-4 border-b border-white/5">
                                                        <div className="flex items-center gap-3">
                                                            {selectedAccount ? (
                                                                <img
                                                                    src={accounts.find(a => a.id === selectedAccount)?.profilePicture || 'https://api.dicebear.com/7.x/avataaars/svg?seed=brand'}
                                                                    className="w-9 h-9 rounded-full object-cover border border-white/10 p-0.5"
                                                                    alt=""
                                                                />
                                                            ) : (
                                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 grid place-items-center p-0.5">
                                                                    <div className="w-full h-full bg-slate-900 rounded-full grid place-items-center">
                                                                        <span className="text-xs text-indigo-400 font-bold">You</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="text-sm font-bold text-white leading-tight">
                                                                    {selectedAccount ? accounts.find(a => a.id === selectedAccount)?.username : 'Your Brand'}
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                                    <span>Just now</span>
                                                                    <span>•</span>
                                                                    <span className="capitalize">{selectedAccount ? accounts.find(a => a.id === selectedAccount)?.platform : 'Platform'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Media Area */}
                                                    {mediaUrl ? (
                                                        <div className="relative aspect-square sm:aspect-auto sm:h-72 bg-black border-y border-white/5 overflow-hidden flex items-center justify-center">
                                                            {mediaType === 'VIDEO' ? (
                                                                mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be') ? (
                                                                    <iframe
                                                                        className="w-full h-full"
                                                                        src={mediaUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/').replace('/shorts/', '/embed/')}
                                                                        frameBorder="0"
                                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                        allowFullScreen
                                                                    ></iframe>
                                                                ) : (
                                                                    <video src={mediaUrl} controls className="w-full h-full object-contain" />
                                                                )
                                                            ) : (
                                                                <img src={mediaUrl} alt="Preview" className="w-full h-full object-contain" />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="relative aspect-square sm:aspect-auto sm:h-72 bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center text-slate-600 border-y border-white/5">
                                                            <ImageIcon className="w-12 h-12 mb-3 opacity-30" />
                                                            <span className="text-sm font-medium tracking-wide">Generate or add media URL</span>
                                                        </div>
                                                    )}

                                                    {/* Caption Area */}
                                                    <div className="p-4 pt-3">
                                                        {caption ? (
                                                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                                {caption.length > 150 ? caption.substring(0, 150) + '...' : caption}
                                                            </p>
                                                        ) : (
                                                            <div className="space-y-2 opacity-50">
                                                                <div className="h-2.5 bg-slate-800 rounded w-full"></div>
                                                                <div className="h-2.5 bg-slate-800 rounded w-5/6"></div>
                                                                <div className="h-2.5 bg-slate-800 rounded w-4/6"></div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons Mockup */}
                                                    <div className="px-4 pb-4 flex items-center gap-4 text-slate-500 border-t border-white/5 pt-3">
                                                        <div className="flex items-center gap-1.5"><Heart className="w-4 h-4" /> <span className="text-[11px] font-medium">Like</span></div>
                                                        <div className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> <span className="text-[11px] font-medium">Comment</span></div>
                                                        <div className="flex items-center gap-1.5"><Share2 className="w-4 h-4" /> <span className="text-[11px] font-medium">Share</span></div>
                                                    </div>

                                                    {/* Overlay if generating */}
                                                    <AnimatePresence>
                                                        {generating && (
                                                            <motion.div
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-10"
                                                            >
                                                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                                                                <span className="text-indigo-400 font-bold tracking-wide animate-pulse">AI is crafting magic...</span>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Posts List */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-400" />
                            Scheduled &amp; Published Posts
                            <span className="text-sm font-normal text-slate-500">({posts.length})</span>
                        </h2>

                        {posts.length === 0 ? (
                            <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-white/5">
                                <Send className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">No posts yet. Connect an account and create your first post!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {posts.map((post) => {
                                    const pConfig = platformConfig[post.platform];
                                    const sConfig = statusConfig[post.status];
                                    const PlatformIcon = pConfig?.icon || Facebook;
                                    const StatusIcon = sConfig?.icon || Clock;
                                    return (
                                        <motion.div
                                            key={post.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="p-4 bg-slate-900 rounded-xl border border-white/5 flex items-start gap-4"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-800 grid place-items-center flex-shrink-0">
                                                <PlatformIcon className={`w-5 h-5 ${pConfig?.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs font-medium ${pConfig?.color}`}>{pConfig?.label}</span>
                                                    <span className="text-slate-600">•</span>
                                                    <span className={`text-xs font-medium flex items-center gap-1 ${sConfig?.color}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {sConfig?.label}
                                                    </span>
                                                    {post.socialAccount && (
                                                        <>
                                                            <span className="text-slate-600">•</span>
                                                            <span className="text-xs text-slate-500">@{post.socialAccount.username}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="text-sm text-white line-clamp-2">{post.caption}</p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        {post.mediaType === "IMAGE" ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                                                        {post.mediaType}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(post.scheduledAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                {post.errorMessage && (
                                                    <p className="text-xs text-red-400 mt-1">Error: {post.errorMessage}</p>
                                                )}
                                            </div>
                                            {post.status !== "posted" && (
                                                <button
                                                    onClick={() => deletePost(post.id)}
                                                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
