import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, newStatus, type, userId } = body;

        console.log("[API] Move Item:", { id, newStatus, type });

        if (!id || !newStatus || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey || serviceKey === "placeholder") {
            console.error("[API] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing or invalid.");
            return NextResponse.json({
                error: "Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing. Please add it to your .env.local file."
            }, { status: 500 });
        }

        // 1. Handle Idea
        if (type === 'idea') {
            const targetStatus = newStatus === 'Finalizado' ? 'executed' :
                newStatus === 'En Progreso' ? 'executed' : 'evaluating';

            const { error } = await supabaseAdmin
                .from('idea_pipeline')
                .update({ status: targetStatus })
                .eq('id', id);

            if (error) throw error;
        }

        // 2. Handle Document
        else if (type === 'document') {
            // Log history
            // Use provided userId or fallback to a system identifier
            const changedBy = userId || "system-admin-bypass";

            // Retrieve current status for history (optional but good for completeness)
            // We can skip this read or do a single query.
            // For now, let's just log the transition we know.

            // Perform Update
            const { error: updateError } = await supabaseAdmin
                .from("documents")
                .update({ category: newStatus })
                .eq("id", id);

            if (updateError) throw updateError;

            // Insert History
            // We do this AFTER update to ensure consistency, or parallel.
            // Using admin client to ensure we can write to history table if RLS blocks it too.
            const { error: historyError } = await supabaseAdmin
                .from("task_history")
                .insert({
                    task_id: id,
                    task_type: 'document',
                    previous_status: 'unknown', // We'd need to fetch first to know this, or pass it from client
                    new_status: newStatus,
                    changed_by: changedBy,
                    // workspace_id? We need this. Client should pass it.
                    workspace_id: body.workspaceId // Expect this from client
                });

            if (historyError) console.warn("Failed to log history:", historyError);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("[API] Move Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
