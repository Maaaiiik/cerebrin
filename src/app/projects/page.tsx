"use client";

import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabaseClient } from "@/lib/supabase";
import { Document } from "@/types/supabase";
import { Loader2, Briefcase, Plus, FolderOpen, ArrowRight, Clock, Filter, Trash2, RefreshCw, Zap } from "lucide-react";
import Link from "next/link";
import { ProjectForm } from "@/components/features/ProjectForm";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function ProjectsListPage() {
    const { workspaces, activeWorkspaceId, setActiveWorkspaceId, isLoading: isContextLoading } = useWorkspace();
    const [projects, setProjects] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterWorkspace, setFilterWorkspace] = useState<string | 'all'>('all');
    const [showArchived, setShowArchived] = useState(false);

    // Sync filter with context
    useEffect(() => {
        if (activeWorkspaceId) {
            setFilterWorkspace(activeWorkspaceId);
        }
    }, [activeWorkspaceId]);

    useEffect(() => {
        fetchProjects();
    }, [filterWorkspace, activeWorkspaceId, showArchived]); // Re-fetch on filters change

    const fetchProjects = async () => {
        setLoading(true);

        // Build query
        let query = supabaseClient
            .from("documents")
            .select("*")
            .or("type.eq.project,category.eq.En Progreso,category.eq.Proyectos,category.eq.project,type.eq.En Progreso")
            .is("parent_id", null)
            .order("created_at", { ascending: false });

        // Filter by Archive Status
        if (showArchived) {
            query = query.eq("is_archived", true);
        } else {
            // Explicitly filter out archived items ONLY if they are marked as true. 
            // Handles nulls by checking for false or null usually, but Supabase boolean filters can be tricky with null.
            // Assuming default false or null is active.
            query = query.or("is_archived.eq.false,is_archived.is.null");
        }

        if (filterWorkspace !== 'all') {
            query = query.eq("workspace_id", filterWorkspace);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching projects:", error);
        } else {
            console.log("Projects fetched:", data?.length);
            setProjects(data || []);
        }
        setLoading(false);
    };

    const handleDiscard = async (e: React.MouseEvent, project: Document) => {
        e.preventDefault(); // Prevent Link navigation
        e.stopPropagation();

        const action = showArchived ? "RESTAURAR" : "ARCHIVAR";
        if (!confirm(`¿Estás seguro de ${action} el proyecto "${project.title}"?`)) return;

        try {
            const { error } = await supabaseClient
                .from("documents")
                .update({ is_archived: !showArchived }) // Toggle
                .eq('id', project.id);

            if (error) throw error;

            fetchProjects();
        } catch (err: any) {
            alert(`Error al ${action.toLowerCase()}: ` + err.message);
        }
    };

    const getProgress = (doc: Document) => {
        return (doc.metadata as any)?.progress || 0;
    };

    const getWorkspaceName = (id: string) => {
        return workspaces.find(w => w.id === id)?.name || "Desconocido";
    };

    if (isContextLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="p-8 h-full overflow-y-auto bg-slate-950 text-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
                        <Briefcase className="text-emerald-500" />
                        Gestión de Proyectos
                    </h1>
                    <p className="text-slate-400 mt-1">Supervisa el avance, tareas y entregables.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/ideas"
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors border border-slate-700 text-slate-300"
                    >
                        <Zap size={16} className="text-yellow-500" />
                        <span className="hidden sm:inline">Desde Incubadora</span>
                    </Link>
                    <ProjectForm onSuccess={fetchProjects} />
                </div>
            </div>

            {/* Workspace Filters & Archive Toggle */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase mr-2 flex items-center gap-1">
                        <Filter size={12} /> Filtrar:
                    </span>
                    <button
                        onClick={() => {
                            setFilterWorkspace('all');
                            setActiveWorkspaceId(null);
                        }}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                            filterWorkspace === 'all'
                                ? "bg-indigo-500 text-white border-indigo-500"
                                : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                        )}
                    >
                        Todos
                    </button>
                    {workspaces.map(ws => (
                        <button
                            key={ws.id}
                            onClick={() => {
                                setFilterWorkspace(ws.id);
                                setActiveWorkspaceId(ws.id);
                            }}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                                filterWorkspace === ws.id
                                    ? "bg-indigo-500 text-white border-indigo-500"
                                    : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                            )}
                        >
                            {ws.name}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                        showArchived
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300"
                    )}
                >
                    <Trash2 size={12} />
                    {showArchived ? "Viendo Papelera" : "Papelera"}
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                    {loading ? (
                        <Loader2 className="animate-spin w-10 h-10 mx-auto text-slate-600" />
                    ) : (
                        <>
                            <FolderOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-300">
                                {showArchived ? "Papelera Vacía" : "No hay proyectos encontrados"}
                            </h3>
                            <p className="text-slate-500 max-w-md mx-auto mt-2 mb-8">
                                {showArchived
                                    ? "No hay proyectos archivados."
                                    : filterWorkspace !== 'all'
                                        ? "No hay proyectos en este workspace. Crea uno nuevo o revisa el filtro."
                                        : "Comienza creando tu primer proyecto o promueve una idea desde la incubadora."}
                            </p>
                            {!showArchived && <ProjectForm onSuccess={fetchProjects} />}
                        </>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project, i) => (
                        <Link href={`/projects/${project.id}`} key={project.id}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={cn(
                                    "group bg-slate-900 hover:bg-slate-800/80 rounded-2xl p-6 border transition-all duration-300 relative overflow-hidden h-full flex flex-col shadow-lg hover:shadow-xl",
                                    showArchived ? "border-red-900/30 opacity-75" : "border-slate-800 hover:border-emerald-500/30"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-0 left-0 w-1 h-full transition-colors",
                                    showArchived ? "bg-red-500/50" : "bg-emerald-500/50 group-hover:bg-emerald-500"
                                )} />

                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                                                {getWorkspaceName(project.workspace_id)}
                                            </span>
                                            {showArchived && (
                                                <span className="px-2 py-0.5 rounded text-[10px] bg-red-900/50 text-red-400 border border-red-900">
                                                    ARCHIVADO
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-300 transition-colors line-clamp-1 mt-1">
                                            {project.title}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={(e) => handleDiscard(e, project)}
                                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                                        title={showArchived ? "Restaurar Proyecto" : "Archivar Proyecto"}
                                    >
                                        {showArchived ? <RefreshCw size={14} /> : <Trash2 size={14} />}
                                    </button>
                                </div>

                                <p className="text-sm text-slate-400 mb-6 line-clamp-2 flex-1">
                                    {project.content || "Sin descripción."}
                                </p>

                                <div className="mt-auto pt-4 border-t border-slate-800/50">
                                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                                        <span className="flex items-center gap-1"><Clock size={10} /> {project.created_at ? formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: es }) : ''}</span>
                                        <span className="font-mono text-emerald-400 font-bold">{getProgress(project).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
                                                showArchived ? "bg-slate-600" : "bg-emerald-500"
                                            )}
                                            style={{ width: `${getProgress(project)}%` }}
                                        />
                                    </div>

                                    <div className="mt-4 flex items-center justify-end text-xs font-bold text-emerald-500 uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-all">
                                        <span className="mr-1 group-hover:mr-2 transition-all">Gestionar</span> <ArrowRight size={12} />
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
