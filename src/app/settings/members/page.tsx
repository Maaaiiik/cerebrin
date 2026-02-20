"use client";

import React from "react";
import { MembersSettings } from "@/components/features/settings/MembersSettings";
import { RolesSettings } from "@/components/features/settings/RolesSettings";
import { Users } from "lucide-react";

export default function MembersPage() {
    return (
        <div className="max-w-6xl mx-auto p-8 text-slate-200 space-y-12">

            {/* Header */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                    <Users size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Equipos</h1>
                    <p className="text-slate-400 mt-1 text-lg">Administra miembros humanos y agentes autónomos.</p>
                </div>
            </div>

            {/* Sections */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                <section>
                    <MembersSettings />
                </section>

                <section>
                    <RolesSettings />
                </section>
            </div>
        </div>
    );
}
