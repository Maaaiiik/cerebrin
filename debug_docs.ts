import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDocs() {
    console.log("Checking Documents...");
    const { data: docs, error } = await supabase
        .from('documents')
        .select('id, title, category, type, workspace_id, user_id');

    if (error) {
        console.error(error);
    } else {
        console.table(docs);
    }
}

checkDocs();
