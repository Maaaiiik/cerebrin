"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import { Loader2, Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            // Successful login
            router.push("/global");
            router.refresh(); // Refresh to update middleware/context
        } catch (err: any) {
            console.error("Login failed:", err);
            setError(err.message || "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10"
            >
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                        <Lock className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Bienvenido a OpenClaw</h1>
                    <p className="text-slate-400 mt-2 text-sm">Ingresa tus credenciales para acceder al panel.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                placeholder="usuario@empresa.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1">Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar Sesión"}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-600">
                    <p>Acceso restringido a personal autorizado.</p>
                </div>
            </motion.div>
        </div>
    );
}
