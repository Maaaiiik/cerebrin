import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, content, category, type, workspace_id, parent_id, user_id, metadata } = body;

        // Basic Validation
        if (!title || !workspace_id) {
            return NextResponse.json({ error: "Missing required fields: title, workspace_id" }, { status: 400 });
        }

        // Handle User ID Fallback (Similar to Promote Route)
        let finalUserId = user_id;
        const NIL_UUID = "00000000-0000-0000-0000-000000000000";

        // If user_id is missing or Nil, try to find a real one or use the Nil one if Admin allows
        // In local dev without auth, we might want to default to the first user found.
        if (!finalUserId || finalUserId === NIL_UUID) {
            const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
            if (users && users.length > 0) {
                finalUserId = users[0].id;
            } else {
                // Fallback to Nil if absolutely no users (will likely fail DB constraint if enforced)
                finalUserId = NIL_UUID;
            }
        }

        console.log(`[API] Creating document '${title}' for user ${finalUserId}`);

        const { data, error } = await supabaseAdmin
            .from("documents")
            .insert({
                title,
                content: content || "",
                category: category || "En Progreso",
                type: type || "task",
                workspace_id,
                parent_id: parent_id || null,
                user_id: finalUserId,
                metadata: metadata || {}
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, document: data });

    } catch (error: any) {
        console.error("[API] Create Document Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
