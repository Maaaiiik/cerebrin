"use client";

import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabaseClient } from "@/lib/supabase";
import { Document } from "@/types/supabase";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { es } from "date-fns/locale";
import { format, isSameDay } from "date-fns";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
    const { activeWorkspaceId, isLoading: isContextLoading } = useWorkspace();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    useEffect(() => {
        if (isContextLoading) return;
        if (!activeWorkspaceId) {
            setLoading(false);
            return;
        }

        const fetchDocs = async () => {
            setLoading(true);
            const { data, error } = await supabaseClient
                .from("documents")
                .select("*")
                .eq("workspace_id", activeWorkspaceId)
                .not("due_date", "is", null);

            if (error) {
                console.error("Error fetching tasks for calendar:", error);
            } else {
                setDocuments((data as Document[]) || []);
            }
            setLoading(false);
        };

        fetchDocs();
    }, [activeWorkspaceId, isContextLoading]);

    // Format tasks for DayPicker
    const modifiers = {
        hasTask: (date: Date) => documents.some(doc => doc.due_date && isSameDay(new Date(doc.due_date), date)),
    };

    const taskForSelectedDate = documents.filter(doc =>
        selectedDate && doc.due_date && isSameDay(new Date(doc.due_date), selectedDate)
    );

    const { workspaces } = useWorkspace();
    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

    const getTaskColor = (doc: Document) => {
        // Color by Workspace Name
        if (!activeWorkspace) return "bg-slate-800 border-slate-700 text-slate-300";

        const name = activeWorkspace.name.toLowerCase();

        if (name.includes("duoc")) return "bg-purple-500/20 border-purple-500/50 text-purple-200";
        if (name.includes("ebox")) return "bg-blue-500/20 border-blue-500/50 text-blue-200";

        return "bg-slate-800 border-slate-700 text-slate-300";
    };

    return (
        <div className="h-full flex flex-col md:flex-row p-8 bg-slate-900 gap-8 overflow-hidden">
            {/* Calendar Widget */}
            <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 shadow-xl overflow-y-auto">
                <h2 className="text-xl font-bold text-slate-100 mb-4">Calendario de Tareas</h2>

                <style>{`
                    .rdp { --rdp-cell-size: 50px; --rdp-accent-color: #6366f1; --rdp-background-color: #1e293b; margin: 0; }
                    .rdp-day_selected:not([disabled]) { font-weight: bold; border: 2px solid #6366f1; background-color: transparent; }
                    .rdp-day_selected:hover:not([disabled]) { border-color: #818cf8; background-color: transparent;}
                 `}</style>

                <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={es}
                    modifiers={modifiers}
                    modifiersStyles={{
                        hasTask: {
                            fontWeight: "bold",
                            textDecoration: "underline",
                            textDecorationColor: "#10b981",
                            textDecorationThickness: "3px"
                        }
                    }}
                    className="text-slate-300 bg-slate-950 p-2 rounded-xl"
                />
            </div>

            {/* Task List for Selected Date */}
            <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 p-6 overflow-hidden flex flex-col">
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center justify-between">
                    <span>Tareas: {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: es }) : "Selecciona un día"}</span>
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{taskForSelectedDate.length} tareas</span>
                </h3>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {loading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : taskForSelectedDate.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                            <p>No hay tareas para esta fecha.</p>
                            <button className="mt-4 text-sm text-indigo-400 hover:text-indigo-300">
                                + Crear Tarea
                            </button>
                        </div>
                    ) : (
                        taskForSelectedDate.map(doc => (
                            <div key={doc.id} className={cn("p-4 rounded-xl border flex flex-col gap-1 transition-all hover:translate-x-1", getTaskColor(doc))}>
                                <div className="flex justify-between items-start">
                                    <h4 className="font-semibold">{doc.title}</h4>
                                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 border border-current px-1 rounded">
                                        {doc.category}
                                    </span>
                                </div>
                                <p className="text-sm opacity-80 line-clamp-2">{doc.content}</p>
                                <div className="mt-2 flex gap-2 text-xs opacity-60">
                                    {doc.subject && <span>#{doc.subject}</span>}
                                    {doc.tags?.map(t => <span key={t}>#{t}</span>)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
