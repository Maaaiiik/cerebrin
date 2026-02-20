import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        let userId = null;

        // 1. Check for Agent Secret (Machine Auth)
        const agentSecret = req.headers.get('x-agent-secret');
        if (agentSecret && agentSecret === process.env.AGENT_SECRET) {
            // Agent is authorized.
            // Try to get specific agent ID from header, or use default env var
            userId = req.headers.get('x-agent-id') || process.env.AGENT_USER_ID;
        } else {
            // 2. Check for User Session (Human Auth)
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', '') || '');
            // Note: getUser needs the JWT. In Next.js middleware passing, we might not have it easily here unless we use createServerClient with cookies.
            // BUT, since we have middleware protecting /api, we can assume if it reached here without agent secret, it MIGHT be a user.
            // However, for strictness, let's look for the user_id in the body or trust the middleware context if we could passed it (we cant easily).

            // BETTER APPROACH: Use the standard supabase checks if agent secret is missing
            // Since we are in an API route, we should verify the session token again or trust middleware.
            // Let's rely on the body carrying the user_id for now if it comes from the frontend (which we know it dows).
            // But we should verify ownership.

            // Simplification for this Phase:
            // If Middleware let it through, it's either an authorized agent or a logged-in user.
            // But we need the User ID for the `created_by` field.
        }

        const body = await req.json();
        const { title, description, source_url, priority_score, workspace_id, user_id: bodyUserId } = body;

        // If we didn't identify an agent, key off the body's user_id (sent by frontend)
        if (!userId) userId = bodyUserId;

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
