import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// We use a new client instance here for server-side if needed, but for simplicity in this Next.js App Router API, we can use the env vars directly.
// Note: If using RLS, we should ideally use the authenticated user, but for this "Agent" access, 
// we presumably want a general list or we assume the agent has admin/service role.
// For now, using standard public key.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("process_templates")
            .select("*");

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Return simplified list for the agent
        const simplified = data.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            step_count: t.steps?.length || 0,
            estimated_total_days: t.steps?.reduce((acc: number, s: any) => acc + (s.delay_days || 0), 0)
        }));

        return NextResponse.json({
            templates: simplified,
            count: simplified.length,
            message: "Available templates for strategy recommendation."
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
