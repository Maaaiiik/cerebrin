import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { idea_id, workspace_id, user_id } = body;

        if (!idea_id || !workspace_id || !user_id) {
            return NextResponse.json({ error: "Missing required fields: idea_id, workspace_id, user_id" }, { status: 400 });
        }

        // 1. Get the idea details
        const { data: idea, error: ideaFetchError } = await supabaseAdmin
            .from("idea_pipeline")
            .select("*")
            .eq("id", idea_id)
            .single();

        if (ideaFetchError || !idea) {
            return NextResponse.json({ error: "Idea not found" }, { status: 404 });
        }

        // Handle Dev/Mock User ID (Fix for Foreign Key Constraint)
        let finalUserId = user_id;
        const NIL_UUID = "00000000-0000-0000-0000-000000000000";

        if (user_id === NIL_UUID) {
            // Fetch the first real user from Supabase Auth to satisfy FK constraint
            const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });

            if (users && users.length > 0) {
                finalUserId = users[0].id;
                console.log(`[API] Replaced Nil UUID with real user ID: ${finalUserId}`);
            } else {
                return NextResponse.json({
                    error: "No users found in Supabase Auth. Please create at least one user in your Supabase project > Authentication."
                }, { status: 400 });
            }
        }

        // 2. Create the Project Document
        const { data: newDoc, error: docError } = await supabaseAdmin
            .from("documents")
            .insert({
                title: idea.title,
                content: idea.description, // Start with description as content
                category: "En Progreso", // Promoted items go to "En Progreso" usually? Or "Investigación"?
                // User said "Promover a Proyecto", so it should probably be a Project type if we support types. 
                // But current schema might just use category. Let's stick to "En Progreso".
                workspace_id: workspace_id,
                user_id: finalUserId,
                type: 'project',
                tags: ['promoted_from_idea'],
                metadata: {
                    source_idea_id: idea.id,
                    promoted_at: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (docError) throw docError;

        // 3. Update Idea status to 'executed' and link to new doc
        const { error: updateError } = await supabaseAdmin
            .from("idea_pipeline")
            .update({
                status: "executed",
                progress_pct: 100,
                // If we want to link them, we might need a column. 
                // For now, let's just mark it executed.
            })
            .eq("id", idea_id);

        if (updateError) throw updateError;

        // 4. Log Activity
        await supabaseAdmin.from("activity_feed").insert({
            action_type: "promote_idea",
            description: `Idea promovida a Proyecto: ${idea.title}`,
            workspace_id: workspace_id,
            entity_id: newDoc.id,
            entity_type: 'document'
        });

        return NextResponse.json({ success: true, document: newDoc });

    } catch (error: any) {
        console.error("[API] Promote Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
