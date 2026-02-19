"use client";

import React, { useState, useEffect } from "react";
import { Save, Eye, EyeOff, Terminal } from "lucide-react";

export default function SettingsPage() {
    const [keys, setKeys] = useState({
        openai: "",
        anthropic: "",
        gemini: "",
    });
    const [showKey, setShowKey] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Load from localStorage on mount
        const storedKeys = localStorage.getItem("api_keys");
        if (storedKeys) {
            setKeys(JSON.parse(storedKeys));
        }
    }, []);

    const handleChange = (provider: string, value: string) => {
        setKeys(prev => ({ ...prev, [provider]: value }));
    };

    const handleSave = () => {
        localStorage.setItem("api_keys", JSON.stringify(keys));
        alert("Llaves API guardadas localmente.");
    };

    const toggleShow = (provider: string) => {
        setShowKey(prev => ({ ...prev, [provider]: !prev[provider] }));
    };

    return (
        <div className="p-8 h-full overflow-y-auto max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-100 mb-2">Configuración</h1>
            <p className="text-slate-400 mb-8">Administra tus llaves API y preferencias del sistema.</p>

            {/* API Keys Section */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-8">
                <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <Terminal size={20} className="text-indigo-400" />
                    Llaves API (Local Storage)
                </h2>
                <div className="space-y-4">
                    {["openai", "anthropic", "gemini"].map((provider) => (
                        <div key={provider} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <label className="text-slate-400 capitalize font-medium">{provider} Key</label>
                            <div className="md:col-span-3 relative">
                                <input
                                    type={showKey[provider] ? "text" : "password"}
                                    value={(keys as any)[provider]}
                                    onChange={(e) => handleChange(provider, e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-4 text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none pr-10 transition-all font-mono text-sm"
                                    placeholder={`sk-...`}
                                />
                                <button
                                    onClick={() => toggleShow(provider)}
                                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showKey[provider] ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <Save size={18} />
                        Guardar Cambios
                    </button>
                </div>
            </div>

            {/* Developer Info */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <Terminal size={20} className="text-emerald-400" />
                    Documentación Técnica (API)
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                    Utiliza este esquema para configurar nuevos agentes de IA que interactúen con Panel Openclaw.
                </p>

                <div className="mb-4">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
                        <span className="text-emerald-400 font-bold">POST</span>
                        <span>/api/v1/agent/sync</span>
                    </div>
                </div>

                <div className="relative group">
                    <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto text-xs font-mono text-slate-300 border border-slate-800">
                        {`{
  "type": "idea",
  "workspace_id": "UUID_DEL_CONTEXTO",
  "data": {
    "title": "Título de la Idea",
    "description": "Detalles completos...",
    "priority_score": 8, // 1-10
    "created_by_type": "agent", // "agent" | "manual"
    "start_date": "2024-03-01", // ISO Date (Optional)
    "due_date": "2024-03-15",   // ISO Date (Optional)
    "metadata": { 
        "source_url": "https://..." 
    }
  }
}`}
                    </pre>
                    <button
                        onClick={() => navigator.clipboard.writeText(`{
  "type": "idea",
  "workspace_id": "UUID_DEL_CONTEXTO",
  "data": {
    "title": "Título de la Idea",
    "description": "Detalles completos...",
    "priority_score": 8, // 1-10
    "created_by_type": "agent", // "agent" | "manual"
    "start_date": "2024-03-01", // ISO Date (Optional)
    "due_date": "2024-03-15",   // ISO Date (Optional)
    "metadata": { 
        "source_url": "https://..." 
    }
  }
}`)}
                        className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copiar Schema"
                    >
                        <Eye size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
