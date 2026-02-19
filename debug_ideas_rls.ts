import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // using Admin Key for inspection
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAndTest() {
    console.log("--- 1. Inspecting idea_pipeline columns ---");
    const { data: ideas, error: ideaError } = await supabase
        .from('idea_pipeline')
        .select('*')
        .limit(1);

    if (ideaError) console.error(ideaError);
    else console.log("Idea Sample Keys:", ideas && ideas.length > 0 ? Object.keys(ideas[0]) : "No ideas found");

    console.log("\n--- 2. Testing Task Insertion (RLS Simulation) ---");
    // We can't easily simulate RLS with admin client unless we assume user role. 
    // But we can check if it works with admin, then we know it's RLS.

    // Let's try to find a project first
    const { data: projects } = await supabase.from('documents').select('id, workspace_id, user_id').limit(1);
    if (!projects || projects.length === 0) {
        console.log("No projects found to test task insertion.");
        return;
    }

    const project = projects[0];
    console.log("Testing with Project:", project);

    // Try insert with Admin (Should work)
    const { error: adminError } = await supabase.from('documents').insert({
        title: "Test Task Admin",
        workspace_id: project.workspace_id,
        parent_id: project.id,
        user_id: project.user_id, // Use project owner
        type: 'task',
        category: 'En Progreso'
    });

    if (adminError) console.error("Admin Insert Failed:", adminError);
    else console.log("Admin Insert Success");

}

inspectAndTest();
