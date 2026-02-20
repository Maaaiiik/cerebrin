"use client";

import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabaseClient } from "@/lib/supabase";
import { WorkspaceMember, WorkspaceRole } from "@/types/supabase";
import { Loader2, Plus, User, Bot, Trash, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function MembersSettings() {
    const { activeWorkspaceId } = useWorkspace();
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [roles, setRoles] = useState<WorkspaceRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");

    useEffect(() => {
        if (activeWorkspaceId) fetchData();
    }, [activeWorkspaceId]);

    const fetchData = async () => {
        setLoading(true);
        // Fetch Roles
        const { data: rolesData } = await supabaseClient
            .from("workspace_roles")
            .select("*")
            .eq("workspace_id", activeWorkspaceId!); // Asserted by guard in effect

        if (rolesData) setRoles(rolesData);

        // Fetch Members
        // Note: Joining with auth.users is strictly restricted in Supabase Client. 
        // We usually use a View or a Function. For now, we will just fetch the members and mock the user details display 
        // if we can't join. BUT, best practice is a `profiles` table.
        // Assuming we rely on `user_details` view or similar if available, or just show ID.
        // Let's try basic select first.
        const { data: membersData, error } = await supabaseClient
            .from("workspace_members")
            .select("*")
            .eq("workspace_id", activeWorkspaceId!);

        if (membersData) {
            // Enrich with roles for display
            const enriched = membersData.map((m: any) => ({
                ...m,
                role_name: rolesData?.find(r => r.id === m.role_id)?.name || "Unknown"
            }));
            setMembers(enriched);
        }
        setLoading(false);
    };

    const handleInvite = async () => {
        // This would call an API route to send email or create invitation record.
        alert("La invitación por email requiere configuración SMTP (fuera del alcance local). \n\nPara pruebas: Añade manualmente el registro en 'workspace_members' usando el ID del usuario destino.");
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("¿Eliminar miembro del equipo?")) return;
        const { error } = await supabaseClient.from("workspace_members").delete().eq("id", memberId);
        if (error) alert(error.message);
        else fetchData();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <User className="text-indigo-400" size={20} />
                        Miembros del Equipo
                    </h3>
                    <p className="text-slate-400 text-sm">Gestiona quién tiene acceso a este workspace personal e Inteligencia Artificial.</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="email"
                        placeholder="email@usuario.com"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:border-indigo-500 outline-none w-64"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                    />
                    <button
                        onClick={handleInvite}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors font-medium shadow-lg shadow-indigo-500/20"
                    >
                        <Plus size={16} /> Invitar
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-950 text-slate-500 font-medium uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Usuario</th>
                            <th className="px-6 py-4">Rol</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Unido</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2" /> Cargando miembros...</td></tr>
                        ) : members.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No hay miembros (¿Eres el único?)</td></tr>
                        ) : members.map((member) => (
                            <tr key={member.id} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                            member.member_type === 'ai' ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"
                                        )}>
                                            {member.member_type === 'ai' ? <Bot size={16} /> : <User size={16} />}
                                        </div>
                                        <div>
                                            {/* Since we don't have joined user data yet, show ID snippet */}
                                            <p className="text-slate-200 font-medium">{member.users?.full_name || "Usuario / Agente"}</p>
                                            <p className="text-xs text-slate-500 font-mono">{member.user_id.substring(0, 8)}...</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs border border-slate-700">
                                        {member.role_name}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn("text-xs font-bold uppercase tracking-wider",
                                        member.member_type === 'ai' ? "text-emerald-500" : "text-indigo-400"
                                    )}>
                                        {member.member_type === 'ai' ? "Agent AI" : "Humano"}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    {new Date(member.joined_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleRemoveMember(member.id)}
                                        className="text-slate-600 hover:text-red-400 p-2 rounded-lg hover:bg-black/20"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
