import React, { useState } from 'react';
import { RefreshCw, Plus, Clock, Edit3, Calendar as CalendarIcon, BarChart2, CheckCircle2, AlertCircle, ImageIcon, Video } from 'lucide-react';
import { format } from 'date-fns';

interface QueueManagerProps {
    posts: any[];
    onRefresh: () => void;
    onNewPost: () => void;
    onViewCalendar: () => void;
}

export const QueueManager = ({ posts, onRefresh, onNewPost, onViewCalendar }: QueueManagerProps) => {
    const [activePlatform, setActivePlatform] = useState<'instagram' | 'facebook' | 'linkedin'>('instagram');

    const filteredPosts = posts.filter(p => p.platform === activePlatform && p.status !== 'posted');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 grid place-items-center shadow-lg shadow-pink-500/20">
                        <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Queue Manager</h2>
                        <p className="text-slate-400 text-sm">Manage your upcoming scheduled posts across all platforms.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onRefresh} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 border border-white/5">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                    <button onClick={onNewPost} className="px-5 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20">
                        <Plus className="w-4 h-4" /> ADD POST
                    </button>
                </div>
            </div>

            {/* Platform Tabs */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setActivePlatform('instagram')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activePlatform === 'instagram'
                        ? 'bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/20'
                        : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
                        }`}
                >
                    <span className="w-2 h-2 rounded-full bg-white/80"></span> INSTAGRAM
                </button>
                <button
                    onClick={() => setActivePlatform('facebook')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activePlatform === 'facebook'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
                        }`}
                >
                    <span className="w-2 h-2 rounded-full bg-blue-400/80 hidden"></span> FACEBOOK
                </button>
                <button
                    onClick={() => setActivePlatform('linkedin')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activePlatform === 'linkedin'
                            ? 'bg-gradient-to-r from-sky-400 to-sky-600 text-white shadow-lg shadow-sky-500/20'
                            : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
                        }`}
                >
                    <span className="w-2 h-2 rounded-full bg-sky-400/80 hidden"></span> LINKEDIN
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Queue List (Left/Center Pane) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-xl">
                        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                            <h3 className="text-white font-bold text-lg capitalize">{activePlatform} Queue</h3>
                            <span className="px-2 py-1 bg-pink-500/10 text-pink-400 rounded-lg text-xs font-bold tracking-wide">
                                {filteredPosts.length} POST{filteredPosts.length !== 1 && 'S'}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {filteredPosts.length === 0 ? (
                                <div className="text-center py-10">
                                    <Clock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                    <p className="text-slate-400">Queue is empty for {activePlatform}.</p>
                                </div>
                            ) : (
                                filteredPosts.map((post, idx) => (
                                    <div key={post.id} className="bg-slate-950/50 border border-white/5 rounded-xl p-4 flex gap-4 items-start group hover:border-white/10 transition-colors">
                                        <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                                            {idx + 1}
                                        </div>
                                        {post.mediaUrl ? (
                                            <div className="w-16 h-16 rounded-lg bg-black overflow-hidden shrink-0 border border-white/10">
                                                {post.mediaType === 'VIDEO' ? (
                                                    <video src={post.mediaUrl} className="w-full h-full object-cover opacity-80" />
                                                ) : (
                                                    <img src={post.mediaUrl} className="w-full h-full object-cover" alt="media" />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-white/10">
                                                <ImageIcon className="w-6 h-6 text-slate-700" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed mb-2 font-medium">
                                                {post.caption}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-wider flex items-center gap-1.5 uppercase">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span> SCHEDULED
                                                </span>
                                                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                                                    <CalendarIcon className="w-3.5 h-3.5" />
                                                    {format(new Date(post.scheduledAt), "MMM dd - hh:mm a")}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Pane */}
                <div className="space-y-6">
                    {/* Best Times to Post */}
                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-xl">
                        <h3 className="text-white font-bold mb-1 flex items-center gap-2">
                            <span className="text-amber-400">⚡</span> Best Times to Post
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">Recommended for {activePlatform}</p>

                        <div className="space-y-2">
                            {[
                                { day: 'Mon', time: '6PM', label: 'BEST', color: 'text-orange-400' },
                                { day: 'Wed', time: '11AM', label: 'GREAT', color: 'text-pink-400' },
                                { day: 'Fri', time: '9AM', label: 'GOOD', color: 'text-slate-400' },
                                { day: 'Sat', time: '10AM', label: 'GOOD', color: 'text-slate-400' }
                            ].map((slot, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/5">
                                    <span className="text-sm font-semibold text-slate-300">{slot.day} {slot.time}</span>
                                    <span className={`text-[10px] font-bold flex items-center gap-1.5 ${slot.color}`}>
                                        <span className={`w-1 h-1 rounded-full bg-current`}></span> {slot.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-xl">
                        <h3 className="text-white font-bold mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <button onClick={onNewPost} className="w-full p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800 border border-white/5 flex items-center gap-3 text-sm font-semibold text-slate-300 transition-colors group">
                                <Edit3 className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" /> Create New Post
                            </button>
                            <button onClick={onViewCalendar} className="w-full p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800 border border-white/5 flex items-center gap-3 text-sm font-semibold text-slate-300 transition-colors group">
                                <CalendarIcon className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" /> Calendar View
                            </button>
                            <button className="w-full p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800 border border-white/5 flex items-center gap-3 text-sm font-semibold text-slate-300 transition-colors group">
                                <BarChart2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" /> View Analytics
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
