"use client";

import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabaseClient } from "@/lib/supabase";
import { Plus, LayoutTemplate, Loader2, Edit2, Trash2 } from "lucide-react";
import { TemplateForm } from "@/components/templates/TemplateForm";

export default function TemplatesPage() {
    const { activeWorkspaceId } = useWorkspace();
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchTemplates();
        }
    }, [activeWorkspaceId]);

    const fetchTemplates = async () => {
        setLoading(true);
        const { data } = await supabaseClient
            .from("process_templates")
            .select("*")
            .eq("workspace_id", activeWorkspaceId)
            .order("created_at", { ascending: false });

        setTemplates(data || []);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta plantilla?")) return;
        await supabaseClient.from("process_templates").delete().eq("id", id);
        fetchTemplates();
    };

    if (isCreating || editingTemplate) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-950">
                <TemplateForm
                    onClose={() => { setIsCreating(false); setEditingTemplate(null); }}
                    onSaved={() => { setIsCreating(false); setEditingTemplate(null); fetchTemplates(); }}
                    initialData={editingTemplate}
                />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen text-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <LayoutTemplate className="text-indigo-500" />
                        Gestor de Plantillas
                    </h1>
                    <p className="text-slate-500 mt-1">Define procesos estándar para reutilizar en tus proyectos.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
                >
                    <Plus size={20} /> Nueva Plantilla
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-600" size={32} /></div>
            ) : templates.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 dashed border-dashed">
                    <LayoutTemplate className="mx-auto text-slate-700 mb-4" size={48} />
                    <h3 className="text-lg font-medium text-slate-400">No hay plantillas creadas</h3>
                    <p className="text-slate-600 mb-6 max-w-md mx-auto">Comienza creando una plantilla para estandarizar tus flujos de trabajo repetitivos.</p>
                    <button onClick={() => setIsCreating(true)} className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
                        Crear mi primera plantilla
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <div key={template.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 group hover:border-indigo-500/50 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-indigo-400">
                                    <LayoutTemplate size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingTemplate(template)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(template.id)} className="p-1.5 hover:bg-red-900/30 rounded text-slate-400 hover:text-red-400">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-bold text-lg mb-1">{template.name}</h3>
                            <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">{template.description || "Sin descripción"}</p>

                            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
                                <span>{template.steps?.length || 0} Pasos</span>
                                <span>{new Date(template.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
