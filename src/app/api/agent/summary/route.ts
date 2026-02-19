import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET(req: NextRequest) {
    // 1. Basic Auth Check
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'openclaw-agent-key'}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. Fetch Workspaces (to resolve names)
        const { data: workspaces } = await supabaseAdmin
            .from("workspaces")
            .select("id, name");

        const workspaceMap = new Map(workspaces?.map(w => [w.id, w.name]));

        // 3. Fetch Pending Ideas
        const { data: pendingIdeas, error } = await supabaseAdmin
            .from("idea_pipeline")
            .select("id, title, created_at, priority_score, workspace_id")
            .eq("status", "evaluating")
            .order("created_at", { ascending: false });

        if (error) throw error;

        // 4. Enrich data
        const enrichedIdeas = pendingIdeas?.map(idea => ({
            ...idea,
            workspace_name: workspaceMap.get(idea.workspace_id) || "Unknown"
        }));

        return NextResponse.json({
            summary: "Ideas pendientes de revisión/promoción",
            count: enrichedIdeas?.length || 0,
            pending_ideas: enrichedIdeas
        });

    } catch (error: any) {
        console.error("[API] Summary Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
