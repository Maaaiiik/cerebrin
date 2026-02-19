"use client";

import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabaseClient } from "@/lib/supabase";
import { Activity, Loader2, GitCommit, Zap, FileText, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion } from "framer-motion";

type ActivityItem = {
    id: string;
    created_at: string;
    action_type: string;
    description: string;
    workspace_id: string;
    metadata?: any;
};

export default function ActivityPage() {
    const { activeWorkspaceId, isLoading: isContextLoading } = useWorkspace();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isContextLoading) return;
        if (!activeWorkspaceId) {
            setLoading(false);
            setActivities([]);
            return;
        }

        const fetchActivity = async () => {
            setLoading(true);

            // Mock Fallback
            if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder")) {
                setActivities([
                    { id: "1", created_at: new Date().toISOString(), action_type: "promote_idea", description: "Promoted 'Ebox Report' to Tasks", workspace_id: "1" },
                    { id: "2", created_at: new Date(Date.now() - 86400000).toISOString(), action_type: "agent_sync", description: "Agent synced 5 new research papers", workspace_id: "1" }
                ]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabaseClient
                .from("activity_feed")
                .select("*")
                .eq("workspace_id", activeWorkspaceId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) {
                console.error("Error loading activity:", error);
            } else {
                setActivities(data || []);
            }
            setLoading(false);
        };

        fetchActivity();
    }, [activeWorkspaceId, isContextLoading]);

    const getIcon = (type: string) => {
        if (type.includes("promote")) return <CheckCircle size={16} className="text-emerald-400" />;
        if (type.includes("idea")) return <Zap size={16} className="text-amber-400" />;
        if (type.includes("document")) return <FileText size={16} className="text-blue-400" />;
        return <GitCommit size={16} className="text-slate-400" />;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("es-ES", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
        });
    };

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Historial del Agente</h1>
                <p className="text-slate-400 mt-1">Registro de actividad y sincronizaciones</p>
            </div>

            <div className="max-w-3xl mx-auto">
                {loading ? (
                    <div className="space-y-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2 pt-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No hay actividad reciente en este workspace.</p>
                    </div>
                ) : (
                    <div className="relative border-l border-slate-800 ml-4 space-y-8">
                        {activities.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="relative pl-8"
                            >
                                <div className="absolute -left-[21px] top-1 bg-slate-900 border border-slate-700 p-2 rounded-full shadow-lg shadow-black/50">
                                    {getIcon(item.action_type)}
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">
                                            {item.action_type.replace("_", " ")}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {formatDate(item.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-slate-200 text-sm leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
