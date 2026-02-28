"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
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
    Link2,
    Loader2,
    ShieldAlert,
    Calendar,
} from "lucide-react";
import api from "@/lib/api";

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

    // Create post form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState("");
    const [caption, setCaption] = useState("");
    const [mediaUrl, setMediaUrl] = useState("");
    const [mediaType, setMediaType] = useState("IMAGE");
    const [scheduledAt, setScheduledAt] = useState("");
    const [submitting, setSubmitting] = useState(false);

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

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const account = accounts.find(a => a.id === selectedAccount);
            await api.post("/social-publisher/posts", {
                socialAccountId: selectedAccount,
                platform: account?.platform,
                caption,
                mediaUrl,
                mediaType,
                scheduledAt,
            });
            toast.success("Post scheduled successfully!");
            setShowCreateForm(false);
            setCaption("");
            setMediaUrl("");
            setScheduledAt("");
            setSelectedAccount("");
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to schedule post");
        } finally {
            setSubmitting(false);
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
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
                    disabled={accounts.length === 0}
                >
                    <Plus className="w-4 h-4" />
                    New Post
                </button>
            </div>

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
                        <form onSubmit={handleCreatePost} className="p-6 bg-slate-900 rounded-xl border border-white/5 space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Send className="w-5 h-5 text-indigo-400" />
                                Schedule a Post
                            </h2>

                            {/* Account selector */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Select Account</label>
                                <select
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                >
                                    <option value="">Choose an account...</option>
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {platformConfig[a.platform]?.label} — {a.username}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Caption */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Caption</label>
                                <textarea
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    required
                                    rows={3}
                                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                                    placeholder="What do you want to say?"
                                />
                            </div>

                            {/* Media URL + Type */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Media URL</label>
                                    <input
                                        type="url"
                                        value={mediaUrl}
                                        onChange={(e) => setMediaUrl(e.target.value)}
                                        required
                                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Media Type</label>
                                    <select
                                        value={mediaType}
                                        onChange={(e) => setMediaType(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    >
                                        <option value="IMAGE">Image</option>
                                        <option value="VIDEO">Video</option>
                                        <option value="REELS">Reels</option>
                                    </select>
                                </div>
                            </div>

                            {/* Schedule time */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Schedule At
                                </label>
                                <input
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-70"
                                >
                                    {submitting ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Scheduling...</>
                                    ) : (
                                        <><Send className="w-4 h-4" /> Schedule Post</>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
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
    );
}
