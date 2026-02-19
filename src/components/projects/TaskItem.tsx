"use client";

import React, { useState, useEffect } from "react";
import { Document } from "@/types/supabase";
import { supabaseClient } from "@/lib/supabase";
import { ChevronRight, ChevronDown, Trash2, Plus, Save, Loader2, Edit2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { DateBadge } from "@/components/ui/date-badge";

interface TaskItemProps {
    task: Document;
    onUpdate?: (task: Document) => void;
    onDelete?: (taskId: string) => void;
    onDetailClick?: (task: Document, onSaved: (updated: Document) => void) => void;
    level: number;
    wbsNumber: string;
    rootProjectId: string;
}

export function TaskItem({ task, onUpdate, onDelete, onDetailClick, level, wbsNumber, rootProjectId }: TaskItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [subtasks, setSubtasks] = useState<Document[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);

    // Local State for inputs (Auto-save/Blur)
    const [localWeight, setLocalWeight] = useState((task.metadata as any)?.weight || 0);
    const [localProgress, setLocalProgress] = useState((task.metadata as any)?.progress || 0);
    const [editTitle, setEditTitle] = useState(task.title);
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    // New Subtask State
    const [showAddSub, setShowAddSub] = useState(false);
    const [newSubTitle, setNewSubTitle] = useState("");
    const [addingSub, setAddingSub] = useState(false);

    // Sync props to state
    useEffect(() => {
        setLocalWeight((task.metadata as any)?.weight || 0);
        setLocalProgress((task.metadata as any)?.progress || 0);
        setEditTitle(task.title);
    }, [task]);

    // Load Subtasks when expanded
    useEffect(() => {
        if (isExpanded && subtasks.length === 0) {
            fetchSubtasks();
        }
    }, [isExpanded]);

    const fetchSubtasks = async () => {
        setLoadingSubs(true);
        const { data, error } = await supabaseClient
            .from("documents")
            .select("*")
            .eq("parent_id", task.id)
            .order("created_at", { ascending: true });

        if (!error) setSubtasks(data || []);
        setLoadingSubs(false);
    };

    // Callback when Detail Panel saves changes to THIS task
    const handlePanelSave = (updated: Document) => {
        // Sync local state
        if ((updated.metadata as any)?.weight !== undefined) setLocalWeight((updated.metadata as any).weight);
        if ((updated.metadata as any)?.progress !== undefined) setLocalProgress((updated.metadata as any).progress);
        if (updated.title) setEditTitle(updated.title);

        // Notify parent to bubble up changes (e.g. progress recalc)
        onUpdate?.(updated);
    };

    const saveField = async (field: 'weight' | 'progress' | 'title' | 'start_date' | 'due_date', value: any) => {
        // Update Local State
        if (field === 'weight') setLocalWeight(value);
        if (field === 'progress') setLocalProgress(value);
        if (field === 'title') setEditTitle(value);

        // Prepare Update
        const currentMeta = task.metadata as any || {};
        const payload: any = { id: task.id };

        if (field === 'weight') payload.metadata = { ...currentMeta, weight: Number(value) };
        if (field === 'progress') payload.metadata = { ...currentMeta, progress: Number(value) };
        if (field === 'title') payload.title = value;
        if (field === 'start_date') payload.start_date = value || null;
        if (field === 'due_date') payload.due_date = value || null;

        try {
            const response = await fetch('/api/docs/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: [payload] })
            });

            if (!response.ok) {
                console.error("Failed to update task");
                return;
            }

            const result = await response.json();

            if (result.updated && result.updated.length > 0) {
                onUpdate?.(result.updated[0]);
                if (field === 'title') setIsEditingTitle(false);
            }
        } catch (error) {
            console.error("Save error:", error);
        }
    };

    const handleAddSubtask = async () => {
        if (!newSubTitle.trim()) return;
        setAddingSub(true);
        try {
            // 1. Calculate New Weights (Auto-Distribution)
            const currentCount = subtasks.length;
            const newCount = currentCount + 1;
            const newWeight = Math.floor(100 / newCount);

            // Update Sibling Weights via API
            if (currentCount > 0) {
                const batchUpdates = subtasks.map(sub => ({
                    id: sub.id,
                    metadata: {
                        ...(sub.metadata as any),
                        weight: newWeight
                    }
                }));

                await fetch('/api/docs/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates: batchUpdates })
                });
            }

            // 2. Create New Subtask
            const response = await fetch('/api/docs/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newSubTitle,
                    content: "",
                    category: "En Progreso",
                    type: "task",
                    workspace_id: task.workspace_id,
                    parent_id: task.id,
                    user_id: "00000000-0000-0000-0000-000000000000",
                    metadata: {
                        weight: newWeight,
                        progress: 0,
                        project_id: rootProjectId
                    }
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            // Refetch to get updated siblings
            fetchSubtasks();

            setNewSubTitle("");
            setShowAddSub(false);
            setIsExpanded(true);

        } catch (e: any) {
            console.error(e);
            alert("Error al agregar subtarea: " + e.message);
        } finally {
            setAddingSub(false);
        }
    };

    const handleChildUpdate = (updatedChild: Document) => {
        const newSubtasks = subtasks.map(s => s.id === updatedChild.id ? updatedChild : s);
        setSubtasks(newSubtasks);
        calculateAndSaveProgress(newSubtasks);
    };

    const handleChildDelete = async (childId: string) => {
        await supabaseClient.from("documents").delete().eq("id", childId);
        const newSubtasks = subtasks.filter(s => s.id !== childId);
        setSubtasks(newSubtasks);
        calculateAndSaveProgress(newSubtasks);
    };

    const calculateAndSaveProgress = async (currentSubtasks: Document[]) => {
        const totalWeightedProgress = currentSubtasks.reduce((sum, child) => {
            const w = (child.metadata as any)?.weight || 0;
            const p = (child.metadata as any)?.progress || 0;
            return sum + (p * w);
        }, 0);

        const myNewProgress = Math.min(100, totalWeightedProgress / 100);
        saveField('progress', myNewProgress);
    };

    const myProgress = (task.metadata as any)?.progress || 0;
    const isLeaf = subtasks.length === 0 && !loadingSubs;
    const weightsSum = subtasks.reduce((sum, s) => sum + ((s.metadata as any)?.weight || 0), 0);
    const isUnbalanced = isExpanded && subtasks.length > 0 && Math.abs(weightsSum - 100) > 1;

    return (
        <motion.div layout loading="lazy" className="relative">
            <div className={cn(
                "grid grid-cols-12 gap-2 items-center bg-slate-900/50 hover:bg-slate-800 border-b border-slate-800/50 p-3 rounded-lg transition-colors group",
                level > 0 && "ml-4 border-l-2 border-l-slate-800"
            )}>
                {/* Title & Chevron */}
                <div className="col-span-4 flex items-center gap-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-slate-700 rounded text-slate-500"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <span className="text-xs font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                        {wbsNumber}
                    </span>

                    {isEditingTitle ? (
                        <div className="flex gap-1 flex-1">
                            <input
                                autoFocus
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white w-full"
                            />
                            <button onClick={() => saveField('title', editTitle)} className="p-1 bg-emerald-600 rounded text-white"><Save size={14} /></button>
                        </div>
                    ) : (
                        <span
                            className="font-medium text-slate-200 truncate cursor-pointer hover:text-indigo-400 group-hover/title:underline"
                            onClick={() => onDetailClick?.(task, handlePanelSave)}
                        >
                            {task.title}
                        </span>
                    )}
                </div>

                {/* Weight */}
                <div className="col-span-2 text-center text-sm">
                    <div className="flex items-center justify-center gap-1 group/weight relative">
                        <input
                            type="number"
                            min="0" max="100"
                            value={localWeight}
                            onChange={e => setLocalWeight(Number(e.target.value))}
                            onBlur={() => saveField('weight', localWeight)}
                            className="w-12 bg-transparent hover:bg-slate-950 border border-transparent hover:border-slate-700 rounded px-1 text-center text-xs text-slate-400 hover:text-white transition-all focus:bg-slate-950 focus:border-indigo-500 focus:outline-none"
                        />
                        <span className="text-slate-500">%</span>
                    </div>
                </div>

                {/* Progress */}
                <div className="col-span-2 text-center">
                    {isLeaf ? (
                        <div className="flex items-center justify-center gap-1">
                            <input
                                type="number"
                                min="0" max="100"
                                value={Math.round(localProgress)}
                                onChange={e => setLocalProgress(Number(e.target.value))}
                                onBlur={() => saveField('progress', localProgress)}
                                className="w-12 bg-transparent hover:bg-slate-950 border border-transparent hover:border-slate-700 rounded px-1 text-center text-emerald-400 hover:text-emerald-300 font-mono text-xs focus:bg-slate-950 focus:border-emerald-500 focus:outline-none"
                            />
                            <span className="text-slate-500">%</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center group/prog" title={`Calculated from ${subtasks.length} subtasks`}>
                            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden mb-1">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${myProgress}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-emerald-400 font-mono">{myProgress.toFixed(0)}%</span>
                        </div>
                    )}
                </div>

                {/* Dates (New Column) */}
                <div className="col-span-2 flex flex-col justify-center text-[10px] text-slate-500 gap-0.5">
                    <div className="flex items-center gap-1 group/date">
                        <span className="w-8 text-right text-slate-600">Inicio:</span>
                        <DateBadge
                            date={task.start_date}
                            onChange={(d) => saveField('start_date', d)}
                            placeholder="Inicio"
                            className="w-full justify-start border-none px-0 py-0 h-auto text-slate-400 hover:text-slate-200"
                        />
                    </div>
                    <div className="flex items-center gap-1 group/date">
                        <span className="w-8 text-right text-slate-600">Fin:</span>
                        <DateBadge
                            date={task.due_date}
                            onChange={(d) => saveField('due_date', d)}
                            placeholder="Término"
                            className="w-full justify-start border-none px-0 py-0 h-auto text-slate-400 hover:text-slate-200"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onDetailClick?.(task, handlePanelSave)} className="p-1.5 hover:bg-slate-700 text-slate-400 rounded" title="Detalles">
                        <Edit2 size={14} />
                    </button>
                    <button onClick={() => setShowAddSub(!showAddSub)} className="p-1.5 hover:bg-indigo-500/20 text-indigo-400 rounded" title="Agregar Subtarea">
                        <Plus size={14} />
                    </button>
                    <button onClick={() => onDelete?.(task.id)} className="p-1.5 hover:bg-red-500/20 text-red-500 rounded" title="Eliminar">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Subtasks Container */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        {/* Imbalance Alert */}
                        {isUnbalanced && (
                            <div className={cn("ml-8 mb-2 flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-1 rounded w-fit", level > 0 && "ml-12")}>
                                <AlertCircle size={10} />
                                <span>Total pesos: {weightsSum}% (Ajustar a 100)</span>
                            </div>
                        )}

                        {loadingSubs && (
                            <div className="pl-8 py-2 text-xs text-slate-500 flex items-center gap-2">
                                <Loader2 className="animate-spin" size={12} /> Cargando subtareas...
                            </div>
                        )}

                        {subtasks.map((sub, index) => (
                            <TaskItem
                                key={sub.id}
                                task={sub}
                                level={level + 1}
                                wbsNumber={`${wbsNumber}.${index + 1}`}
                                rootProjectId={rootProjectId}
                                onUpdate={handleChildUpdate}
                                onDelete={handleChildDelete}
                                onDetailClick={onDetailClick}
                            />
                        ))}

                        {/* Quick Add Input */}
                        {showAddSub && (
                            <div className={cn("ml-4 pl-4 py-2 border-l-2 border-slate-800 flex items-center gap-2", level > 0 && "ml-8")}>
                                <div className="text-xs font-mono text-slate-600 px-2">
                                    {wbsNumber}.{subtasks.length + 1}
                                </div>
                                <input
                                    autoFocus
                                    placeholder="Nombre de subtarea..."
                                    value={newSubTitle}
                                    onChange={e => setNewSubTitle(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask() }}
                                    className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm flex-1"
                                />
                                <button
                                    onClick={handleAddSubtask}
                                    disabled={addingSub}
                                    className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500 disabled:opacity-50"
                                >
                                    Agregar
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
