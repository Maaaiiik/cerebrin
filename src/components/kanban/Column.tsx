"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { KanbanItem } from "@/types/supabase";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

interface ColumnProps {
    id: string;
    title: string;
    items: KanbanItem[];
    onCardClick?: (item: KanbanItem) => void;
    onApprove?: (item: KanbanItem) => void;
    onReject?: (item: KanbanItem) => void;
    onArchive?: (item: KanbanItem) => void;
}

export function Column({ id, title, items, onCardClick, onApprove, onReject, onArchive }: ColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex-1 min-w-[300px] bg-slate-800/50 rounded-lg p-4 flex flex-col transition-colors border border-transparent",
                isOver && "bg-slate-800 border-slate-600 shadow-inner"
            )}
        >
            <h3 className="font-semibold text-slate-300 mb-4 uppercase text-xs tracking-wider flex items-center justify-between">
                {title}
                <span className="bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">
                    {items.length}
                </span>
            </h3>

            <div className="flex-1 space-y-3 overflow-y-auto">
                {items.map((item) => (
                    <Card
                        key={item.id}
                        item={item}
                        onClick={onCardClick}
                        onApprove={onApprove}
                        onReject={onReject}
                        onArchive={onArchive}
                    />
                ))}
            </div>
        </div>
    );
}
