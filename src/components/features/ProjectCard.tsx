"use client";

import React from "react";
import { Document } from "@/types/supabase";
import { cn } from "@/lib/utils";
import { Calendar, Target, Briefcase, ChevronRight, AlertCircle, CheckCircle, Clock, Trash2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { differenceInDays, isPast, isToday } from "date-fns";

interface ProjectCardProps {
    project: Document;
    workspaceName?: string;
    compact?: boolean;
    onDiscard?: (project: Document) => void;
    isArchived?: boolean;
}

export function ProjectCard({ project, workspaceName, compact = false, onDiscard, isArchived = false }: ProjectCardProps) {
    // --- Traffic Light Logic ---
    const getTrafficLightStatus = () => {
        const dueDate = project.due_date ? new Date(project.due_date) : null;
        const priority = project.metadata?.priority || 0;
        const progress = project.metadata?.progress || 0;

        // 1. Red: Overdue or High Priority & Stalled
        if (dueDate && isPast(dueDate) && !isToday(dueDate)) return "red";
        if (priority >= 8 && progress < 20) return "red";

        // 2. Yellow: Due soon (3 days) or Medium Priority
        if (dueDate && differenceInDays(dueDate, new Date()) <= 3) return "yellow";
        if (priority >= 5) return "yellow";

        // 3. Green: On track
        return "green";
    };

    const statusColor = getTrafficLightStatus();

    const statusStyles = {
        red: "bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10",
        yellow: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10",
        green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10",
    };

    const indicatorStyles = {
        red: "bg-red-500",
        yellow: "bg-amber-500",
        green: "bg-emerald-500",
    };

    return (
        <div className={cn(
            "group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-slate-700 hover:shadow-xl",
            compact ? "p-3" : "p-4",
            isArchived && "opacity-75 grayscale hover:grayscale-0 hover:opacity-100"
        )}>
            {/* Side Status Line */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1 transition-colors",
                !isArchived ? indicatorStyles[statusColor] : "bg-slate-600"
            )} />

            <div className="flex items-start justify-between gap-4 pl-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        {/* Status Badge */}
                        <div className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1",
                            !isArchived ? statusStyles[statusColor] : "bg-slate-800 text-slate-500 border-slate-700"
                        )}>
                            {!isArchived && (
                                <>
                                    {statusColor === 'red' && <AlertCircle size={10} />}
                                    {statusColor === 'yellow' && <Clock size={10} />}
                                    {statusColor === 'green' && <CheckCircle size={10} />}
                                </>
                            )}
                            {isArchived ? 'Archivado' : (statusColor === 'red' ? 'Crítico' : statusColor === 'yellow' ? 'Atención' : 'En Curso')}
                        </div>

                        {/* Workspace Tag */}
                        {workspaceName && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-slate-500 rounded-full text-[10px] border border-slate-700">
                                <Briefcase size={10} />
                                <span className="truncate max-w-[100px]">{workspaceName}</span>
                            </div>
                        )}
                    </div>

                    <Link href={`/projects/${project.id}`} className="block group-hover:text-indigo-300 transition-colors">
                        <h3 className={cn("font-semibold text-slate-200 truncate", compact ? "text-sm" : "text-base")}>
                            {project.title}
                        </h3>
                    </Link>

                    {!compact && (
                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                            {project.due_date && (
                                <div className={cn("flex items-center gap-1.5", statusColor === 'red' && !isArchived ? "text-red-400" : "")}>
                                    <Calendar size={12} />
                                    <span>{new Date(project.due_date).toLocaleDateString()}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Target size={12} />
                                <span>Prioridad {project.metadata?.priority || 0}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions & Progress */}
                <div className="flex flex-col items-end gap-2">
                    {/* Progress Circle (Mini) */}
                    <div className="relative w-8 h-8 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-800" />
                            <circle
                                cx="16" cy="16" r="14"
                                stroke="currentColor" strokeWidth="3" fill="transparent"
                                strokeDasharray={88}
                                strokeDashoffset={88 - (88 * (project.metadata?.progress || 0)) / 100}
                                className={cn("transition-all duration-500",
                                    isArchived ? "text-slate-600" : (
                                        statusColor === 'red' ? "text-red-500" :
                                            statusColor === 'yellow' ? "text-amber-500" : "text-emerald-500"
                                    )
                                )}
                            />
                        </svg>
                        <span className="absolute text-[8px] font-bold text-slate-400">{project.metadata?.progress || 0}%</span>
                    </div>

                    <div className="flex items-center gap-1">
                        {onDiscard && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onDiscard(project);
                                }}
                                className={cn(
                                    "p-1 rounded-md transition-colors",
                                    isArchived
                                        ? "text-emerald-500 hover:text-emerald-400 hover:bg-slate-800" // Restore
                                        : "text-slate-600 hover:text-red-400 hover:bg-slate-800" // Delete
                                )}
                                title={isArchived ? "Restaurar" : "Archivar"}
                            >
                                {isArchived ? <RefreshCw size={16} /> : <Trash2 size={16} />}
                            </button>
                        )}

                        <Link
                            href={`/projects/${project.id}`}
                            className="p-1 rounded-md text-slate-600 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
