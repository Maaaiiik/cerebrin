"use client";

import React, { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase";
import { TaskHistory } from "@/types/supabase";
import { Clock, User, ArrowRight, Activity } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface HistoryTimelineProps {
    taskId: string;
    taskType: 'document' | 'idea';
}

export function HistoryTimeline({ taskId, taskType }: HistoryTimelineProps) {
    const [history, setHistory] = useState<TaskHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            const { data, error } = await supabaseClient
                .from("task_history")
                .select("*")
                .eq("task_id", taskId)
                // .eq("task_type", taskType) // Potentially missing column causing 400
                .order("changed_at", { ascending: false });

            if (data) setHistory(data);
            setLoading(false);
        };

        fetchHistory();
    }, [taskId, taskType]);

    if (loading) return <div className="text-xs text-slate-500 animate-pulse">Cargando historial...</div>;
    if (history.length === 0) return <div className="text-xs text-slate-500 italic">Sin historial de cambios.</div>;

    return (
        <div className="space-y-4 relative pl-4 mt-4">
            {/* Vertical Line */}
            <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-slate-800" />

            {history.map((record) => (
                <div key={record.id} className="relative text-sm text-slate-400">
                    <div className="absolute -left-[19px] top-1 h-3 w-3 rounded-full bg-slate-700 border-2 border-slate-900" />

                    <div className="flex flex-col gap-1 bg-slate-800/30 p-3 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start">
                            <span className="font-semibold text-slate-300 flex items-center gap-2">
                                <Activity size={12} className="text-indigo-400" />
                                Cambio de Estado
                            </span>
                            <span className="text-[10px] text-slate-500">
                                {format(new Date(record.changed_at), "dd MMM HH:mm", { locale: es })}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-slate-900 rounded text-slate-500 truncate max-w-[80px]">{record.previous_status}</span>
                            <ArrowRight size={12} className="text-slate-600" />
                            <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-400 rounded border border-emerald-900/50 truncate max-w-[80px]">{record.new_status}</span>
                        </div>

                        {record.details && (
                            <p className="text-xs text-slate-500 mt-1 italic">"{record.details}"</p>
                        )}

                        <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-1">
                            <User size={10} />
                            <span>{record.changed_by === 'agent' ? 'Agente IA' : 'Usuario'}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
