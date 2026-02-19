"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Loader2, Plus, X, Zap, Target, Calendar, Briefcase, User, Layers, FileText } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";

interface ProjectFormProps {
    onSuccess?: () => void;
}

export function ProjectForm({ onSuccess }: ProjectFormProps) {
    const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Form State
    // Task State
    const [tasks, setTasks] = useState<{ title: string; weight: number }[]>([
        { title: "Planificación Inicial", weight: 10 },
        { title: "Ejecución", weight: 80 },
        { title: "Cierre y Entrega", weight: 10 }
    ]);
    const [newTask, setNewTask] = useState("");

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabaseClient.auth.getUser();
            setCurrentUser(user);
        };
        getUser();
    }, []);

    const addTask = () => {
        if (!newTask.trim()) return;
        setTasks([...tasks, { title: newTask, weight: 0 }]); // Default weight 0, user adjusts later or auto-distribute?
        setNewTask("");
    };

    const removeTask = (index: number) => {
        setTasks(tasks.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeWorkspaceId) return alert("Selecciona un workspace primero.");

        setLoading(true);
        try {
            // 1. Insert Project Document
            const { data: projectData, error: projectError } = await supabaseClient
                .from("documents")
                .insert({
                    title,
                    content: description,
                    type: "project",
                    workspace_id: activeWorkspaceId,
                    parent_id: null, // Root level
                    user_id: currentUser?.id,
                    is_archived: false,
                    metadata: {
                        priority,
                        status: "active",
                        start_date: startDate || new Date().toISOString(),
                        progress: 0,
                        owner_email: currentUser?.email,
                        category: "Proyectos"
                    }
                })
                .select()
                .single();

            if (projectError) throw projectError;

            // 2. Insert Initial Tasks
            if (tasks.length > 0) {
                const tasksToInsert = tasks.map((t, index) => ({
                    title: t.title,
                    content: "Tarea inicial del proyecto",
                    type: "task",
                    workspace_id: activeWorkspaceId,
                    parent_id: projectData.id, // Linked to new project
                    user_id: currentUser?.id,
                    metadata: {
                        status: "todo",
                        priority: 5,
                        weight: t.weight,
                        progress: 0,
                        order: index
                    }
                }));

                const { error: tasksError } = await supabaseClient
                    .from("documents")
                    .insert(tasksToInsert);

                if (tasksError) console.error("Error creating initial tasks:", tasksError);
            }

            // 3. Log Creation History
            await supabaseClient.from("task_history").insert({
                task_id: projectData.id,
                task_type: "document",
                previous_status: "none",
                new_status: "created",
                changed_by: currentUser?.email || "user",
                changed_at: new Date().toISOString(),
                details: `Proyecto creado con ${tasks.length} tareas iniciales`,
                workspace_id: activeWorkspaceId
            });

            // Reset
            setTitle("");
            setDescription("");
            setPriority(5);
            setStartDate("");
            setTasks([
                { title: "Planificación Inicial", weight: 10 },
                { title: "Ejecución", weight: 80 },
                { title: "Cierre y Entrega", weight: 10 }
            ]);
            setIsOpen(false);
            if (onSuccess) onSuccess();

        } catch (error: any) {
            console.error("Error creating project:", error);
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
            >
                <Plus size={18} />
                <span>Nuevo Proyecto</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh]">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Layers className="text-emerald-500" size={24} />
                                    Nuevo Proyecto
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">Inicia un nuevo esfuerzo estructurado.</p>
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
                            <form id="project-form" onSubmit={handleSubmit} className="space-y-8">

                                {/* Context Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-800/50">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Briefcase size={14} /> Workspace
                                        </label>
                                        <div className="relative">
                                            <select
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none cursor-pointer hover:bg-slate-900 transition-colors"
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
                                            <User size={14} /> Lider del Proyecto
                                        </label>
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-slate-400 cursor-not-allowed flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                                                {currentUser?.email?.[0].toUpperCase() || "U"}
                                            </div>
                                            <span className="truncate">{currentUser?.email || "Usuario Actual"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Title & Description */}
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Proyecto</label>
                                        <input
                                            required
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-lg text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all outline-none"
                                            placeholder="Ej: Implementación ERP Fase 1"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción y Objetivos</label>
                                        <textarea
                                            required
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all outline-none h-32 resize-none leading-relaxed"
                                            placeholder="Define el alcance, los entregables principales y el propósito del proyecto..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Initial Tasks / Deliverables */}
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                        <span className="flex items-center gap-2"><Layers size={14} /> Entregables / Tareas Iniciales</span>
                                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full">{tasks.length} items</span>
                                    </label>

                                    <div className="bg-slate-950/50 rounded-2xl border border-slate-800/50 p-4 space-y-3">
                                        {tasks.map((task, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800 group">
                                                <div className="w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center text-xs text-slate-500 font-mono">
                                                    {idx + 1}
                                                </div>
                                                <input
                                                    className="bg-transparent border-none text-sm text-slate-300 w-full focus:ring-0 placeholder:text-slate-600"
                                                    value={task.title}
                                                    onChange={(e) => {
                                                        const newTasks = [...tasks];
                                                        newTasks[idx].title = e.target.value;
                                                        setTasks(newTasks);
                                                    }}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-600 font-mono whitespace-nowrap">Weight:</span>
                                                    <input
                                                        type="number"
                                                        className="w-12 bg-slate-950 border border-slate-800 rounded px-1 text-center text-xs text-slate-400"
                                                        value={task.weight}
                                                        onChange={(e) => {
                                                            const newTasks = [...tasks];
                                                            newTasks[idx].weight = parseInt(e.target.value) || 0;
                                                            setTasks(newTasks);
                                                        }}
                                                    />
                                                    <span className="text-[10px] text-slate-600 font-mono">%</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTask(idx)}
                                                    className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}

                                        <div className="flex gap-2 mt-2">
                                            <input
                                                className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                                                placeholder="Añadir nueva tarea o hito..."
                                                value={newTask}
                                                onChange={(e) => setNewTask(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                                            />
                                            <button
                                                type="button"
                                                onClick={addTask}
                                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 rounded-xl font-medium transition-colors"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                                    {/* Priority Slider */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                <Target size={14} /> Prioridad - {priority}
                                            </label>
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                                                priority >= 8 ? 'bg-red-500/20 text-red-400' : priority >= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                                            )}>
                                                {priority >= 8 ? "Alta" : priority >= 5 ? "Media" : "Baja"}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            step="1"
                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                            value={priority}
                                            onChange={(e) => setPriority(parseInt(e.target.value))}
                                        />
                                    </div>

                                    {/* Start Date */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Calendar size={14} /> Fecha de Inicio
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all text-sm"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 flex gap-3 text-xs text-emerald-200/70">
                                    <FileText className="shrink-0 text-emerald-400" size={16} />
                                    <p>
                                        <strong className="text-emerald-300">Siguientes Pasos:</strong> Una vez creado el proyecto, podrás añadir tareas, hitos y documentos desde el tablero de gestión.
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
                                form="project-form"
                                type="submit"
                                disabled={loading}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Layers size={18} />}
                                Crear Proyecto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
