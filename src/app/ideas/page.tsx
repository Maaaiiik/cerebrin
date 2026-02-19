"use client";

import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabaseClient } from "@/lib/supabase";
import { Idea } from "@/types/supabase";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { IdeaForm } from "@/components/features/IdeaForm";
import { IdeaCard } from "@/components/features/IdeaCard";

export default function IdeasPage() {
    const { workspaces, isLoading: isContextLoading } = useWorkspace();
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'incubator' | 'projects'>('incubator');
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        fetchIdeas();
    }, []);

    const fetchIdeas = async () => {
        setLoading(true);

        const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder");
        if (isMockMode) {
            setIdeas([
                {
                    id: "mock-1", title: "Automate Ebox Reporting", description: "Use OpenClaw to automate weekly reports...",
                    priority_score: 9, progress_pct: 45, status: "evaluating", workspace_id: "ws-1", estimated_effort: 3, ai_analysis: "High impact",
                    source_url: "https://ebox.lat", idea_number: 1
                },
                {
                    id: "mock-3", title: "Promoted Project Example", description: "Already in Kanban",
                    priority_score: 10, progress_pct: 100, status: "executed", workspace_id: "ws-1", estimated_effort: 5, idea_number: 2
                }
            ]);
            setLoading(false);
            return;
        }

        const { data, error } = await supabaseClient
            .from("idea_pipeline")
            .select("*")
            .order("priority_score", { ascending: false });

        if (error) {
            console.error("Error fetching ideas:", error);
        } else {
            setIdeas(data || []);
        }
        setLoading(false);
    };

    const handlePromote = async (idea: Idea) => {
        if (!confirm(`¿Promover "${idea.title}" a Documento?`)) return;

        try {
            const { data: { user } } = await supabaseClient.auth.getUser();

            const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder");
            const isDev = process.env.NODE_ENV === 'development';

            let userId = user?.id;

            if (!userId && (isMockMode || isDev)) {
                userId = "00000000-0000-0000-0000-000000000000";
                console.warn("Using dev-fallback user ID (Nil UUID) for promotion");
            }

            if (!userId) {
                alert("Error: No has iniciado sesión. Por favor, inicia sesión para promover ideas.");
                return;
            }

            const response = await fetch('/api/ideas/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea_id: idea.id,
                    workspace_id: idea.workspace_id,
                    user_id: userId
                })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Failed to promote");

            alert(`¡Éxito! "${idea.title}" se ha convertido en un Proyecto.`);
            fetchIdeas();

        } catch (error: any) {
            console.error("Promotion failed:", error);
            alert("Error al promover: " + error.message);
        }
    };

    const handleDiscard = async (idea: Idea) => {
        if (!confirm(`¿Estás seguro de DESCARTAR "${idea.title}"? No se eliminará, pero pasará al histórico de descartados.`)) return;

        try {
            const { error } = await supabaseClient
                .from("idea_pipeline")
                .update({ status: 'discarded' })
                .eq('id', idea.id);

            if (error) throw error;

            // Log history
            await supabaseClient.from("task_history").insert({
                task_id: idea.id,
                task_type: "idea",
                previous_status: idea.status,
                new_status: "discarded",
                changed_by: "user", // Should get real user but simple for now
                changed_at: new Date().toISOString(),
                details: "Idea descartada manualmente",
                workspace_id: idea.workspace_id
            });

            fetchIdeas();
        } catch (error: any) {
            console.error("Discard failed:", error);
            alert("Error al descartar: " + error.message);
        }
    };

    const incubatorIdeas = ideas.filter(i => i.status !== 'executed' && i.status !== 'discarded');
    const projectIdeas = ideas.filter(i => i.status === 'executed');
    const archivedIdeas = ideas.filter(i => i.status === 'discarded');

    const displayedIdeas = showArchived
        ? archivedIdeas
        : activeTab === 'incubator'
            ? incubatorIdeas
            : projectIdeas;

    const getWorkspaceName = (id: string) => {
        return workspaces.find(w => w.id === id)?.name || "Desconocido";
    };

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-bold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                            Incubadora
                        </h1>
                        <p className="text-slate-400 mt-2 text-lg">
                            Madura tus conceptos, evalúa su impacto y conviértelos en proyectos.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <IdeaForm onSuccess={fetchIdeas} />
                    </div>
                </div>

                {/* Modern Tabs */}
                <div className="flex justify-between items-end mb-10 border-b border-slate-800/60 sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md pt-2">
                    <div className="flex gap-8">
                        <button
                            onClick={() => { setActiveTab('incubator'); setShowArchived(false); }}
                            className={cn(
                                "pb-4 px-2 text-sm font-bold transition-all relative flex items-center gap-3",
                                activeTab === 'incubator' && !showArchived ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <span>SEMILLAS / INCUBADORA</span>
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs transition-colors",
                                activeTab === 'incubator' && !showArchived ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-500"
                            )}>
                                {incubatorIdeas.length}
                            </span>
                            {activeTab === 'incubator' && !showArchived && (
                                <motion.div
                                    layoutId="tab-highlight"
                                    className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                />
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab('projects'); setShowArchived(false); }}
                            className={cn(
                                "pb-4 px-2 text-sm font-bold transition-all relative flex items-center gap-3",
                                activeTab === 'projects' && !showArchived ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <span>PROYECTOS ACTIVOS</span>
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs transition-colors",
                                activeTab === 'projects' && !showArchived ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                            )}>
                                {projectIdeas.length}
                            </span>
                            {activeTab === 'projects' && !showArchived && (
                                <motion.div
                                    layoutId="tab-highlight"
                                    className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                />
                            )}
                        </button>
                    </div>

                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={cn(
                            "pb-4 px-2 text-xs font-medium transition-all flex items-center gap-2",
                            showArchived ? "text-red-400" : "text-slate-600 hover:text-slate-400"
                        )}
                    >
                        <span>🗑️ Papelera / Descartados</span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded-full text-[10px] text-slate-500">{archivedIdeas.length}</span>
                    </button>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 flex flex-col gap-4 animate-pulse">
                                <div className="flex justify-between items-start">
                                    <Skeleton className="h-4 w-20 rounded-full" />
                                    <Skeleton className="h-4 w-24 rounded-full" />
                                </div>
                                <div className="space-y-3 mt-2">
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-16 w-full" />
                                </div>
                                <div className="mt-auto pt-4 flex justify-between items-center border-t border-slate-800/50">
                                    <Skeleton className="h-3 w-32" />
                                    <Skeleton className="h-8 w-8 rounded-lg" />
                                </div>
                            </div>
                        ))
                    ) : displayedIdeas.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="col-span-full py-32 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20"
                        >
                            <div className="bg-slate-800/50 p-4 rounded-full mb-4">
                                <Loader2 className="w-8 h-8 text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-300 mb-2">
                                {activeTab === 'incubator' ? "Incubadora Vacía" : "Sin Proyectos Promovidos"}
                            </h3>
                            <p className="text-slate-500 max-w-sm">
                                {activeTab === 'incubator'
                                    ? "Empieza creando una nueva idea para evaluar su potencial."
                                    : "Promueve ideas desde la incubadora una vez estén maduras."}
                            </p>
                        </motion.div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {displayedIdeas.map((idea) => (
                                <IdeaCard
                                    key={idea.id}
                                    idea={idea}
                                    activeTab={activeTab}
                                    onPromote={handlePromote}
                                    onDiscard={handleDiscard}
                                    workspaceName={getWorkspaceName(idea.workspace_id)}
                                />
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}
