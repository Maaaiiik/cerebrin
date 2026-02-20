"use client";

import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabaseClient } from "@/lib/supabase";
import { WorkspaceRole } from "@/types/supabase";
import { Loader2, Plus, Shield, Edit2, Trash, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function RolesSettings() {
    const { activeWorkspaceId } = useWorkspace();
    const [roles, setRoles] = useState<WorkspaceRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRole, setEditingRole] = useState<WorkspaceRole | null>(null);

    // Permission definitions for UI builder
    const availablePermissions = [
        { key: "manage_members", label: "Gestionar Miembros", desc: "Invitar y eliminar usuarios" },
        { key: "manage_roles", label: "Gestionar Roles", desc: "Crear y editar roles" },
        { key: "manage_content", label: "Gestionar Contenido", desc: "Crear/Editar Proyectos e Ideas" },
        { key: "delete_content", label: "Borrar Contenido", desc: "Eliminar Proyectos e Ideas" },
        { key: "approve_content", label: "Aprobar", desc: "Promover ideas a proyectos" },
        { key: "view_analytics", label: "Ver Analíticas", desc: "Acceso a dashboards" },
        { key: "is_agent", label: "Es Agente", desc: "Identificador para automatización" },
    ];

    useEffect(() => {
        if (activeWorkspaceId) fetchRoles();
    }, [activeWorkspaceId]);

    const fetchRoles = async () => {
        setLoading(true);
        const { data, error } = await supabaseClient
            .from("workspace_roles")
            .select("*")
            .eq("workspace_id", activeWorkspaceId!)
            .order("created_at", { ascending: true });

        if (error) console.error("Error fetching roles:", error);
        else setRoles(data || []);
        setLoading(false);
    };

    const handleSaveRole = async () => {
        if (!editingRole || !activeWorkspaceId) return;

        const { error } = await supabaseClient
            .from("workspace_roles")
            .upsert({
                ...editingRole,
                workspace_id: activeWorkspaceId
            })
            .select()
            .single();

        if (error) {
            alert("Error saving role: " + error.message);
        } else {
            setEditingRole(null);
            fetchRoles();
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (!confirm("¿Eliminar este rol? Los usuarios asignados perderán sus permisos.")) return;
        const { error } = await supabaseClient.from("workspace_roles").delete().eq("id", roleId);
        if (error) alert("Error deleting role: " + error.message);
        else fetchRoles();
    };

    const togglePermission = (key: string) => {
        if (!editingRole) return;
        const current = editingRole.permissions || {};
        const newVal = !current[key];
        setEditingRole({
            ...editingRole,
            permissions: { ...current, [key]: newVal }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Shield className="text-emerald-400" size={20} />
                        Roles y Permisos
                    </h3>
                    <p className="text-slate-400 text-sm">Define qué pueden hacer los humanos y agentes en tu equipo.</p>
                </div>
                <button
                    onClick={() => setEditingRole({
                        id: crypto.randomUUID(), // Temp ID
                        workspace_id: activeWorkspaceId!,
                        name: "Nuevo Rol",
                        description: "",
                        permissions: {},
                        is_system_default: false,
                        created_at: new Date().toISOString()
                    })}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm transition-colors"
                >
                    <Plus size={16} /> Crear Rol
                </button>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {loading ? <Loader2 className="animate-spin text-slate-500" /> : roles.map((role) => (
                    <div key={role.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between group">
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-200">{role.name}</h4>
                                {role.is_system_default && <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 rounded border border-slate-700">System</span>}
                                {role.permissions?.is_agent && <span className="text-[10px] bg-indigo-900/50 text-indigo-400 px-1.5 rounded border border-indigo-500/30">Agente</span>}
                            </div>
                            <p className="text-sm text-slate-500">{role.description || "Sin descripción"}</p>
                            <div className="flex gap-2 mt-2">
                                {Object.keys(role.permissions).filter(k => role.permissions[k]).slice(0, 4).map(k => (
                                    <span key={k} className="text-[10px] text-slate-400 bg-slate-800/50 px-1 rounded">{k}</span>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingRole(role)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><Edit2 size={16} /></button>
                            {!role.is_system_default && (
                                <button onClick={() => handleDeleteRole(role.id)} className="p-2 hover:bg-red-900/20 rounded-lg text-slate-600 hover:text-red-400"><Trash size={16} /></button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Editor Modal/Panel */}
            <AnimatePresence>
                {editingRole && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl flex flex-col">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                                <h3 className="text-xl font-bold text-white">Editar Rol</h3>
                                <button onClick={() => setEditingRole(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Nombre del Rol</label>
                                        <input
                                            value={editingRole.name}
                                            onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Descripción</label>
                                        <input
                                            value={editingRole.description || ''}
                                            onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs uppercase font-bold text-slate-500 mb-3 block">Matriz de Permisos</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {availablePermissions.map(perm => (
                                            <div key={perm.key}
                                                onClick={() => togglePermission(perm.key)}
                                                className={cn(
                                                    "border rounded-lg p-3 cursor-pointer transition-all hover:bg-slate-800/50 flex items-start gap-3",
                                                    editingRole.permissions[perm.key] ? "bg-indigo-900/20 border-indigo-500/50" : "bg-slate-950 border-slate-800"
                                                )}
                                            >
                                                <div className={cn("w-5 h-5 rounded flex items-center justify-center mt-0.5 border",
                                                    editingRole.permissions[perm.key] ? "bg-indigo-500 border-indigo-500" : "border-slate-600"
                                                )}>
                                                    {editingRole.permissions[perm.key] && <Check size={14} className="text-white" />}
                                                </div>
                                                <div>
                                                    <p className={cn("font-medium text-sm", editingRole.permissions[perm.key] ? "text-indigo-300" : "text-slate-300")}>{perm.label}</p>
                                                    <p className="text-xs text-slate-500">{perm.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-800 mt-auto flex justify-end gap-3 bg-slate-900 sticky bottom-0">
                                <button onClick={() => setEditingRole(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
                                <button onClick={handleSaveRole} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 font-medium">
                                    <Save size={18} /> Guardar Rol
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Check({ size, className }: { size: number, className?: string }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"></polyline></svg>
}
