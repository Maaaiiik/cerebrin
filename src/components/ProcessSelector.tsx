"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Play, Loader2, FileCog, Settings } from "lucide-react";
import { ProcessTemplate, Document } from "@/types/supabase";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ProcessSelectorProps {
    workspaceId: string;
    onProcessStarted?: () => void;
}

export function ProcessSelector({ workspaceId, onProcessStarted }: ProcessSelectorProps) {
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        const { data, error } = await supabaseClient
            .from("process_templates")
            .select("*")
            .order("name");

        if (!error && data) {
            setTemplates(data);
        }
        setLoadingTemplates(false);
    };

    const handleRunProcess = async (template: ProcessTemplate) => {
        const steps = (template.steps as any[]) || [];
        if (!confirm(`¿Iniciar proceso "${template.name}"? Esto creará ${steps.length} tareas.`)) return;

        setLoading(true);
        try {
            // 1. Create Parent Container Task (Project)
            const { data: parentDoc, error: parentError } = await supabaseClient
                .from("documents")
                .insert({
                    title: `Proyecto: ${template.name} - ${new Date().toLocaleDateString()}`,
                    content: template.description || "Contenedor del proceso automático.",
                    category: "Investigación",
                    workspace_id: workspaceId,
                    tags: ["proyecto", "auto-generated", "template-instance"],
                    priority_score: 10
                })
                .select()
                .single();

            if (parentError) throw parentError;

            // 2. Prepare subtasks
            const tasksToInsert = steps.map((t: any) => {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + (t.delay_days || 0));

                return {
                    title: t.title,
                    content: `Generado por plantilla: ${template.name}`,
                    category: t.category || "Investigación",
                    workspace_id: workspaceId,
                    parent_id: parentDoc.id, // Link to parent
                    due_date: dueDate.toISOString(),
                    priority_score: t.estimated_effort ? t.estimated_effort * 2 : 5, // Map 1-5 to 2-10
                    tags: ["subtarea", "template-step"],
                    estimated_days: t.delay_days || 1 // Store delay info
                };
            });

            if (tasksToInsert.length > 0) {
                // 3. Bulk Insert
                const { error: bulkError } = await supabaseClient
                    .from("documents")
                    .insert(tasksToInsert);

                if (bulkError) throw bulkError;
            }

            // 4. Log Activity
            await supabaseClient.from("activity_feed").insert({
                action_type: "process_started",
                description: `Iniciado proceso: ${template.name} con ${steps.length} tareas.`,
                workspace_id: workspaceId,
                metadata: { template_id: template.id, project_id: parentDoc.id }
            });

            alert("Proceso iniciado correctamente.");
            setIsOpen(false);
            if (onProcessStarted) onProcessStarted();

        } catch (error: any) {
            console.error("Error running process:", error);
            alert("Error al iniciar proceso: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
                <FileCog size={16} />
                <span>Nuevo desde Plantilla</span>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-2 py-2 border-b border-slate-800 mb-2 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-200">Plantillas Disponibles</h3>
                        <Link href="/settings/templates" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                            <Settings size={12} /> Gestionar
                        </Link>
                    </div>

                    <div className="space-y-1 max-h-64 overflow-y-auto">
                        {loadingTemplates ? (
                            <div className="text-center py-4 text-slate-500">
                                <Loader2 size={16} className="animate-spin mx-auto mb-2" />
                                Cargando...
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="text-center py-4 text-slate-500 text-xs">
                                No hay plantillas. <br />
                                <Link href="/settings/templates" className="text-indigo-400 underline">Crear una</Link>
                            </div>
                        ) : (
                            templates.map(tpl => (
                                <button
                                    key={tpl.id}
                                    onClick={() => handleRunProcess(tpl)}
                                    disabled={loading}
                                    className="w-full text-left p-3 rounded-lg hover:bg-slate-800 transition-colors group relative"
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-indigo-400">{tpl.name}</span>
                                        {loading ? <Loader2 size={14} className="animate-spin text-slate-500" /> : <Play size={14} className="text-slate-600 group-hover:text-indigo-500" />}
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-1">{tpl.description}</p>
                                    <span className="text-[10px] text-slate-600">{(tpl.steps as any[])?.length || 0} pasos</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Overlay to close */}
            {isOpen && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
            )}
        </div>
    );
}
