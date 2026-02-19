"use client";

import React, { useState } from "react";
import { Idea } from "@/types/supabase";
import { CheckCircle, Link as LinkIcon, Sparkles, Clock, Zap, Target, Briefcase, ArrowRight, ChevronDown, ChevronUp, Calendar, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { HistoryTimeline } from "./HistoryTimeline";

interface IdeaCardProps {
    idea: Idea;
    activeTab: 'incubator' | 'projects';
    onPromote: (idea: Idea) => void;
    onDiscard?: (idea: Idea) => void;
    workspaceName: string;
}

export function IdeaCard({ idea, activeTab, onPromote, onDiscard, workspaceName }: IdeaCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getPriorityColor = (score: number) => {
        if (score >= 8) return "bg-red-500/10 text-red-400 border-red-500/20";
        if (score >= 5) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    };

    const getProgressBarColor = (score: number) => {
        if (score >= 8) return "bg-red-500";
        if (score >= 5) return "bg-amber-500";
        return "bg-blue-500";
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "group relative overflow-hidden rounded-2xl border transition-all duration-300 backdrop-blur-sm",
                activeTab === 'projects'
                    ? "bg-slate-900/40 border-emerald-500/20 hover:border-emerald-500/40"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
            )}
        >
            {/* Status Indicator Stripe */}
            <div className={cn(
                "absolute top-0 left-0 w-1 h-full transition-colors",
                activeTab === 'projects' ? "bg-emerald-500/50" : "bg-gradient-to-b from-transparent via-slate-700 to-transparent group-hover:via-indigo-500"
            )} />

            <div className="p-6">
                <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-3">
                        {/* Header Tags */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5",
                                getPriorityColor(idea.priority_score)
                            )}>
                                <Target size={10} />
                                Prioridad {idea.priority_score}
                            </span>

                            <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-800/50 text-slate-400 rounded-full text-[10px] border border-slate-700/50">
                                <Briefcase size={10} />
                                <span className="truncate max-w-[150px]">{workspaceName}</span>
                            </div>

                            {idea.ai_analysis && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] border border-indigo-500/20 cursor-help" title={idea.ai_analysis}>
                                    <Sparkles size={10} />
                                    <span>AI Hints</span>
                                </div>
                            )}
                        </div>

                        {/* Title & Description */}
                        <div>
                            <h3 className="text-xl font-semibold text-slate-100 group-hover:text-indigo-200 transition-colors leading-tight flex gap-2">
                                <span className="text-slate-500 font-mono text-lg">#{idea.idea_number}</span>
                                {idea.title}
                            </h3>
                            <p className="mt-2 text-slate-400 text-sm leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                                {idea.description}
                            </p>
                        </div>

                        {/* Metadata Footer */}
                        <div className="flex items-center gap-6 text-xs text-slate-500 pt-2 flex-wrap">
                            {/* Start Date */}
                            {idea.start_date && (
                                <div className="flex items-center gap-1.5 text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20" title="Fecha Objetivo de Inicio">
                                    <Calendar size={12} />
                                    <span>Objetivo: {new Date(idea.start_date).toLocaleDateString()}</span>
                                </div>
                            )}

                            {/* Effort Indicator */}
                            <div className="flex items-center gap-1.5" title={`Esfuerzo Estimado: ${idea.estimated_effort || 1}/5`}>
                                <span className="font-medium uppercase tracking-wide text-slate-600 text-[10px]">Esfuerzo</span>
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Zap
                                            key={i}
                                            size={12}
                                            className={cn(
                                                "transition-colors",
                                                i < (idea.estimated_effort || 1)
                                                    ? "text-yellow-500 fill-yellow-500"
                                                    : "text-slate-800"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            {idea.source_url && (
                                <a
                                    href={idea.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
                                >
                                    <LinkIcon size={12} />
                                    <span>Fuente</span>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Actions Column */}
                    <div className="flex flex-col items-end gap-5 min-w-[140px]">
                        {activeTab === 'incubator' ? (
                            <>
                                <div className="w-full text-right group/progress">
                                    <div className="flex items-center justify-end gap-2 mb-1.5 text-xs text-slate-400 group-hover/progress:text-indigo-300 transition-colors">
                                        <Target size={12} />
                                        <span className="text-[10px] font-medium uppercase tracking-wider">Madurez</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-[1px]">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500 relative",
                                                getProgressBarColor(idea.priority_score)
                                            )}
                                            style={{ width: `${idea.progress_pct}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="mt-1 text-[10px] text-right text-slate-500 font-mono">
                                        {idea.progress_pct}%
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className={cn(
                                            "relative overflow-hidden rounded-lg border p-2 transition-all duration-300",
                                            isExpanded
                                                ? "bg-slate-700 border-slate-600 text-white"
                                                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"
                                        )}
                                        title="Ver Historial"
                                    >
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    <button
                                        onClick={() => onDiscard && onDiscard(idea)}
                                        className="group/btn relative overflow-hidden rounded-lg bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 p-2 transition-all duration-300"
                                        title="Descartar Idea"
                                    >
                                        <Trash2 className="text-red-500 group-hover/btn:text-white transition-colors" size={18} />
                                    </button>
                                    <button
                                        onClick={() => onPromote(idea)}
                                        className="group/btn relative overflow-hidden rounded-lg bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 hover:border-emerald-500 p-2 transition-all duration-300"
                                        title="Promover a Proyecto"
                                    >
                                        <CheckCircle className="text-emerald-500 group-hover/btn:text-white transition-colors" size={18} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            // Project Mode
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onDiscard && onDiscard(idea)}
                                        className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-slate-800 transition-all opacity-100" // Removed hover dependency
                                        title="Descartar / Archivar Proyecto"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-500/10">
                                        <CheckCircle size={14} />
                                        ACTIVO
                                    </div>
                                </div>
                                <a
                                    href={`/projects/${idea.id}`} // Assuming ID link if it's promoted
                                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors mt-2"
                                >
                                    Ver en Tablero <ArrowRight size={12} />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Expandable History */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-800/50 bg-slate-950/30"
                    >
                        <div className="p-6">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock size={12} /> Timeline de Actividad
                            </h4>
                            <HistoryTimeline taskId={idea.id} taskType="idea" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
