"use client";

import React, { useState, useEffect } from "react";
import { Document, AttachmentMap } from "@/types/supabase";
import { supabaseClient } from "@/lib/supabase";
import { X, Plus, CheckSquare, Square, Calendar, Tag, Link as LinkIcon, FileText, GitCommit, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CardDetailModalProps {
    document: Document;
    isOpen: boolean;
    onClose: () => void;
}

export function CardDetailModal({ document, isOpen, onClose }: CardDetailModalProps) {
    const [activeTab, setActiveTab] = useState<'details' | 'attachments'>('details');
    const [subtasks, setSubtasks] = useState<Document[]>([]);
    const [attachments, setAttachments] = useState<any[]>([]); // To type properly with joins
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && document.id) {
            fetchSubtasks();
            fetchAttachments();
        }
    }, [isOpen, document.id]);

    const fetchSubtasks = async () => {
        setLoading(true);
        const { data, error } = await supabaseClient
            .from("documents")
            .select("*")
            .eq("parent_id", document.id)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching subtasks:", error);
        } else {
            setSubtasks((data as Document[]) || []);
        }
        setLoading(false);
    };

    const fetchAttachments = async () => {
        // Fetch attachments mapped to this document (source_id = document.id)
        const { data, error } = await supabaseClient
            .from("attachments_map")
            .select(`
                *,
                target_document:documents!target_id (*)
            `)
            .eq("source_id", document.id);

        if (error) console.error("Error fetching attachments:", error);
        else setAttachments(data || []);
    };

    const handleAddSubtask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;

        try {
            const { data, error } = await supabaseClient
                .from("documents")
                .insert({
                    title: newSubtaskTitle,
                    content: "Subtarea generada manualmente",
                    workspace_id: document.workspace_id,
                    parent_id: document.id,
                    category: "Investigación",
                    tags: ["subtarea"]
                })
                .select()
                .single();

            if (error) throw error;

            setSubtasks([...subtasks, data as Document]);
            setNewSubtaskTitle("");
        } catch (error) {
            console.error("Error creating subtask:", error);
        }
    };

    const toggleSubtaskStatus = async (subtask: Document) => {
        const newStatus = subtask.category === "Finalizado" ? "Investigación" : "Finalizado";
        setSubtasks(subtasks.map(t =>
            t.id === subtask.id ? { ...t, category: newStatus } : t
        ));

        const { error } = await supabaseClient
            .from("documents")
            .update({ category: newStatus })
            .eq("id", subtask.id);

        if (error) {
            console.error("Error updating subtask:", error);
            fetchSubtasks();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-950/50">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border",
                                document.category === "Finalizado" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            )}>
                                {document.category}
                            </span>
                            {document.due_date && (
                                <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700">
                                    <Calendar size={10} />
                                    {format(new Date(document.due_date), "dd MMM", { locale: es })}
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-slate-100 leading-tight">{document.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 px-6 gap-6">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={cn(
                            "py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'details' ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
                        )}
                    >
                        Detalles y Subtareas
                    </button>
                    <button
                        onClick={() => setActiveTab('attachments')}
                        className={cn(
                            "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                            activeTab === 'attachments' ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <Paperclip size={14} />
                        Archivos y Links ({attachments.length})
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">

                    {activeTab === 'details' && (
                        <>
                            {/* Description */}
                            <div>
                                <h3 className="text-xs uppercase font-bold text-slate-500 mb-2">Descripción</h3>
                                <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/50 text-slate-300 text-sm leading-relaxed">
                                    {document.content || "Sin descripción detallada."}
                                </div>
                            </div>

                            {/* Subtasks */}
                            <div>
                                <h3 className="text-xs uppercase font-bold text-slate-500 mb-3 flex items-center justify-between">
                                    <span>Subtareas ({subtasks.length})</span>
                                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                        {subtasks.filter(t => t.category === "Finalizado").length} / {subtasks.length} completadas
                                    </span>
                                </h3>
                                <div className="space-y-2 mb-4">
                                    {subtasks.length === 0 && !loading && (
                                        <p className="text-sm text-slate-600 italic">No hay subtareas aún.</p>
                                    )}
                                    {subtasks.map(subtask => (
                                        <div
                                            key={subtask.id}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer group select-none",
                                                subtask.category === "Finalizado"
                                                    ? "bg-slate-900/30 border-slate-800 opacity-60"
                                                    : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50"
                                            )}
                                            onClick={() => toggleSubtaskStatus(subtask)}
                                        >
                                            <div className={cn(
                                                "shrink-0 transition-colors",
                                                subtask.category === "Finalizado" ? "text-emerald-500" : "text-slate-500 group-hover:text-slate-400"
                                            )}>
                                                {subtask.category === "Finalizado" ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </div>
                                            <span className={cn(
                                                "text-sm flex-1",
                                                subtask.category === "Finalizado" ? "text-slate-500 line-through" : "text-slate-300"
                                            )}>
                                                {subtask.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={handleAddSubtask} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newSubtaskTitle}
                                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                        placeholder="Añadir nueva subtarea..."
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newSubtaskTitle.trim()}
                                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </form>
                            </div>
                        </>
                    )}

                    {activeTab === 'attachments' && (
                        <div className="space-y-4">
                            <h3 className="text-xs uppercase font-bold text-slate-500 mb-2">Documentos Vinculados</h3>

                            {attachments.length === 0 && (
                                <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                                    <p className="text-slate-500 text-sm mb-2">No hay documentos adjuntos.</p>
                                    <button className="text-indigo-400 text-xs hover:underline flex items-center justify-center gap-1 mx-auto">
                                        <Plus size={12} />
                                        Vincular Documento Existente
                                    </button>
                                </div>
                            )}

                            <div className="space-y-2">
                                {attachments.map(att => (
                                    <div key={att.id} className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-800 rounded-md text-slate-400">
                                                {(att.target_document as any)?.type === 'link' ? <LinkIcon size={16} /> : <FileText size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-200">{(att.target_document as any)?.title || "Documento desconocido"}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                                        {(att.target_document as any)?.type === 'link' ? 'Enlace' : 'Markdown'}
                                                    </span>
                                                    {att.target_version_id && (
                                                        <span className="text-[10px] text-amber-500 flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                            <GitCommit size={10} />
                                                            Pinned v{att.target_version_id.slice(0, 4)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Metadata Footer */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800/50">
                        {document.tags?.map(tag => (
                            <span key={tag} className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded-full border border-slate-800">
                                <Tag size={10} />
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
