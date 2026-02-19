"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import { Document } from "@/types/supabase";
import { Loader2, ArrowLeft, LayoutList, Kanban as KanbanIcon, Calendar as CalendarIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/context/WorkspaceContext";

import { ProjectListView } from "@/components/projects/ProjectListView";
import { ProjectCalendarView } from "@/components/projects/ProjectCalendarView";

// Placeholder Components for Views
const ProjectKanbanView = ({ project }: { project: Document }) => (
    <div className="p-8 text-slate-500 h-full flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl m-4">
        <div className="text-center">
            <KanbanIcon size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Vista de Tablero</h3>
            <p className="text-sm">Flujo de trabajo visual.</p>
        </div>
    </div>
);

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const { activeWorkspaceId } = useWorkspace();
    const id = params.id as string;

    const [project, setProject] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'kanban' | 'calendar'>('list');

    useEffect(() => {
        const fetchProject = async () => {
            if (!id) return;
            setLoading(true);

            const { data, error } = await supabaseClient
                .from("documents")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                console.error("Error fetching project:", error);
            } else {
                setProject(data);
                if (activeWorkspaceId && data.workspace_id !== activeWorkspaceId) {
                    console.warn("Project belongs to different workspace");
                }
            }
            setLoading(false);
        };

        fetchProject();
    }, [id, activeWorkspaceId]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="animate-spin text-slate-600" size={32} />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400">
                <p>Proyecto no encontrado o no tienes acceso.</p>
                <button onClick={() => router.back()} className="mt-4 text-indigo-400 hover:underline">
                    Volver
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-950 text-slate-200">
            {/* Header */}
            <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-4 flex-none">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/50 uppercase tracking-wider">
                                Proyecto Activo
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Settings size={10} /> Configuración
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">{project.title}</h1>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={cn(
                            "flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 relative",
                            activeTab === 'list'
                                ? "border-indigo-500 text-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <LayoutList size={16} />
                        Lista de Tareas
                        {activeTab === 'list' && <span className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('kanban')}
                        className={cn(
                            "flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 relative",
                            activeTab === 'kanban'
                                ? "border-indigo-500 text-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <KanbanIcon size={16} />
                        Tablero Kanban
                        {activeTab === 'kanban' && <span className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={cn(
                            "flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 relative",
                            activeTab === 'calendar'
                                ? "border-indigo-500 text-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <CalendarIcon size={16} />
                        Cronograma
                        {activeTab === 'calendar' && <span className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-slate-900 relative">
                <div className="absolute inset-0 overflow-auto">
                    {activeTab === 'list' && <ProjectListView project={project} />}
                    {activeTab === 'kanban' && <ProjectKanbanView project={project} />}
                    {activeTab === 'calendar' && <ProjectCalendarView project={project} />}
                </div>
            </div>
        </div>
    );
}
