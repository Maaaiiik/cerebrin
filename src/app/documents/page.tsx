"use client";

import React from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { Loader2 } from "lucide-react";
import { ProcessSelector } from "@/components/ProcessSelector";

export default function DocumentsPage() {
    const { activeWorkspaceId } = useWorkspace();

    const handleProcessCallback = () => {
        // Future: Trigger board refresh via Context or Event
        console.log("Process started/finished. Refresh needed.");
    };

    return (
        <div className="h-full flex flex-col p-8 bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Tablero de Conocimiento</h1>
                    <p className="text-slate-400 mt-1">Organiza y estructura la información clave</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Automation Engine Trigger */}
                    {activeWorkspaceId && (
                        <ProcessSelector
                            workspaceId={activeWorkspaceId}
                            onProcessStarted={handleProcessCallback}
                        />
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-900/50 rounded-2xl border border-slate-800/50 p-1">
                {activeWorkspaceId ? (
                    <KanbanBoard />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                        <Loader2 className="animate-spin text-slate-700" size={48} />
                        <p>Selecciona un Workspace para visualizar el tablero.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
