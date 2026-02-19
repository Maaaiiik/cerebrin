"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Copy, Check, Settings, Code, Key, Briefcase, RefreshCw, Save } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SettingsPage() {
    const { activeWorkspaceId, workspaces } = useWorkspace();
    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const agentPrompt = `
Eres un agente AI conectado al sistema Panel OpenClaw.
Tu Workspace ID es: ${activeWorkspaceId}

Usa las siguientes APIs para gestionar el trabajo:
1. POST /api/ideas - Para capturar nuevas ideas.
2. GET /api/projects - Para leer el estado de los proyectos.
3. POST /api/agent/summary - Para enviar reportes diarios.

Reglas:
- Si una idea está aprobada pero no iniciada, sugierela para promoción.
- Si un proyecto tiene fecha de vencimiento < 3 días y progreso < 50%, márcalo en rojo.
`.trim();

    return (
        <div className="max-w-5xl mx-auto p-8 text-slate-200 space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                        <Settings className="text-slate-400" />
                        Configuración
                    </h1>
                    <p className="text-slate-400 mt-2">Gestiona tu workspace, conexiones de agentes y plantillas.</p>
                </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Workspace & Agent */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Agent Connection Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
                    >
                        <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                            <Key className="text-emerald-400" size={20} />
                            Conexión de Agente
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">
                            Usa estas credenciales para conectar tus agentes de n8n, Python o LangChain.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Workspace ID</label>
                                <div className="flex items-center gap-2">
                                    <code className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-indigo-400 flex-1">
                                        {activeWorkspaceId || "Selecciona un workspace"}
                                    </code>
                                    <button
                                        onClick={() => activeWorkspaceId && copyToClipboard(activeWorkspaceId, 'wsId')}
                                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
                                        title="Copiar ID"
                                    >
                                        {copiedField === 'wsId' ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Prompt de Sistema (Inicial)</label>
                                <div className="relative">
                                    <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                                        {agentPrompt}
                                    </pre>
                                    <button
                                        onClick={() => copyToClipboard(agentPrompt, 'promt')}
                                        className="absolute top-2 right-2 p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                    >
                                        {copiedField === 'promt' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Templates Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                <RefreshCw className="text-blue-400" size={20} />
                                Plantillas de Proceso
                            </h2>
                            <Link
                                href="/settings/templates"
                                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium transition-colors border border-blue-500/20"
                            >
                                Gestionar Plantillas
                            </Link>
                        </div>
                        <p className="text-sm text-slate-400">
                            Estandariza tus flujos de trabajo creando plantillas reutilizables para proyectos recurrentes.
                        </p>
                    </motion.div>
                </div>

                {/* Right Column: Workspace Info */}
                <div className="space-y-8">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
                    >
                        <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                            <Briefcase className="text-indigo-400" size={18} />
                            Workspace Activo
                        </h2>

                        {activeWorkspace ? (
                            <div className="text-center py-6">
                                <div className="w-20 h-20 bg-indigo-500 rounded-2xl mx-auto flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-indigo-500/20 mb-4">
                                    {activeWorkspace.name.substring(0, 2).toUpperCase()}
                                </div>
                                <h3 className="text-xl font-bold text-white">{activeWorkspace.name}</h3>
                                <p className="text-slate-500 text-sm mt-1">{activeWorkspace.slug}</p>

                                <div className="mt-8 border-t border-slate-800 pt-6 text-left">
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-4">Estadísticas</p>
                                    <ul className="space-y-3 text-sm text-slate-300">
                                        <li className="flex justify-between">
                                            <span>Creado</span>
                                            <span className="text-slate-500">{activeWorkspace.created_at ? new Date(activeWorkspace.created_at).toLocaleDateString() : "N/A"}</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span>ID</span>
                                            <code className="text-xs bg-slate-950 px-2 py-0.5 rounded text-slate-500">{activeWorkspace.id.substring(0, 8)}...</code>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                No hay workspace seleccionado.
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
