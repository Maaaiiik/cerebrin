"use client";

import React, { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Document } from "@/types/supabase";
import { Loader2, Plus, Target, AlertCircle } from "lucide-react";
import { TaskItem } from "./TaskItem";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ProjectListViewProps {
    project: Document;
}

export function ProjectListView({ project }: ProjectListViewProps) {
    const [tasks, setTasks] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [showArchived, setShowArchived] = useState(false); // Archive Filter

    // Detail Panel State
    const [selectedTask, setSelectedTask] = useState<Document | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [taskUpdateCallback, setTaskUpdateCallback] = useState<((task: Document) => void) | null>(null);

    useEffect(() => {
        fetchTasks();
    }, [project.id]);

    const fetchTasks = async () => {
        setLoading(true);
        const { data, error } = await supabaseClient
            .from("documents")
            .select("*")
            .eq("workspace_id", project.workspace_id)
            .eq("parent_id", project.id)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching tasks:", error);
        } else {
            setTasks(data || []);
        }
        setLoading(false);
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        setIsAdding(true);

        try {
            // 1. Calculate New Weights (Auto-Distribution)
            const activeTasks = tasks.filter(t => !t.is_archived);
            const currentCount = activeTasks.length;
            const newCount = currentCount + 1;
            const newWeight = Math.floor(100 / newCount);

            // Update existing siblings
            if (currentCount > 0) {
                const batchUpdates = activeTasks.map(t => ({
                    id: t.id,
                    metadata: {
                        ...(t.metadata as any),
                        weight: newWeight
                    }
                }));

                await fetch('/api/docs/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates: batchUpdates })
                });
            }

            // Use API to create task (bypasses RLS if user session is missing in client)
            const response = await fetch('/api/docs/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTaskTitle,
                    content: "",
                    category: "En Progreso",
                    type: "task",
                    workspace_id: project.workspace_id,
                    parent_id: project.id,
                    // Send a placeholder or null, let API handle fallback
                    user_id: "00000000-0000-0000-0000-000000000000",
                    metadata: {
                        weight: newWeight,
                        progress: 0,
                        project_id: project.id // Traceability
                    }
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to create task");
            }

            // Refresh all tasks to get updated weights
            fetchTasks();

            setNewTaskTitle("");
        } catch (error: any) {
            console.error("Error creating task:", error);
            alert("Error al crear la tarea: " + error.message);
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdateTask = (updatedTask: Document) => {
        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("¿Archivar esta tarea?")) return;

        try {
            await supabaseClient
                .from("documents")
                .update({ is_archived: true })
                .eq("id", taskId);

            // Soft delete locally
            setTasks(tasks.map(t => t.id === taskId ? { ...t, is_archived: true } : t));
        } catch (e) {
            console.error("Failed to archive:", e);
        }
    };

    const handleTaskDetailClick = (task: Document, onSaved: (updated: Document) => void) => {
        setSelectedTask(task);
        setTaskUpdateCallback(() => onSaved); // Store the callback 
        setIsPanelOpen(true);
    };

    const handleSaveTaskDetail = async (taskId: string, updates: Partial<Document>) => {
        try {
            // Perform API Update
            const response = await fetch('/api/docs/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: [{ id: taskId, ...updates }] })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.updated && result.updated.length > 0) {
                    const updatedDoc = result.updated[0];

                    // 1. Update Top Level List (if applicable)
                    setTasks(prev => prev.map(t => t.id === taskId ? updatedDoc : t));

                    // 2. Trigger Callback to update deep node
                    if (taskUpdateCallback) {
                        taskUpdateCallback(updatedDoc);
                    }

                    // 3. Update selected task to reflect changes in UI immediately
                    setSelectedTask(updatedDoc);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Calculate Progress and Weights based on ACTIVE tasks
    const activeTasks = tasks.filter(t => !t.is_archived);
    const totalWeight = activeTasks.reduce((sum, t) => sum + ((t.metadata as any)?.weight || 0), 0);
    const weightedProgress = activeTasks.reduce((sum, t) => {
        const weight = (t.metadata as any)?.weight || 0;
        const progress = (t.metadata as any)?.progress || 0;
        return sum + (progress * weight);
    }, 0);

    const projectProgress = totalWeight > 0 ? (weightedProgress / totalWeight) : 0;

    // Filters for Display
    const displayedTasks = tasks.filter(t => showArchived ? t.is_archived : !t.is_archived);

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header / Archive Toggle */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={cn(
                        "text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-2",
                        showArchived
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "text-slate-500 hover:bg-slate-800"
                    )}
                >
                    <span>🗑️ {showArchived ? "Ocultar Papelera" : "Ver Papelera"}</span>
                </button>
            </div>

            {/* Progress Summary (Hidden if viewing archive) */}
            {!showArchived && (
                <div className="bg-slate-900/50 rounded-xl p-6 mb-8 border border-slate-800 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                            <Target className="text-emerald-500" />
                            Progreso del Proyecto
                        </h3>
                        <span className="text-2xl font-bold text-emerald-400 font-mono">
                            {projectProgress.toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${projectProgress}%` }}
                            className="h-full bg-emerald-500 rounded-full"
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                    </div>
                    {totalWeight !== 100 && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-amber-500">
                            <AlertCircle size={12} />
                            <span>La suma de pesos es {totalWeight}% (Ideal: 100%)</span>
                        </div>
                    )}
                </div>
            )}

            {/* Add Task Input */}
            {!showArchived && (
                <form onSubmit={handleAddTask} className="mb-8 flex gap-4">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Nueva Tarea Principal..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                    />
                    <button
                        type="submit"
                        disabled={isAdding || !newTaskTitle.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAdding ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                        {isAdding ? "Creando..." : "Agregar Tarea"}
                    </button>
                </form>
            )}

            {/* Tasks List */}
            <div className="space-y-4">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2">
                    <div className="col-span-4">Tarea / Subtareas</div>
                    <div className="col-span-2 text-center">Peso (%)</div>
                    <div className="col-span-2 text-center">Progreso</div>
                    <div className="col-span-2 text-center">Fechas</div>
                    <div className="col-span-2 text-right">Acciones</div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-slate-600" />
                    </div>
                ) : displayedTasks.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 italic">
                        {showArchived ? "Papelera vacía." : "No hay tareas definidas."}
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {displayedTasks.map((task, index) => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                onUpdate={handleUpdateTask}
                                onDelete={handleDeleteTask}
                                level={0}
                                wbsNumber={String(index + 1)}
                                rootProjectId={project.id}
                                onDetailClick={handleTaskDetailClick}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>

            <TaskDetailPanel
                task={selectedTask}
                isOpen={isPanelOpen}
                onClose={() => { setIsPanelOpen(false); setSelectedTask(null); }}
                onSave={handleSaveTaskDetail}
                projectName={project.title}
            />
        </div>
    );
}
