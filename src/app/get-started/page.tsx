"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import { Rocket, Loader2, ArrowRight, Layout } from "lucide-react";

export default function GetStartedPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [loading, setLoading] = useState(false);

    // Auto-generate slug from name
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setName(val);
        setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error("No estás autenticado.");

            const { data, error } = await supabaseClient
                .from("workspaces")
                .insert({
                    name,
                    slug,
                    user_id: user.id
                })
                .select()
                .single();

            if (error) throw error;

            // Wait a moment for trigger to create roles
            await new Promise(r => setTimeout(r, 1000));

            // Redirect to home (Context will pick up the new workspace)
            window.location.href = "/app";

        } catch (error: any) {
            alert("Error creando workspace: " + error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">

            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="max-w-md w-full relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-2xl mx-auto flex items-center justify-center text-white mb-6 shadow-2xl shadow-indigo-500/30">
                        <Rocket size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Bienvenido a OpenClaw</h1>
                    <p className="text-slate-400">Vamos a configurar tu primer espacio de trabajo para comenzar a colaborar con tus agentes IA.</p>
                </div>

                <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Nombre del Workspace</label>
                        <input
                            type="text"
                            placeholder="Ej. Mi Startup, Proyecto X, Personal"
                            value={name}
                            onChange={handleNameChange}
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-500 mb-2">URL del Espacio (Slug)</label>
                        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-500">
                            <span className="text-slate-600 mr-1">openclaw.app/</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={e => setSlug(e.target.value)}
                                required
                                className="bg-transparent text-indigo-400 outline-none flex-1 font-mono text-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading || !name}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Crear Espacio de Trabajo"}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </div>
                </form>

                <p className="text-center text-xs text-slate-600 mt-8">
                    Al crear un espacio, aceptas ser el Propietario y Administrador absoluto del mismo.
                </p>
            </div>
        </div>
    );
}
