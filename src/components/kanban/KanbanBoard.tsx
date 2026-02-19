"use client";

import React, { useState, useEffect } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import { supabaseClient } from "@/lib/supabase";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Document } from "@/types/supabase";
import { Column } from "./Column";
import { Card } from "./Card";
import { CardDetailModal } from "./CardDetailModal";
import { createPortal } from "react-dom";
import { useKanbanData } from "@/hooks/useKanbanData";
import { KanbanItem } from "@/types/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Filter, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
    // No props needed for now, as it fetches its own data based on context
}

const COLUMNS = ["Investigación", "En Progreso", "Finalizado"];

export function KanbanBoard({ }: KanbanBoardProps) {
    // State is now an array of strings. Empty array [] means "ALL".
    const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);

    // Pass the array directly to the hook
    const { items: kanbanItems, refresh, loading, setItems } = useKanbanData(selectedWorkspaceIds);

    // Global context for list of workspaces
    const { workspaces } = useWorkspace();

    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<KanbanItem | null>(null);

    const [showArchived, setShowArchived] = useState(false);

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const toggleWorkspace = (id: string) => {
        setSelectedWorkspaceIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(wId => wId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) { setActiveId(null); return; }

        const activeId = active.id as string;
        const overId = over.id as string;
        const activeItem = kanbanItems.find(i => i.id === activeId);

        if (!activeItem) return;

        // Determine New Status
        let newStatus = activeItem.status;
        if (COLUMNS.includes(overId as any)) {
            newStatus = overId;
        } else {
            const overItem = kanbanItems.find(i => i.id === overId);
            if (overItem) newStatus = overItem.status;
        }

        if (activeItem.status !== newStatus) {
            setActiveId(null);

            // OPTIMISTIC UPDATE: Update UI immediately
            const previousItems = [...kanbanItems];

            // @ts-ignore - setItems is exposed from useKanbanData
            setItems(prev => prev.map(item =>
                item.id === activeId ? { ...item, status: newStatus } : item
            ));

            try {

                // Call API Route to handle the move (Bypasses RLS)
                const response = await fetch('/api/documents/move', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: activeId,
                        newStatus: newStatus,
                        type: activeItem.type,
                        userId: 'user-bypass',
                        workspaceId: activeItem.workspace_id,
                        previousStatus: activeItem.status
                    })
                });

                if (!response.ok) {
                    throw new Error("API Update Failed");
                }

            } catch (error) {
                console.error("Move failed:", error);
                alert("Error al mover el item.");
                // Revert optimistic update
                // @ts-ignore
                setItems(previousItems);
                refresh();
            }
        }
    };

    const handleArchive = async (item: KanbanItem) => {
        if (!confirm(`¿Archivar "${item.title}"?`)) return;

        try {
            if (item.type === 'document') {
                const { error } = await supabaseClient
                    .from('documents')
                    .update({ is_archived: true })
                    .eq('id', item.id);
                if (error) throw error;
            } else if (item.type === 'idea') {
                const { error } = await supabaseClient
                    .from('idea_pipeline')
                    .update({ status: 'discarded' })
                    .eq('id', item.id);
                if (error) throw error;
            }
            refresh();
        } catch (error: any) {
            console.error("Archive failed:", error);
            alert("Error al archivar");
        }
    };

    // Supervision Handlers
    const handleApprove = async (item: KanbanItem) => {
        if (item.type === 'document') {
            const newTags = item.tags?.filter(t => t !== 'pending_approval') || [];
            const { error } = await supabaseClient
                .from('documents')
                .update({ tags: newTags })
                .eq('id', item.id);

            if (error) alert("Error al aprobar");
            else refresh();
        }
    };

    const handleReject = async (item: KanbanItem) => {
        // ... (existing implementation)
        const { data: history } = await supabaseClient
            .from('task_history')
            .select('*')
            .eq('task_id', item.id)
            .order('changed_at', { ascending: false })
            .limit(1)
            .single();

        if (history && history.previous_status) {
            await supabaseClient
                .from('documents')
                .update({ category: history.previous_status, tags: item.tags?.filter(t => t !== 'pending_approval') })
                .eq('id', item.id);
            refresh();
        } else {
            if (confirm("No se encontró historial previo. ¿Deseas eliminar este ítem?")) {
                await supabaseClient.from('documents').delete().eq('id', item.id);
                refresh();
            }
        }
    };

    const activeKanbanItem = activeId ? kanbanItems.find((i) => i.id === activeId) : null;

    if (loading && kanbanItems.length === 0) return <div className="text-slate-500 p-10 animate-pulse">Cargando tablero...</div>;

    // Filter Items
    const displayItems = kanbanItems.filter(item => {
        if (showArchived) {
            // Show ONLY archived? Or Mixed? Usually Archive View is separate.
            // Let's match Ideas Page: Show Archived shows ONLY archived? Or mixed?
            // User defined: "Papelera / Histórico".
            const isArchived = (item.type === 'document' && (item.original_data as any).is_archived) ||
                (item.type === 'idea' && item.status === 'discarded');
            return isArchived;
        } else {
            // Show Active
            const isArchived = (item.type === 'document' && (item.original_data as any).is_archived) ||
                (item.type === 'idea' && item.status === 'discarded');
            return !isArchived;
        }
    });

    return (
        <div className="flex flex-col h-full"> {/* Wrapper for layout */}

            {/* Filter Header Multi-Select */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-white">Tablero de Conocimiento</h2>
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{displayItems.length} items</span>
                    </div>

                    {/* Archive Toggle */}
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={cn(
                            "text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-2",
                            showArchived
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : "text-slate-500 hover:bg-slate-800"
                        )}
                    >
                        <span>🗑️ {showArchived ? "Viendo Papelera" : "Papelera"}</span>
                    </button>
                </div>

                {/* Filter Pills / Checkboxes */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-500 mr-2 shrink-0">Filtrar:</span>

                    {/* "All" Button */}
                    <button
                        onClick={() => setSelectedWorkspaceIds([])}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all shrink-0",
                            selectedWorkspaceIds.length === 0
                                ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_10px_-4px_rgba(99,102,241,0.5)]"
                                : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                        )}
                    >
                        <div className={cn(
                            "w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors",
                            selectedWorkspaceIds.length === 0 ? "bg-indigo-500 border-indigo-500" : "border-slate-600 bg-slate-900"
                        )}>
                            {selectedWorkspaceIds.length === 0 && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                        Todo
                    </button>

                    {/* Workspace Buttons */}
                    {workspaces.map(ws => {
                        const isSelected = selectedWorkspaceIds.includes(ws.id);
                        return (
                            <button
                                key={ws.id}
                                onClick={() => toggleWorkspace(ws.id)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all shrink-0",
                                    isSelected
                                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_10px_-4px_rgba(99,102,241,0.5)]"
                                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                                )}
                            >
                                <div className={cn(
                                    "w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors",
                                    isSelected ? "bg-indigo-500 border-indigo-500" : "border-slate-600 bg-slate-900"
                                )}>
                                    {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                                </div>
                                {ws.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex flex-row h-full gap-6 overflow-x-auto p-4 snap-x bg-slate-950/30">
                    {COLUMNS.map((col) => (
                        <div key={col} className="min-w-[320px] snap-center">
                            <Column
                                id={col}
                                title={col}
                                items={displayItems.filter((item) => item.status === col)}
                                onCardClick={(item) => setSelectedItem(item)}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                onArchive={handleArchive}
                            />
                        </div>
                    ))}
                </div>

                {createPortal(
                    <DragOverlay>
                        {activeKanbanItem ? <Card item={activeKanbanItem} /> : null}
                    </DragOverlay>,
                    document.body
                )}

                {selectedItem && selectedItem.type === 'document' && (
                    <CardDetailModal
                        document={selectedItem.original_data as Document}
                        isOpen={!!selectedItem}
                        onClose={() => setSelectedItem(null)}
                    />
                )}
            </DndContext>
        </div>
    );
}
