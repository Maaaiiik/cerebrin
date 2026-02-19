import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        // 1. Basic Auth Check
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'openclaw-agent-key'}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, description, source_url, priority_score, workspace_id } = body;

        if (!title || !workspace_id) {
            return NextResponse.json({ error: "Missing required fields: title, workspace_id" }, { status: 400 });
        }

        // 2. Normalize Priority (0-100 -> 1-10)
        // Agent sends 0-100. DB expects ~ 1-10 range usually, but the column definition allows integer.
        // User requested normalization "to the range 1-10 that our database uses".
        let normalizedScore = 5; // Default middle
        if (typeof priority_score === 'number') {
            // Map 0-100 to 1-10
            normalizedScore = Math.max(1, Math.min(10, Math.ceil(priority_score / 10)));
        }

        const { data, error } = await supabaseAdmin
            .from("idea_pipeline")
            .insert({
                title,
                description,
                source_url,
                priority_score: normalizedScore,
                workspace_id,
                status: 'evaluating' // Default starting status
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("[API] Create Idea Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
