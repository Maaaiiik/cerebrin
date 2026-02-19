"use client";

import React, { useState } from "react";
import { Plus, Trash2, Save, ArrowLeft, Loader2, GripVertical, AlertCircle } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion, Reorder } from "framer-motion";

interface TemplateStep {
    title: string;
    category: 'Investigación' | 'En Progreso' | 'Finalizado';
    weight: number;
    delay_days: number;
    description: string;
}

interface TemplateFormProps {
    onClose: () => void;
    onSaved: () => void;
    initialData?: any;
}

export function TemplateForm({ onClose, onSaved, initialData }: TemplateFormProps) {
    const { activeWorkspaceId } = useWorkspace();
    const [name, setName] = useState(initialData?.name || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [steps, setSteps] = useState<TemplateStep[]>(initialData?.steps || []);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // New Step State
    const [newStepTitle, setNewStepTitle] = useState("");
    const [newStepCategory, setNewStepCategory] = useState<'Investigación' | 'En Progreso'>("Investigación");
    const [newStepDays, setNewStepDays] = useState(0);

    const handleAddStep = () => {
        if (!newStepTitle.trim()) return;
        setSteps([
            ...steps,
            {
                title: newStepTitle,
                category: newStepCategory,
                weight: 0, // Will be auto-calculated or manually adjusted
                delay_days: newStepDays,
                description: ""
            }
        ]);
        setNewStepTitle("");
        setNewStepDays(0);
    };

    const handleRemoveStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const handleReorder = (newOrder: TemplateStep[]) => {
        // Framer Motion Reorder
        setSteps(newOrder);
    };

    const equalizeWeights = () => {
        if (steps.length === 0) return;
        const w = Math.floor(100 / steps.length);
        const remainder = 100 - (w * steps.length);
        const newSteps = steps.map((s, i) => ({
            ...s,
            weight: i === 0 ? w + remainder : w
        }));
        setSteps(newSteps);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return setError("El nombre es obligatorio");
        if (steps.length === 0) return setError("Debe tener al menos un paso");

        const totalWeight = steps.reduce((a, b) => a + Number(b.weight), 0);
        if (Math.abs(totalWeight - 100) > 1) {
            return setError(`La suma de pesos debe ser 100% (Actual: ${totalWeight}%)`);
        }

        setIsSaving(true);
        setError(null);

        try {
            const { error: dbError } = await supabaseClient
                .from("process_templates")
                .insert({
                    name,
                    description,
                    steps,
                    workspace_id: activeWorkspaceId,
                    created_by: (await supabaseClient.auth.getUser()).data.user?.id
                });

            if (dbError) throw dbError;

            onSaved();
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold font-mono text-white">
                        {initialData ? "Editar Plantilla" : "Nueva Plantilla de Proceso"}
                    </h2>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                    Guardar
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-500/10 border-b border-red-500/20 p-3 text-red-400 text-sm flex items-center gap-2 justify-center">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Nombre del Proceso</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ej: Despliegue ERP Estándar"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Descripción</label>
                        <input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Breve descripción..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 focus:border-indigo-500 outline-none"
                        />
                    </div>
                </div>

                {/* Steps Builder */}
                <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-slate-300">Pasos del Proceso ({steps.length})</h3>
                        <button
                            type="button"
                            onClick={equalizeWeights}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                            <GripVertical size={12} /> Equilibrar Pesos
                        </button>
                    </div>

                    {/* Step List */}
                    <Reorder.Group axis="y" values={steps} onReorder={setSteps} className="space-y-3 mb-6">
                        {steps.map((step, index) => (
                            <Reorder.Item key={step.title + index} value={step}>
                                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center gap-4 group hover:border-slate-700 transition-colors">
                                    <div className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400">
                                        <GripVertical size={16} />
                                    </div>

                                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                        {/* Title */}
                                        <div className="col-span-6">
                                            <input
                                                value={step.title}
                                                onChange={(e) => {
                                                    const newSteps = [...steps];
                                                    newSteps[index].title = e.target.value;
                                                    setSteps(newSteps);
                                                }}
                                                className="bg-transparent border-none text-sm font-medium text-slate-200 w-full focus:ring-0 px-0"
                                            />
                                        </div>

                                        {/* Category */}
                                        <div className="col-span-3">
                                            <select
                                                value={step.category}
                                                onChange={(e) => {
                                                    const newSteps = [...steps];
                                                    newSteps[index].category = e.target.value as any;
                                                    setSteps(newSteps);
                                                }}
                                                className="bg-slate-900 border border-slate-700 rounded text-xs px-2 py-1 text-slate-400 w-full"
                                            >
                                                <option>Investigación</option>
                                                <option>En Progreso</option>
                                                <option>Finalizado</option>
                                            </select>
                                        </div>

                                        {/* Weight */}
                                        <div className="col-span-2 flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="0" max="100"
                                                value={step.weight}
                                                onChange={(e) => {
                                                    const newSteps = [...steps];
                                                    newSteps[index].weight = Number(e.target.value);
                                                    setSteps(newSteps);
                                                }}
                                                className="w-12 bg-slate-900 border border-slate-700 rounded text-xs px-1 text-center text-slate-400"
                                            />
                                            <span className="text-xs text-slate-600">%</span>
                                        </div>

                                        {/* Delete */}
                                        <div className="col-span-1 text-right">
                                            <button
                                                onClick={() => handleRemoveStep(index)}
                                                className="text-slate-600 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>

                    {/* Add Step Input */}
                    <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg dashed border border-slate-800 border-dashed">
                        <Plus size={16} className="text-slate-500" />
                        <input
                            placeholder="Nuevo paso..."
                            value={newStepTitle}
                            onChange={e => setNewStepTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddStep()}
                            className="bg-transparent border-none text-sm w-full focus:outline-none text-white placeholder:text-slate-600"
                        />
                        <select
                            value={newStepCategory}
                            onChange={e => setNewStepCategory(e.target.value as any)}
                            className="bg-slate-950 border border-slate-800 rounded text-xs px-2 py-1 text-slate-400"
                        >
                            <option>Investigación</option>
                            <option>En Progreso</option>
                        </select>
                        <button
                            onClick={handleAddStep}
                            disabled={!newStepTitle.trim()}
                            className="bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded text-xs font-bold hover:bg-indigo-600/30 disabled:opacity-50"
                        >
                            Agregar
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
