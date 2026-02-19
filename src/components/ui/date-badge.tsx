"use client";

import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import "react-day-picker/dist/style.css";

interface DateBadgeProps {
    date?: string | null;
    onChange: (date: string | null) => void;
    placeholder?: string;
    className?: string;
}

export function DateBadge({ date, onChange, placeholder = "Fecha", className }: DateBadgeProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (day: Date | undefined) => {
        if (day) {
            // Store as ISO string (YYYY-MM-DD) or full ISO? 
            // Supabase timestamptz prefers ISO. But input type="date" uses YYYY-MM-DD.
            // Let's use full ISO for "start_date" usually, but YYYY-MM-DD is easier for consistency.
            // Our DB Types say "string | null".
            // Let's save as ISO date part: YYYY-MM-DD.
            // But DayPicker returns Date object.
            // We want to avoid timezone issues.
            // Let's format as YYYY-MM-DD.
            const formatted = format(day, "yyyy-MM-dd");
            onChange(formatted);
            setIsOpen(false);
        } else {
            onChange(null);
        }
    };

    const displayDate = date ? format(new Date(date), "dd MMM", { locale: es }) : placeholder;

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all border",
                    date
                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20"
                        : "bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700",
                    className
                )}
            >
                <CalendarIcon size={10} />
                <span>{displayDate}</span>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-1 left-0 z-50 bg-slate-950 border border-slate-800 rounded-lg shadow-xl p-2">
                    <style>{`
                        .rdp { --rdp-cell-size: 30px; --rdp-accent-color: #6366f1; --rdp-background-color: #1e1b4b; margin: 0; }
                        .rdp-day_selected:not([disabled]) { background-color: var(--rdp-accent-color); color: white; }
                        .rdp-day_selected:hover:not([disabled]) { background-color: var(--rdp-accent-color); }
                        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #1e293b; }
                        .rdp-caption_label { color: #e2e8f0; font-size: 0.8rem; }
                        .rdp-nav_button { color: #94a3b8; }
                        .rdp-head_cell { color: #64748b; font-size: 0.75rem; }
                        .rdp-day { color: #e2e8f0; font-size: 0.8rem; }
                    `}</style>
                    <DayPicker
                        mode="single"
                        selected={date ? new Date(date) : undefined}
                        onSelect={handleSelect}
                        locale={es}
                        initialFocus
                    />
                    {date && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onChange(null); setIsOpen(false); }}
                            className="w-full mt-2 py-1 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded flex items-center justify-center gap-1"
                        >
                            <X size={10} /> Limpiar Fecha
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
