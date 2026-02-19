"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Lightbulb,
    FileText,
    Search,
    Menu,
    ChevronLeft,
    ChevronRight,
    BrainCircuit,
    Users,
    RefreshCw,
    Activity,
    Calendar,
    ChevronDown,
    Briefcase
} from "lucide-react";

export function Sidebar() {
    const { workspaces, activeWorkspaceId, setActiveWorkspaceId, refreshWorkspaces, isLoading } = useWorkspace();
    const [collapsed, setCollapsed] = useState(false);
    const [tableroOpen, setTableroOpen] = useState(true);
    const pathname = usePathname();
    const router = useRouter();

    const toggleSidebar = () => setCollapsed(!collapsed);

    const handleWorkspaceClick = (workspaceId: string) => {
        setActiveWorkspaceId(workspaceId);
        // Navigate to dashboard if not already there
        router.push("/");
    };

    const navItems = [
        { name: "Resumen Global", href: "/global", icon: BrainCircuit },
        {
            name: "Tablero de Control",
            icon: LayoutDashboard,
            isGroup: true
        },
        { name: "Incubadora de Ideas", href: "/ideas", icon: Lightbulb },
        { name: "Gestión de Proyectos", href: "/projects", icon: Briefcase }, // Added Projects Item
        { name: "Tablero de Conocimiento", href: "/documents", icon: FileText },
        { name: "Consejo de Modelos", href: "/council", icon: Users },
        { name: "Calendario", href: "/calendar", icon: Calendar },
        { name: "Historial del Agente", href: "/activity", icon: Activity },
    ];

    return (
        <aside
            className={cn(
                "bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col h-screen text-slate-300 shadow-xl z-50",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Header / Collapse Trigger */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className={cn("font-bold text-lg text-indigo-400 tracking-tight flex items-center gap-2", collapsed && "hidden")}>
                    <BrainCircuit size={24} />
                    <span>OpenClaw</span>
                </div>
                {collapsed && <div className="mx-auto"><BrainCircuit size={24} className="text-indigo-400" /></div>}

                <button
                    onClick={toggleSidebar}
                    className={cn(
                        "p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-all",
                        collapsed ? "hidden" : "block"
                    )}
                >
                    <ChevronLeft size={16} />
                </button>
                {collapsed && (
                    <button onClick={toggleSidebar} className="mx-auto mt-2 p-1 hover:text-white"><ChevronRight size={16} /></button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 space-y-1.5 overflow-y-auto px-3">
                {navItems.map((item, index) => {
                    const Icon = item.icon;

                    if (item.isGroup) {
                        const isActive = pathname === "/" && !collapsed; // Parent is active if we are on dashboard?

                        // If collapsed, we can't show sub-items easily in this designs without a popover.
                        // For now, if collapsed, we essentially hide the children logic or show just the icon.
                        // Let's hide sub-items if collapsed and just show the parent icon which potentially expands sidebar.

                        return (
                            <div key={index}>
                                <div
                                    className={cn(
                                        "flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer select-none",
                                        "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                                        collapsed ? "justify-center" : "justify-between"
                                    )}
                                    onClick={() => {
                                        if (collapsed) setCollapsed(false);
                                        setTableroOpen(!tableroOpen);
                                    }}
                                >
                                    <div className="flex items-center">
                                        <Icon
                                            size={20}
                                            className={cn(
                                                "shrink-0 transition-colors",
                                                "text-slate-500 group-hover:text-slate-300",
                                                !collapsed && "mr-3"
                                            )}
                                        />
                                        {!collapsed && <span className="font-medium text-sm">{item.name}</span>}
                                    </div>
                                    {!collapsed && (
                                        <div className="text-slate-600">
                                            {tableroOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </div>
                                    )}
                                </div>

                                {/* Workspaces List */}
                                {!collapsed && tableroOpen && (
                                    <div className="mt-1 ml-4 space-y-0.5 border-l border-slate-800 pl-2">
                                        {isLoading && <div className="px-3 py-1 text-xs text-slate-600">Cargando...</div>}
                                        {workspaces.map(ws => (
                                            <button
                                                key={ws.id}
                                                onClick={() => handleWorkspaceClick(ws.id)}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2",
                                                    activeWorkspaceId === ws.id && pathname === "/"
                                                        ? "bg-indigo-500/10 text-indigo-400 font-medium"
                                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    activeWorkspaceId === ws.id && pathname === "/" ? "bg-indigo-400" : "bg-slate-700"
                                                )} />
                                                <span className="truncate">{ws.name}</span>
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => refreshWorkspaces()}
                                            className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:text-emerald-400 flex items-center gap-2"
                                        >
                                            <RefreshCw size={10} className={cn(isLoading && "animate-spin")} />
                                            <span>Actualizar lista</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href || item.name}
                            href={item.href || "#"}
                            className={cn(
                                "flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                                collapsed ? "justify-center" : "justify-start"
                            )}
                        >
                            <Icon
                                size={20}
                                className={cn(
                                    "shrink-0 transition-colors",
                                    isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300",
                                    !collapsed && "mr-3"
                                )}
                            />
                            {!collapsed && <span className="font-medium text-sm">{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / Search Trigger */}
            <div className="p-4 border-t border-slate-800">
                <button
                    className={cn(
                        "w-full flex items-center bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 rounded-lg p-2.5 transition-all group",
                        collapsed ? "justify-center" : "justify-between"
                    )}
                >
                    <div className="flex items-center">
                        <Search size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                        {!collapsed && <span className="ml-2 text-sm font-medium">Buscar...</span>}
                    </div>
                    {!collapsed && <span className="text-[10px] bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-500">⌘K</span>}
                </button>
            </div>
        </aside>
    );
}
