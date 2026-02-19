"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Loader2, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";

export default function MigrationPage() {
    const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
    const [logs, setLogs] = useState<string[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data } = await supabaseClient.auth.getUser();
            setCurrentUser(data.user);
        };
        checkUser();
    }, []);

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const runMigration = async () => {
        if (!currentUser) return;
        setStatus("running");
        setLogs([]);
        addLog("Starting migration...");

        try {
            // 1. Fetch all documents with null user_id
            const { data: docs, error: fetchError } = await supabaseClient
                .from("documents")
                .select("id, title")
                .is("user_id", null);

            if (fetchError) throw fetchError;

            addLog(`Found ${docs?.length || 0} documents with null user_id.`);

            // 2. Update each document
            let updatedCount = 0;
            if (docs && docs.length > 0) {
                for (const doc of docs) {
                    const { error: updateError } = await supabaseClient
                        .from("documents")
                        .update({ user_id: currentUser.id })
                        .eq("id", doc.id);

                    if (updateError) {
                        addLog(`ERROR updating ${doc.title}: ${updateError.message}`);
                    } else {
                        updatedCount++;
                    }
                }
            }
            addLog(`Successfully updated ${updatedCount} documents.`);

            // 3. Update API Keys (if logic needed, for now just documents)

            setStatus("done");
            addLog("Migration completed successfully.");

        } catch (error: any) {
            console.error(error);
            addLog(`CRITICAL ERROR: ${error.message}`);
            setStatus("error");
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-200 mb-6 flex items-center gap-2">
                <ShieldCheck className="text-emerald-500" />
                Data Migration & Security
            </h1>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
                <h2 className="text-lg font-semibold text-slate-300 mb-4">Fix Null User IDs</h2>
                <p className="text-slate-400 mb-6 text-sm">
                    This script will assign your current User ID (<strong>{currentUser?.id || "Loading..."}</strong>)
                    to all documents that currently have no owner (`user_id` is null).
                    This is required before enabling strict Row Level Security (RLS).
                </p>

                {currentUser ? (
                    <button
                        onClick={runMigration}
                        disabled={status === "running" || status === "done"}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                    >
                        {status === "running" ? <Loader2 className="animate-spin" /> : <AlertTriangle size={18} />}
                        {status === "running" ? "Migrating..." : "Run User ID Migration"}
                    </button>
                ) : (
                    <div className="text-amber-500 bg-amber-500/10 p-3 rounded text-sm">
                        Please sign in to run migration.
                    </div>
                )}
            </div>

            <div className="bg-black/50 rounded-lg p-4 font-mono text-xs text-slate-400 h-64 overflow-y-auto border border-slate-800">
                {logs.length === 0 ? "Ready to start..." : logs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
                ))}
            </div>
        </div>
    );
}
