"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { KanbanItem } from "@/types/supabase";
import { cn } from "@/lib/utils";
import { Calendar, Tag, GitMerge, Lightbulb, FileText, Link as LinkIcon, Folder, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CardProps {
    item: KanbanItem;
    onClick?: (item: KanbanItem) => void;
    onApprove?: (item: KanbanItem) => void;
    onReject?: (item: KanbanItem) => void;
    onArchive?: (item: KanbanItem) => void;
}

export function Card({ item, onClick, onApprove, onReject, onArchive }: CardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item.id,
        data: { item },
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
    } : undefined;

    const isPending = item.tags?.includes('pending_approval');

    const getIcon = () => {
        if (item.type === 'idea') return <Lightbulb size={16} className="text-amber-400" />;
        if (item.doc_type === 'link') return <LinkIcon size={16} className="text-sky-400" />;
        if (item.parent_id) return <CheckSquare size={16} className="text-emerald-400" />; // Task
        return <Folder size={16} className="text-blue-400" />; // Project/Doc
    };

    const getTypeColor = () => {
        if (isPending) return "border-yellow-500/80 shadow-[0_0_15px_-3px_rgba(234,179,8,0.3)]";

        switch (item.status) {
            case "Finalizado": return "border-emerald-500/20";
            case "En Progreso": return "border-blue-500/20";
            default: return "border-slate-700/50";
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => onClick?.(item)}
            className={cn(
                "bg-slate-900 mb-3 p-4 rounded-xl border transition-all hover:border-slate-600 hover:shadow-lg hover:-translate-y-0.5 group relative select-none",
                getTypeColor(),
                isDragging && "opacity-50 grayscale rotate-2 scale-95 z-50",
                isPending && "animate-pulse"
            )}
        >
            {/* Header / Type */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-950/50 rounded-md border border-slate-800">
                        {getIcon()}
                    </div>
                    {item.type === 'idea' && (
                        <span className="text-[10px] uppercase font-bold text-amber-500/80 tracking-wider">Idea</span>
                    )}
                    {item.doc_type === 'link' && (
                        <span className="text-[10px] uppercase font-bold text-sky-500/80 tracking-wider">Link</span>
                    )}
                </div>
                {item.priority && (
                    <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        item.priority > 7 ? "bg-red-500" : item.priority > 4 ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                )}
            </div>

            {/* Title */}
            <h4 className="text-slate-200 font-medium text-sm leading-snug mb-2 line-clamp-2 pr-6">
                {item.title}
            </h4>

            {/* Archive Button (Absolute Top-Right, hidden by default) */}
            <button
                className="absolute top-2 right-2 p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all"
                onClick={(e) => {
                    e.stopPropagation();
                    onArchive?.(item);
                }}
                title="Archivar"
            >
                <Trash2 size={14} />
            </button>

            {/* Pending Approval Controls */}
            {isPending && (
                <div className="mb-3 flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-300">
                    <button
                        className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-[10px] font-bold py-1 px-2 rounded border border-green-500/20 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation(); // Stop DND/Modal
                            onApprove?.(item);
                        }}
                        onPointerDown={(e) => e.stopPropagation()} // Prevent Drag
                    >
                        APROBAR
                    </button>
                    <button
                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold py-1 px-2 rounded border border-red-500/20 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onReject?.(item);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        RECHAZAR
                    </button>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                <div className="flex items-center gap-2">
                    {item.due_date && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Calendar size={10} />
                            {format(new Date(item.due_date), "dd MMM", { locale: es })}
                        </span>
                    )}
                </div>

                {(item.type === 'document' && !item.parent_id) && (
                    <div className="flex items-center gap-0.5 text-slate-600">
                        <GitMerge size={12} />
                    </div>
                )}
            </div>
        </div>
    );
}
