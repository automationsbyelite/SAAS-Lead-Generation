import React, { useState } from 'react';
import {
    Calendar as CalendarIcon,
    RefreshCw,
    Plus,
    ChevronLeft,
    ChevronRight,
    CheckSquare,
    Clock,
    XCircle,
    List
} from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isToday,
    isSameDay
} from 'date-fns';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';

// Draggable Post Pill
function DraggablePost({ post }: { post: any }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: post.id,
        data: post
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
    } : undefined;

    const bgMap: Record<string, string> = {
        'instagram': 'bg-pink-500',
        'facebook': 'bg-blue-500',
        'linkedin': 'bg-sky-500'
    };
    const bg = bgMap[post.platform] || 'bg-indigo-500';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`cursor-grab active:cursor-grabbing w-full mb-1 p-1 rounded-md text-[10px] font-bold text-white truncate shadow-sm transition-opacity hover:opacity-80 flex items-center gap-1 ${bg}`}
        >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                {post.mediaType === 'IMAGE' ? '🖼️' : '🎬'}
            </span>
            <span className="truncate">{post.caption || 'New Post'}</span>
        </div>
    );
}

// Droppable Calendar Cell
function DroppableDay({ day, posts, isCurrentMonth }: { day: Date, posts: any[], isCurrentMonth: boolean }) {
    const { isOver, setNodeRef } = useDroppable({
        id: day.toISOString(),
        data: { date: day }
    });

    return (
        <div
            ref={setNodeRef}
            className={`min-h-[100px] sm:min-h-[120px] p-2 border border-white/5 transition-colors ${isCurrentMonth ? 'bg-slate-900/40' : 'bg-slate-950/40 opacity-50'
                } ${isOver ? 'bg-indigo-500/20 border-indigo-500' : ''}`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${isToday(day) ? 'w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/50' : 'text-slate-400'}`}>
                    {format(day, 'd')}
                </span>
            </div>
            <div className="space-y-1">
                {posts.map(post => (
                    <DraggablePost key={post.id} post={post} />
                ))}
            </div>
        </div>
    );
}

interface ContentCalendarProps {
    posts: any[];
    onRefresh: () => void;
    onNewPost: () => void;
    onReschedule: (postId: string, newDate: Date) => void;
}

export const ContentCalendar = ({ posts, onRefresh, onNewPost, onReschedule }: ContentCalendarProps) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');

    // Stats
    const totalPosts = posts.length;
    const pendingPosts = posts.filter(p => p.status === 'scheduled').length;
    const publishedPosts = posts.filter(p => p.status === 'posted').length;
    const failedPosts = posts.filter(p => p.status === 'failed').length;

    // Calendar Math
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const postId = active.id as string;
        const newDateStr = over.id as string;
        const newDate = new Date(newDateStr);

        // Find existing post to keep its original time, just change the day
        const post = posts.find(p => p.id === postId);
        if (post) {
            const originalDate = new Date(post.scheduledAt);
            newDate.setHours(originalDate.getHours());
            newDate.setMinutes(originalDate.getMinutes());
            onReschedule(postId, newDate);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 grid place-items-center shadow-lg shadow-indigo-500/20">
                        <CalendarIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Content Calendar</h2>
                        <p className="text-slate-400 text-sm">Visualize and manage all your scheduled posts at a glance.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onRefresh} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 border border-white/5">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                    <button onClick={onNewPost} className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-pink-500/20">
                        <Plus className="w-4 h-4" /> NEW POST
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">TOTAL POSTS</span>
                        <List className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="text-3xl font-black text-white">{totalPosts}</div>
                </div>
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-blue-400 tracking-wider uppercase">PENDING</span>
                        <Clock className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-3xl font-black text-blue-400">{pendingPosts}</div>
                </div>
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">PUBLISHED</span>
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-black text-emerald-400">{publishedPosts}</div>
                </div>
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-xl">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-red-500 tracking-wider uppercase">FAILED</span>
                        <XCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="text-3xl font-black text-red-500">{failedPosts}</div>
                </div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 bg-slate-900 border border-white/5 rounded-full p-1 shadow-inner">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="w-32 text-center text-sm font-extrabold text-white">
                        {format(currentDate, 'MMMM yyyy')}
                    </span>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex bg-slate-900 p-1 rounded-full border border-white/5 shadow-inner">
                    {['month', 'week', 'list'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode as any)}
                            className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-wider uppercase transition-all ${viewMode === mode
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-white'
                                }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                {/* Legend */}
                <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span className="text-[10px] font-bold text-slate-500 uppercase">Pending</span></div>
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-[10px] font-bold text-slate-500 uppercase">Posted</span></div>
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-[10px] font-bold text-slate-500 uppercase">Failed</span></div>
                    </div>
                </div>

                {/* Days of Week */}
                <div className="grid grid-cols-7 border-b border-white/5 bg-slate-900/50">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                        <div key={day} className="py-3 text-center text-[10px] font-black text-slate-500 tracking-widest border-r border-white/5 last:border-0">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Body with Drag/Drop */}
                <DndContext onDragEnd={handleDragEnd}>
                    <div className="grid grid-cols-7 bg-slate-950/80">
                        {calendarDays.map((day, idx) => {
                            const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduledAt), day));
                            return (
                                <DroppableDay
                                    key={day.toISOString()}
                                    day={day}
                                    posts={dayPosts}
                                    isCurrentMonth={isSameMonth(day, currentDate)}
                                />
                            );
                        })}
                    </div>
                </DndContext>
            </div>
        </div>
    );
}
