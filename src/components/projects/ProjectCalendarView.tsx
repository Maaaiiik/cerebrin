"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Document } from "@/types/supabase";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    parseISO,
    isValid
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { supabaseClient } from "@/lib/supabase";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";

interface ProjectCalendarViewProps {
    project: Document;
}

export function ProjectCalendarView({ project }: ProjectCalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Document | null>(null);

    // Fetch tasks
    useEffect(() => {
        const fetchTasks = async () => {
            setLoading(true);
            const { data, error } = await supabaseClient
                .from("documents")
                .select("*")
                .eq("parent_id", project.id) // Assuming flat hierarchy implies tasks are children of project
                // In a recursive structure, we might need a recursive query or flat list if 'project_id' exists
                // For now, let's assume direct children or use a known pattern. 
                // Based on previous files, tasks seem to have 'parent_id'. 
                // If deep nesting exists, we might need to fetch all descendants.
                // Let's stick to direct children for V1 or try to use a recursive RPC if available.
                // Actually, let's fetch by `metadata->>project_id` if that exists, or just `parent_id` for now.
                .neq("title", "") // Basic filter
                .order("metadata->due_date", { ascending: true });

            if (!error && data) {
                setTasks(data);
            }
            setLoading(false);
        };

        fetchTasks();
    }, [project.id]);

    const { workspaces } = useWorkspace();

    // Determine Color Theme based on Workspace
    const currentWorkspace = workspaces.find(w => w.id === project.workspace_id);
    const themeColor = useMemo(() => {
        const name = currentWorkspace?.name?.toLowerCase() || "";
        if (name.includes("duoc")) return "emerald";
        if (name.includes("ebox")) return "blue";
        return "indigo"; // Default
    }, [currentWorkspace]);

    const getThemeClass = (type: 'bg' | 'text' | 'border' | 'dot', strength: string = "500") => {
        return `${type}-${themeColor}-${strength}`;
    };

    // Calendar Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = useMemo(() => {
        return eachDayOfInterval({
            start: startDate,
            end: endDate
        });
    }, [startDate, endDate]);

    const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    // Events Distribution
    const getEventsForDay = (day: Date) => {
        return tasks.filter(task => {
            // Check both root level due_date (if migrated) and metadata
            // Schema usually has `due_date` column now? Let's check type definition if possible, but metadata is safe fallback.
            // Based on TaskDetailPanel, it uses `task.due_date` first.
            const due = task.due_date || (task.metadata as any)?.due_date;
            if (!due) return false;
            const dueDate = parseISO(due);
            return isValid(dueDate) && isSameDay(dueDate, day);
        });
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    return (
        <div className="h-full flex flex-col bg-slate-950 text-slate-200">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <h2 className={cn(
                        "text-xl font-bold bg-clip-text text-transparent capitalize",
                        themeColor === 'emerald' ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-gradient-to-r from-blue-400 to-indigo-400"
                    )}>
                        {format(currentDate, "MMMM yyyy", { locale: es })}
                    </h2>
                    <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700/50">
                        <button onClick={prevMonth} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={goToToday} className="px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 rounded transition mx-1">
                            Hoy
                        </button>
                        <button onClick={nextMonth} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Stats / Filters can go here */}
                {loading && <Loader2 className={`animate-spin ${getThemeClass('text')}`} size={20} />}
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/30">
                {weekDays.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {d}
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6">
                {calendarDays.map((day, idx) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const dayEvents = getEventsForDay(day);
                    const isTodayDate = isToday(day);

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "min-h-[100px] border-b border-r border-slate-800/50 p-2 transition-colors relative group",
                                !isCurrentMonth ? "bg-slate-900/20 text-slate-600" : "bg-slate-950/20",
                                // Hover effect matching theme
                                themeColor === 'emerald' ? "hover:bg-emerald-950/10" : "hover:bg-blue-950/10"
                            )}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span
                                    className={cn(
                                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-all",
                                        isTodayDate
                                            ? `${getThemeClass('bg')} text-white shadow-lg`
                                            : "text-slate-400"
                                    )}
                                >
                                    {format(day, "d")}
                                </span>
                                {dayEvents.length > 0 && (
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {dayEvents.length}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1">
                                {dayEvents.map(task => (
                                    <button
                                        key={task.id}
                                        onClick={() => setSelectedTask(task)}
                                        className={cn(
                                            "w-full text-left px-2 py-1 rounded text-[10px] font-medium border transition truncate flex items-center gap-1 group/item",
                                            task.category === 'Finalizado'
                                                ? "bg-slate-900 border-slate-800 opacity-60 hover:opacity-100"
                                                : `bg-slate-800 border-slate-700 ${themeColor === 'emerald' ? 'hover:border-emerald-500/50' : 'hover:border-blue-500/50'} hover:bg-slate-700`
                                        )}
                                    >
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full flex-none",
                                            task.category === 'Finalizado' ? "bg-slate-500" : getThemeClass('bg')
                                        )} />
                                        <span className={task.category === 'Finalizado' ? 'line-through text-slate-500' : 'text-slate-300'}>
                                            {task.title}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Task Detail Modal */}
            <TaskDetailPanel
                task={selectedTask}
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                onSave={async (id, updates) => {
                    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
                    const { error } = await supabaseClient.from('documents').update(updates).eq('id', id);
                    if (error) console.error(error);
                }}
            />
        </div>
    );
}
