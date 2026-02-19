"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Loader2, Plus, X, Zap, Target, Calendar, Briefcase, User, Info, Link as LinkIcon } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";

interface IdeaFormProps {
    onSuccess?: () => void;
}

export function IdeaForm({ onSuccess }: IdeaFormProps) {
    const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState(5);
    const [effort, setEffort] = useState(3);
    const [startDate, setStartDate] = useState("");
    const [sourceUrl, setSourceUrl] = useState("");


    useEffect(() => {
        // Fetch current user for "Creator" display
        const getUser = async () => {
            const { data: { user } } = await supabaseClient.auth.getUser();
            setCurrentUser(user);
        };
        getUser();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeWorkspaceId) return alert("Selecciona un workspace primero.");

        setLoading(true);
        try {
            // 1. Insert Idea
            const { data: ideaData, error: ideaError } = await supabaseClient
                .from("idea_pipeline")
                .insert({
                    title,
                    description,
                    priority_score: priority,
                    progress_pct: 0, // Starts at 0% maturity
                    status: "draft",
                    workspace_id: activeWorkspaceId,
                    created_by_type: "manual",
                    estimated_effort: effort,
                    source_url: sourceUrl || null,
                    start_date: startDate || null
                })
                .select()
                .single();

            if (ideaError) throw ideaError;

            // 2. Log Creation History
            await supabaseClient.from("task_history").insert({
                task_id: ideaData.id,
                task_type: "idea",
                previous_status: "none",
                new_status: "draft",
                changed_by: currentUser?.email || "user",
                changed_at: new Date().toISOString(),
                details: "Idea creada manualmente",
                workspace_id: activeWorkspaceId
            });



            // Reset
            setTitle("");
            setDescription("");
            setPriority(5);
            setEffort(3);
            setStartDate("");
            setSourceUrl("");

            setIsOpen(false);
            if (onSuccess) onSuccess();

        } catch (error: any) {
            console.error("Error creating idea:", error);
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
                <Plus size={18} />
                <span>Nueva Idea</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh]">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Zap className="text-yellow-500 fill-yellow-500" size={24} />
                                    Nueva Semilla
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">Registra un nuevo concepto para incubación.</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <form id="idea-form" onSubmit={handleSubmit} className="space-y-8">

                                {/* Context Fields (Workspace & Creator) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-800/50">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Briefcase size={14} /> Workspace Destino
                                        </label>
                                        <div className="relative">
                                            <select
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none cursor-pointer hover:bg-slate-900 transition-colors"
                                                value={activeWorkspaceId || ""}
                                                onChange={(e) => setActiveWorkspaceId(e.target.value)}
                                            >
                                                {workspaces.map(ws => (
                                                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                ▼
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <User size={14} /> Creador
                                        </label>
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-slate-400 cursor-not-allowed flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                                                {currentUser?.email?.[0].toUpperCase() || "U"}
                                            </div>
                                            <span className="truncate">{currentUser?.email || "Usuario Actual"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Title & Description */}
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título de la Idea</label>
                                        <input
                                            required
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-lg text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                                            placeholder="Ej: Automatización de Reportes Q3"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción del Concepto</label>
                                        <textarea
                                            required
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none h-32 resize-none leading-relaxed"
                                            placeholder="Describe el objetivo, el problema a resolver y el impacto esperado..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <LinkIcon size={14} /> URL de Referencia (Opcional)
                                        </label>
                                        <input
                                            type="url"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                                            placeholder="https://ejemplo.com/inspiracion"
                                            value={sourceUrl}
                                            onChange={(e) => setSourceUrl(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                                    {/* Priority Slider */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                <Target size={14} /> Prioridad Inicial - {priority}
                                            </label>
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                                                priority >= 8 ? 'bg-red-500/20 text-red-400' : priority >= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                                            )}>
                                                {priority >= 8 ? "Crítica" : priority >= 5 ? "Media" : "Baja"}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            step="1"
                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                            value={priority}
                                            onChange={(e) => setPriority(parseInt(e.target.value))}
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                                            <span>1</span>
                                            <span>5</span>
                                            <span>10</span>
                                        </div>
                                    </div>

                                    {/* Effort Selector */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Zap size={14} /> Esfuerzo Estimado
                                        </label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((lvl) => (
                                                <button
                                                    key={lvl}
                                                    type="button"
                                                    onClick={() => setEffort(lvl)}
                                                    className={cn(
                                                        "flex-1 h-10 rounded-lg flex items-center justify-center transition-all border",
                                                        effort >= lvl
                                                            ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-500"
                                                            : "bg-slate-800 border-slate-700 text-slate-600 hover:bg-slate-700"
                                                    )}
                                                >
                                                    <Zap size={16} className={effort >= lvl ? "fill-yellow-500" : ""} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Notes & Dates */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Calendar size={14} /> Fecha Objetivo de Inicio
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]} // Prevent past dates
                                        />
                                        <p className="text-[10px] text-slate-500">
                                            Fecha estimada para promover esta idea a proyecto activo.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 flex gap-3 text-xs text-blue-200/70">
                                    <Info className="shrink-0 text-blue-400" size={16} />
                                    <p>
                                        <strong className="text-blue-300">Sobre la Madurez:</strong> Toda nueva idea comienza con 0% de madurez. Podrás aumentar este porcentaje a medida que completes checklists y recibas feedback en la etapa de incubación.
                                    </p>
                                </div>

                            </form>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-800 bg-slate-950/30 flex justify-end gap-4 shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                form="idea-form"
                                type="submit"
                                disabled={loading}
                                className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                Crear Semilla
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
