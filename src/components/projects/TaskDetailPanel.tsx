"use client";

import React, { useState, useEffect, useRef } from "react";
import { Document, TaskHistory } from "@/types/supabase";
import { supabaseClient } from "@/lib/supabase";
import {
    X, CheckCircle2, Paperclip, Link as LinkIcon, Clock, DollarSign, Tag, User,
    Bold, Italic, List, CheckSquare, Code, Plus, ExternalLink, Smile, AtSign, ChevronDown,
    Send, Loader2, MessageSquare, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DateBadge } from "@/components/ui/date-badge";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskDetailPanelProps {
    task: Document | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (taskId: string, updates: Partial<Document>) => Promise<void>;
    projectName?: string;
}

// --- Components ---

const CustomSelect = ({ value, onChange, options, icon: Icon, label, className }: any) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find((o: any) => o.value === value);
    const selectedLabel = selectedOption?.label || "Seleccionar...";
    const selectedColor = selectedOption?.color;

    return (
        <div className="space-y-1 relative" ref={ref}>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                {Icon && <Icon size={10} />} {label}
            </label>
            <div
                onClick={() => setOpen(!open)}
                className={cn(
                    "w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 transition-colors",
                    className
                )}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedColor && <div className={cn("w-2 h-2 rounded-full", selectedColor)} />}
                    <span>{selectedLabel}</span>
                </div>
                <ChevronDown size={12} className="text-slate-500" />
            </div>
            {open && (
                <div className="absolute top-full left-0 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                    {options.map((opt: any) => (
                        <div
                            key={opt.value}
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 cursor-pointer hover:text-white flex items-center gap-2"
                        >
                            {opt.color && <div className={cn("w-2 h-2 rounded-full", opt.color)} />}
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export function TaskDetailPanel({ task, isOpen, onClose, onSave, projectName }: TaskDetailPanelProps) {
    // --- State ---
    const [title, setTitle] = useState("");
    const [status, setStatus] = useState("");
    const [startDate, setStartDate] = useState<string | null>(null);
    const [dueDate, setDueDate] = useState<string | null>(null);
    const [content, setContent] = useState("");

    // Metadata State
    const [estimatedHours, setEstimatedHours] = useState<number | string>("");
    const [cost, setCost] = useState<number | string>("");
    const [activityType, setActivityType] = useState("");
    const [assignee, setAssignee] = useState<{ name: string, color?: string }>({ name: "Sin Asignar" });
    const [attachments, setAttachments] = useState<any[]>([]);

    // UI & Logic State
    const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');
    const [activeTab, setActiveTab] = useState<'description' | 'activity'>('description');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Attachments UI
    const [showAddLink, setShowAddLink] = useState(false);
    const [newLinkUrl, setNewLinkUrl] = useState("");
    const [newLinkName, setNewLinkName] = useState("");

    // Activity Feed State
    const [history, setHistory] = useState<TaskHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [newComment, setNewComment] = useState("");

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // --- Initialization ---
    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setContent(task.content || "");
            setStatus(task.category);
            setStartDate(task.start_date || null);
            setDueDate(task.due_date || null);

            const meta = task.metadata as any || {};
            setEstimatedHours(meta.custom_fields?.estimated_hours || "");
            setCost(meta.custom_fields?.cost || "");
            setActivityType(meta.custom_fields?.activity_type || "");

            if (meta.assignee) setAssignee(meta.assignee);
            else if (task.user_id && task.user_id !== '00000000-0000-0000-0000-000000000000') setAssignee({ name: "Miguel", color: "bg-indigo-500" });
            else setAssignee({ name: "Sin Asignar", color: "bg-slate-600" });

            setAttachments(meta.attachments || []);
            setLastSaved(null);

            // Fetch History
            fetchHistory(task.id);
        }
    }, [task]);

    // --- History Logic ---
    const fetchHistory = async (taskId: string) => {
        setLoadingHistory(true);
        const { data, error } = await supabaseClient
            .from('task_history')
            .select('*')
            .eq('task_id', taskId)
            .order('changed_at', { ascending: false });

        if (!error && data) {
            setHistory(data as TaskHistory[]);
        }
        setLoadingHistory(false);
    };

    const logActivity = async (changes: Partial<TaskHistory>) => {
        if (!task) return;
        const entry = {
            task_id: task.id,
            task_type: 'document',
            workspace_id: task.workspace_id,
            changed_by: 'Yo', // Replace with real user info if available
            changed_at: new Date().toISOString(),
            ...changes
        };

        // Optimistic update
        setHistory(prev => [entry as TaskHistory, ...prev]);

        await supabaseClient.from('task_history').insert([entry]);
    };

    const handleSendComment = async () => {
        if (!newComment.trim()) return;
        await logActivity({
            previous_status: 'COMMENT',
            new_status: 'COMMENT',
            details: newComment
        });
        setNewComment("");
    };

    // --- Persistence Logic ---

    // Clean Helper to construct the full update object
    const buildUpdates = (overrides: any = {}) => {
        return {
            title,
            content,
            category: status as any,
            start_date: startDate,
            due_date: dueDate,
            metadata: {
                ...(task?.metadata as any),
                assignee,
                attachments,
                custom_fields: {
                    estimated_hours: Number(estimatedHours) || 0,
                    cost: Number(cost) || 0,
                    activity_type: activityType
                }
            },
            ...overrides
        };
    };

    // Robust Save Function
    const saveTask = async (overrides: any = {}, trackActivity = false) => {
        if (!task) return;
        setIsSaving(true);
        try {
            const updates = buildUpdates(overrides);

            // Allow merging overrides into metadata if needed (Deep merge for custom_fields)
            if (overrides.metadata) {
                const mergedCustom = {
                    ...(updates.metadata.custom_fields || {}),
                    ...(overrides.metadata.custom_fields || {})
                };
                updates.metadata = {
                    ...updates.metadata,
                    ...overrides.metadata,
                    custom_fields: mergedCustom
                };
            }

            await onSave(task.id, updates);
            setLastSaved(new Date());

            // --- Auto-Logging ---

            const oldMeta = (task.metadata as any) || {};
            const newMeta = updates.metadata;

            // 1. Status Change
            if (overrides.category && overrides.category !== task.category) {
                logActivity({ previous_status: task.category, new_status: overrides.category, details: "cambió el estado" });
            }

            // 2. Assignee Change
            const oldName = oldMeta?.assignee?.name;
            const newName = newMeta?.assignee?.name;
            if (newName && newName !== oldName) {
                logActivity({ previous_status: "assignee", new_status: "assigned", details: `asignó a ${newName}` });
            }

            // 3. Metadata Fields (Hours, Cost, Activity)
            const valHours = Number(estimatedHours) || 0;
            const oldHours = Number(oldMeta.custom_fields?.estimated_hours) || 0;
            if (valHours !== oldHours) {
                logActivity({ previous_status: "hours", new_status: "updated", details: `actualizó horas a ${valHours}h` });
            }

            const valCost = Number(cost) || 0;
            const oldCost = Number(oldMeta.custom_fields?.cost) || 0;
            if (valCost !== oldCost) {
                logActivity({ previous_status: "cost", new_status: "updated", details: `actualizó costo a $${valCost}` });
            }

            if (updates.metadata.custom_fields.activity_type !== oldMeta.custom_fields?.activity_type) {
                logActivity({ previous_status: "type", new_status: "updated", details: `cambió actividad a ${updates.metadata.custom_fields.activity_type}` });
            }

        } catch (e) {
            console.error("Save failed", e);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-Save for simple inputs (debounced or onBlur)
    const handleBlur = () => {
        // Save current state
        saveTask();
    };

    // Immediate Save for complex controls
    const handleValueChange = (field: string, val: any) => {
        // Update Local State first for UI response
        if (field === 'status') setStatus(val);
        if (field === 'dueDate') setDueDate(val);
        if (field === 'hours') setEstimatedHours(val);

        // Trigger Save with Override
        const overrides: any = {};
        if (field === 'status') overrides.category = val;
        if (field === 'dueDate') overrides.due_date = val;

        saveTask(overrides, field === 'status');
    };

    // Tools
    const insertMarkdown = (syntax: string) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = content;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        let newText = "";
        switch (syntax) {
            case 'bold': newText = `${before}**${selection || 'txt'}**${after}`; break;
            case 'italic': newText = `${before}_${selection || 'txt'}_${after}`; break;
            case 'list': newText = `${before}\n- ${selection}${after}`; break;
            case 'todo': newText = `${before}\n- [ ] ${selection}${after}`; break;
            case 'code': newText = `${before}\`\`\`\n${selection}\n\`\`\`${after}`; break;
            default: return;
        }
        setContent(newText);
        setTimeout(() => textareaRef.current?.focus(), 0);
    };

    // Attachment Logic
    const handleAddAttachment = () => {
        if (!newLinkUrl) return;
        const newAtt = { name: newLinkName || newLinkUrl, url: newLinkUrl, type: 'link', date: new Date().toISOString() };
        const updatedAtts = [...attachments, newAtt];
        setAttachments(updatedAtts);
        setNewLinkName("");
        setNewLinkUrl("");
        setShowAddLink(false);

        // Save with new attachments
        saveTask({ metadata: { attachments: updatedAtts } });
        logActivity({ previous_status: 'attachment', new_status: 'added', details: `adjuntó ${newAtt.name}` });
    };

    // Assignee Logic
    const handleChangeAssignee = () => {
        const name = prompt("Nuevo Responsable:", assignee.name);
        if (name && name !== assignee.name) {
            const newAssignee = { name, color: "bg-emerald-500" };
            setAssignee(newAssignee);
            // Force save
            saveTask({ metadata: { assignee: newAssignee } }, true);
        }
    };

    if (!isOpen || !task) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
                    />
                    <motion.div
                        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed top-0 right-0 h-full w-full md:w-[700px] bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                    <span className="hover:text-slate-300 cursor-pointer transition-colors max-w-[150px] truncate">{projectName || "Proyecto"}</span>
                                    <ChevronRight size={12} />
                                    <span className="text-slate-400 font-mono tracking-wider">ID: {task.id.slice(0, 4)}</span>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">TÍTULO</label>
                                    <input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        onBlur={handleBlur}
                                        className="w-full bg-transparent text-lg font-bold text-white placeholder-slate-600 border-none focus:ring-0 focus:outline-none p-0"
                                        placeholder="Nombre de la tarea"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 ml-4 self-start mt-2">
                                {isSaving ? (
                                    <span className="text-xs text-slate-500 animate-pulse flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Guardando...</span>
                                ) : lastSaved && (
                                    <span className="text-xs text-slate-600 flex items-center gap-1"><CheckCircle2 size={12} /> Guardado</span>
                                )}
                                <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <div className="px-6 py-6 space-y-8">

                                {/* Meta Grid Overhaul */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Assignee */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Responsable</label>
                                        <div
                                            onClick={handleChangeAssignee}
                                            className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg p-2 cursor-pointer transition-colors group"
                                        >
                                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0", assignee.color)}>
                                                {assignee.name.charAt(0)}
                                            </div>
                                            <span className="text-sm text-slate-200 truncate flex-1">{assignee.name}</span>
                                        </div>
                                    </div>

                                    {/* Due Date */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Vencimiento</label>
                                        <DateBadge
                                            date={dueDate}
                                            onChange={(d) => handleValueChange('dueDate', d)}
                                            className="w-full justify-between bg-slate-800/50 hover:bg-slate-800 border-slate-700/50 text-slate-200 py-2.5 h-auto"
                                        />
                                    </div>

                                    {/* Status */}
                                    <CustomSelect
                                        label="Estado"
                                        value={status}
                                        onChange={(v: string) => handleValueChange('status', v)}
                                        options={[
                                            { value: "En Progreso", label: "En Progreso", color: "bg-amber-500" },
                                            { value: "Investigación", label: "Investigación", color: "bg-blue-500" },
                                            { value: "Finalizado", label: "Finalizado", color: "bg-emerald-500" }
                                        ]}
                                    />
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-950/40 rounded-xl border border-slate-800/50">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                                            <Clock size={10} /> Horas Est.
                                        </label>
                                        <input
                                            type="number"
                                            value={estimatedHours}
                                            onChange={(e) => setEstimatedHours(e.target.value)}
                                            onBlur={() => saveTask()}
                                            placeholder="--"
                                            className="w-full bg-transparent text-sm text-slate-300 focus:outline-none font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                                            <DollarSign size={10} /> Costo
                                        </label>
                                        <input
                                            type="number"
                                            value={cost}
                                            onChange={(e) => setCost(e.target.value)}
                                            onBlur={() => saveTask()}
                                            placeholder="--"
                                            className="w-full bg-transparent text-sm text-slate-300 focus:outline-none font-mono"
                                        />
                                    </div>
                                    <CustomSelect
                                        label="Actividad"
                                        icon={Tag}
                                        value={activityType}
                                        className="bg-transparent border-0 p-0 text-slate-300 h-6"
                                        onChange={(v: string) => {
                                            setActivityType(v);
                                            saveTask({ metadata: { custom_fields: { activity_type: v } } });
                                        }}
                                        options={[
                                            { value: "Ventas", label: "Ventas" },
                                            { value: "Técnico", label: "Técnico" },
                                            { value: "Estudio", label: "Estudio" },
                                            { value: "Gestión", label: "Gestión" }
                                        ]}
                                    />
                                </div>

                                {/* Tabs & Content */}
                                <div>
                                    <div className="flex items-center gap-6 border-b border-slate-800 mb-4">
                                        <button onClick={() => setActiveTab('description')} className={cn("text-sm font-medium pb-2 border-b-2 transition-colors", activeTab === 'description' ? "text-indigo-400 border-indigo-400" : "text-slate-500 border-transparent hover:text-slate-300")}>Descripción</button>
                                        <button onClick={() => setActiveTab('activity')} className={cn("text-sm font-medium pb-2 border-b-2 transition-colors", activeTab === 'activity' ? "text-indigo-400 border-indigo-400" : "text-slate-500 border-transparent hover:text-slate-300")}>Actividad</button>
                                    </div>

                                    {activeTab === 'description' ? (
                                        <div className="space-y-4">
                                            {/* Toolbar */}
                                            {editorMode === 'write' && (
                                                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-t-lg p-1.5 border-b-0">
                                                    <button onClick={() => insertMarkdown('bold')} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Negrita"><Bold size={14} /></button>
                                                    <button onClick={() => insertMarkdown('italic')} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Cursiva"><Italic size={14} /></button>
                                                    <div className="w-px h-4 bg-slate-800 mx-1" />
                                                    <button onClick={() => insertMarkdown('list')} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Lista"><List size={14} /></button>
                                                    <button onClick={() => insertMarkdown('todo')} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Checklist"><CheckSquare size={14} /></button>
                                                    <button onClick={() => insertMarkdown('code')} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Código"><Code size={14} /></button>
                                                    <div className="flex-1" />
                                                    <button onClick={() => setEditorMode('preview')} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300 hover:bg-slate-700">Ver Vista Previa</button>
                                                </div>
                                            )}
                                            {editorMode === 'preview' && (
                                                <div className="flex justify-end mb-2">
                                                    <button onClick={() => setEditorMode('write')} className="text-[10px] bg-indigo-600 px-2 py-1 rounded text-white hover:bg-indigo-500">Volver a Editar</button>
                                                </div>
                                            )}

                                            {/* Editor Area */}
                                            {editorMode === 'write' ? (
                                                <textarea
                                                    ref={textareaRef}
                                                    value={content}
                                                    onChange={(e) => setContent(e.target.value)}
                                                    onBlur={handleBlur}
                                                    className="w-full h-[300px] bg-slate-950/50 border border-slate-800 rounded-b-lg rounded-tl-none p-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 resize-none font-mono leading-relaxed"
                                                    placeholder="Escribe la descripción en Markdown..."
                                                />
                                            ) : (
                                                <div className="prose prose-invert max-w-none text-sm bg-slate-950/30 p-4 rounded-lg min-h-[300px] border border-slate-800/50">
                                                    <ReactMarkdown>{content || "*Sin descripción*"}</ReactMarkdown>
                                                </div>
                                            )}

                                            {/* Attachments Section */}
                                            <div className="pt-4 border-t border-slate-800">
                                                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3 flex items-center justify-between">
                                                    <span className="flex items-center gap-1"><Paperclip size={12} /> Archivos y Enlaces</span>
                                                    <button onClick={() => setShowAddLink(!showAddLink)} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                                        <Plus size={12} /> Añadir
                                                    </button>
                                                </label>

                                                {showAddLink && (
                                                    <div className="mb-4 bg-slate-900 p-3 rounded-lg border border-slate-700 space-y-2">
                                                        <input
                                                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                                            placeholder="Nombre (ej: Diseño Figma)"
                                                            value={newLinkName}
                                                            onChange={e => setNewLinkName(e.target.value)}
                                                        />
                                                        <input
                                                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                                            placeholder="URL (ej: https://...)"
                                                            value={newLinkUrl}
                                                            onChange={e => setNewLinkUrl(e.target.value)}
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setShowAddLink(false)} className="text-xs text-slate-500 hover:text-white">Cancelar</button>
                                                            <button onClick={handleAddAttachment} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded">Guardar</button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    {attachments.length === 0 ? (
                                                        <div className="text-xs text-slate-600 italic">No hay adjuntos.</div>
                                                    ) : (
                                                        attachments.map((att, i) => (
                                                            <div key={i} className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg group">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <LinkIcon size={12} className="text-indigo-500 flex-shrink-0" />
                                                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-300 hover:text-white hover:underline truncate underline-offset-2">
                                                                        {att.name}
                                                                    </a>
                                                                </div>
                                                                <ExternalLink size={10} className="text-slate-600 opacity-0 group-hover:opacity-100" />
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Comment Input */}
                                            <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 space-y-3">
                                                <textarea
                                                    value={newComment}
                                                    onChange={e => setNewComment(e.target.value)}
                                                    placeholder="Escribe un comentario..."
                                                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none resize-none h-20"
                                                />
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                                                    <div className="flex gap-1">
                                                        <button className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400"><Smile size={14} /></button>
                                                        <button className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400"><AtSign size={14} /></button>
                                                    </div>
                                                    <button
                                                        onClick={handleSendComment}
                                                        disabled={!newComment.trim()}
                                                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded font-medium hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        Comentar <Send size={12} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Feed */}
                                            <div className="relative pl-4 border-l border-slate-800 space-y-6 pt-4">
                                                {loadingHistory ? (
                                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                                        <Loader2 size={12} className="animate-spin" /> Cargando actividad...
                                                    </div>
                                                ) : history.length === 0 ? (
                                                    <div className="text-xs text-slate-600 italic">No hay actividad reciente.</div>
                                                ) : (
                                                    history.map((h, i) => (
                                                        <div key={h.id || i} className="relative group">
                                                            <div className={cn(
                                                                "absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-slate-900",
                                                                h.task_type === 'document' ? "bg-slate-600" : "bg-indigo-500" // Simple differentiation
                                                            )}></div>
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1 uppercase tracking-wide">
                                                                <span>{h.changed_by}</span>
                                                                <span>•</span>
                                                                <span>{formatDistanceToNow(new Date(h.changed_at), { addSuffix: true, locale: es })}</span>
                                                            </div>

                                                            {h.previous_status === 'COMMENT' || h.previous_status === 'comment' ? (
                                                                <div className="text-sm text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800">
                                                                    <div className="prose prose-invert prose-sm max-w-none">
                                                                        <ReactMarkdown>{h.details || ""}</ReactMarkdown>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm text-slate-300">
                                                                    {h.details ? (
                                                                        <span>{h.details}</span>
                                                                    ) : (
                                                                        <span>
                                                                            Cambió estado de <span className="text-slate-400">{h.previous_status}</span> a <span className="text-emerald-400 font-medium">{h.new_status}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
