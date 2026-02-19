"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { ProcessTemplate } from "@/types/supabase";
import { Plus, Trash2, Save, ArrowLeft, Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<Partial<ProcessTemplate> | null>(null);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        const { data, error } = await supabaseClient
            .from("process_templates")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching templates:", error);
        } else {
            setTemplates(data || []);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!editingTemplate?.name) return alert("El nombre es requerido");
        setSaving(true);

        try {
            if (editingTemplate.id) {
                // Update
                const { error } = await supabaseClient
                    .from("process_templates")
                    .update({
                        name: editingTemplate.name,
                        description: editingTemplate.description,
                        steps: editingTemplate.steps
                    })
                    .eq("id", editingTemplate.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabaseClient
                    .from("process_templates")
                    .insert({
                        name: editingTemplate.name,
                        description: editingTemplate.description,
                        steps: editingTemplate.steps || []
                    });
                if (error) throw error;
            }
            setEditingTemplate(null);
            fetchTemplates();
        } catch (error: any) {
            alert("Error saving: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar plantilla?")) return;
        const { error } = await supabaseClient.from("process_templates").delete().eq("id", id);
        if (error) alert("Error deleting: " + error.message);
        else fetchTemplates();
    };

    // Sub-component for editing steps
    const StepEditor = ({ steps, onChange }: { steps: any[], onChange: (s: any[]) => void }) => {
        const addStep = () => {
            onChange([...steps, { title: "Nueva Tarea", category: "Investigación", estimated_effort: 3, delay_days: 0 }]);
        };

        const updateStep = (index: number, field: string, value: any) => {
            const newSteps = [...steps];
            newSteps[index] = { ...newSteps[index], [field]: value };
            onChange(newSteps);
        };

        const removeStep = (index: number) => {
            onChange(steps.filter((_, i) => i !== index));
        };

        return (
            <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-300">Pasos del Proceso ({steps.length})</h3>
                    <button
                        onClick={addStep}
                        className="text-xs flex items-center gap-1 bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded hover:bg-indigo-500/30"
                    >
                        <Plus size={12} /> Agregar Paso
                    </button>
                </div>
                <div className="space-y-2">
                    {steps.map((step, i) => (
                        <div key={i} className="flex gap-2 items-start bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200"
                                        placeholder="Título de la tarea"
                                        value={step.title}
                                        onChange={(e) => updateStep(i, "title", e.target.value)}
                                    />
                                    <select
                                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200"
                                        value={step.category}
                                        onChange={(e) => updateStep(i, "category", e.target.value)}
                                    >
                                        <option value="Investigación">Investigación</option>
                                        <option value="En Progreso">En Progreso</option>
                                        <option value="Finalizado">Finalizado</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <label className="text-xs text-slate-500">Esfuerzo (1-5):</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="5"
                                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200"
                                        value={step.estimated_effort}
                                        onChange={(e) => updateStep(i, "estimated_effort", parseInt(e.target.value))}
                                    />
                                    <label className="text-xs text-slate-500 ml-2">Días despues (Offset):</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200"
                                        value={step.delay_days}
                                        onChange={(e) => updateStep(i, "delay_days", parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                            <button onClick={() => removeStep(i)} className="text-slate-500 hover:text-red-400 p-1">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (editingTemplate) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <button
                    onClick={() => setEditingTemplate(null)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft size={16} /> Volver a la lista
                </button>

                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">
                            {editingTemplate.id ? "Editar Plantilla" : "Nueva Plantilla"}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
                                <input
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    value={editingTemplate.name || ""}
                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Descripción</label>
                                <textarea
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none h-24"
                                    value={editingTemplate.description || ""}
                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                                />
                            </div>

                            <StepEditor
                                steps={(editingTemplate.steps as any[]) || []}
                                onChange={(steps) => setEditingTemplate({ ...editingTemplate, steps })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                        <button
                            onClick={() => setEditingTemplate(null)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            {saving && <Loader2 size={16} className="animate-spin" />}
                            Guardar Plantilla
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Plantillas de Procesos</h1>
                    <p className="text-slate-400 mt-1">Estandariza tus flujos de trabajo</p>
                </div>
                <button
                    onClick={() => setEditingTemplate({ steps: [] })}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus size={18} />
                    <span>Nueva Plantilla</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="text-slate-500">Cargando plantillas...</div>
                ) : templates.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed text-slate-500">
                        No hay plantillas creadas.
                    </div>
                ) : (
                    templates.map((tpl) => (
                        <div key={tpl.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-lg text-slate-200 group-hover:text-indigo-400 transition-colors">{tpl.name}</h3>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setEditingTemplate(tpl)}
                                        className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg"
                                    >
                                        <Play size={14} className="rotate-90" /> {/* Edit Icon placeholder */}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(tpl.id)}
                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm mb-4 line-clamp-2 min-h-[40px]">{tpl.description}</p>

                            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-800">
                                <span>{(tpl.steps as any[])?.length || 0} pasos</span>
                                <span className="font-mono">JSON</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
