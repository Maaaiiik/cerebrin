"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, Lightbulb, FileText, BrainCircuit, Activity, Calendar, ArrowRight, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseClient } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type DetailType = 'ideas' | 'tasks' | 'projects' | 'activity' | null;

interface DashboardDetailSheetProps {
    isOpen: boolean;
    onClose: () => void;
    type: DetailType;
    workspaceId: string | null;
}

export function DashboardDetailSheet({ isOpen, onClose, type, workspaceId }: DashboardDetailSheetProps) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && type && workspaceId) {
            fetchDetails();
        }
    }, [isOpen, type, workspaceId]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            let query;

            switch (type) {
                case 'ideas':
                    query = supabaseClient
                        .from("idea_pipeline")
                        .select("*")
                        .eq("workspace_id", workspaceId)
                        .order("created_at", { ascending: false });
                    break;
                case 'tasks':
                    query = supabaseClient
                        .from("documents")
                        .select("*")
                        .eq("workspace_id", workspaceId)
                        .neq("category", "Finalizado") // Active tasks
                        .eq("type", "task") // Assuming 'task' type exists or we differentiate by schema
                        .order("metadata->priority", { ascending: false }); // High priority first
                    // If 'type' column doesn't discriminate tasks well enough, we might need other filters.
                    // Based on page.tsx, tasks are counts from 'documents' not 'Finalizado'.
                    break;
                case 'projects':
                    query = supabaseClient
                        .from("documents")
                        .select("*")
                        .eq("workspace_id", workspaceId)
                        .contains("tags", ["proyecto"])
                        .neq("category", "Finalizado")
                        .order("updated_at", { ascending: false });
                    break;
                /* case 'activity': // Usually strictly handled by activity_feed table
                     // Implemented below differently if needed
                     break; */
            }

            if (query) {
                const { data, error } = await query;
                if (error) throw error;
                // Filter tasks manually if needed since we reused 'documents' table logic from page.tsx
                if (type === 'tasks') {
                    // Basic cleaning if needed, though the query should handle most.
                    setItems(data || []);
                } else {
                    setItems(data || []);
                }
            } else if (type === 'activity') {
                const { data } = await supabaseClient
                    .from("activity_feed")
                    .select("*")
                    .eq("workspace_id", workspaceId)
                    .order("created_at", { ascending: false })
                    .limit(20);
                setItems(data || []);
            }

        } catch (error) {
            console.error("Error fetching details:", error);
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'ideas': return "Ideas en Incubadora";
            case 'tasks': return "Tareas Activas";
            case 'projects': return "Proyectos en Curso";
            case 'activity': return "Historial de Actividad";
            default: return "Detalle";
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'ideas': return <Lightbulb className="text-indigo-400" />;
            case 'tasks': return <FileText className="text-purple-400" />;
            case 'projects': return <BrainCircuit className="text-blue-400" />;
            case 'activity': return <Activity className="text-emerald-400" />;
            default: return null;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                            <div className="flex items-center gap-3 font-bold text-xl text-slate-100">
                                {getIcon()}
                                {getTitle()}
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                                </div>
                            ) : items.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <p>No hay elementos para mostrar.</p>
                                </div>
                            ) : (
                                <>
                                    {type === 'ideas' && items.map((item) => (
                                        <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-indigo-500/30 transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">{item.title}</h4>
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                                    item.status === 'aprobada' ? "bg-emerald-500/10 text-emerald-400" :
                                                        item.status === 'rechazada' ? "bg-red-500/10 text-red-400" :
                                                            "bg-slate-800 text-slate-400"
                                                )}>{item.status}</span>
                                            </div>
                                            <p className="text-sm text-slate-500 mb-3 line-clamp-2">{item.description}</p>
                                            <div className="flex items-center justify-between text-xs text-slate-600">
                                                <span>{format(new Date(item.created_at), "d MMM yyyy", { locale: es })}</span>
                                                {/* Link to full view if possible, or just indicator */}
                                            </div>
                                        </div>
                                    ))}

                                    {type === 'tasks' && items.map((item) => (
                                        <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-purple-500/30 transition-all">
                                            <div className="flex items-start gap-3">
                                                <div className={cn(
                                                    "mt-1 w-2 h-2 rounded-full",
                                                    item.metadata?.status === 'done' ? "bg-emerald-500" :
                                                        item.metadata?.status === 'inprogress' ? "bg-blue-500" : "bg-slate-500"
                                                )} />
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-slate-200 text-sm mb-1">{item.title}</h4>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {item.metadata?.due_date ? format(new Date(item.metadata.due_date), "d MMM", { locale: es }) : "Sin fecha"}
                                                        </span>
                                                        {item.metadata?.priority && (
                                                            <span className={cn(
                                                                "font-mono",
                                                                item.metadata.priority >= 8 ? "text-red-400" : "text-slate-500"
                                                            )}>P{item.metadata.priority}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {type === 'projects' && items.map((item) => (
                                        <Link href={`/projects/${item.id}`} key={item.id} className="block group">
                                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-blue-500/30 transition-all">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{item.title}</h4>
                                                    <ArrowRight size={16} className="text-slate-600 group-hover:text-blue-400 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                                                </div>
                                                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{item.ai_analysis || "Sin descripción"}</p>
                                                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="bg-blue-500 h-full rounded-full"
                                                        style={{ width: `${item.metadata?.progress || 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </Link>
                                    ))}

                                    {type === 'activity' && items.map((item) => (
                                        <div key={item.id} className="flex gap-3 relative pb-6 last:pb-0">
                                            <div className="absolute left-[11px] top-2 bottom-0 w-px bg-slate-800 last:hidden" />
                                            <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-300">{item.description}</p>
                                                <span className="text-xs text-slate-500">
                                                    {format(new Date(item.created_at), "d MMM, HH:mm", { locale: es })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
