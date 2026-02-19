import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        console.log(" [API] Received Agent Sync Request");

        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            console.warn(" [API] Missing or invalid Authorization header");
            return NextResponse.json({ error: 'No autorizado: Header Authorization faltante o incorrecto' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        console.log(` [API] Validating token: ${token.substring(0, 10)}... (Length: ${token.length})`);

        // 1. Validar Token contra la tabla api_keys
        // Using force check to ensure connection
        const { data: keyData, error: keyError } = await supabaseAdmin
            .from('api_keys')
            .select('user_id')
            .eq('key_value', token)
            .single();

        if (keyError) {
            console.error(" [API] Database Error validating token:", keyError.message);
            // If table doesn't exist or connection fails
            return NextResponse.json({ error: `Database Error: ${keyError.message}` }, { status: 500 });
        }

        if (!keyData) {
            console.warn(" [API] Token not found in api_keys table.");
            return NextResponse.json({ error: 'Token inválido o no encontrado' }, { status: 403 });
        }

        console.log(` [API] Token valid. User ID: ${keyData.user_id}`);

        const body = await req.json();
        const { type, title, content, description, workspace_id, metadata, tags, subject, priority_score } = body;
        const userId = keyData.user_id;

        console.log(` [API] Processing item type: ${type}`);

        let result;

        // 2. Lógica de Enrutamiento
        switch (type) {
            case 'idea':
                result = await supabaseAdmin.from('idea_pipeline').insert({
                    title,
                    description,
                    status: 'draft',
                    progress_pct: 0,
                    priority_score: priority_score || 5, // Default
                    workspace_id,
                    user_id: userId
                }).select();
                break;

            case 'research':
                result = await supabaseAdmin.from('documents').insert({
                    title,
                    content,
                    category: 'Investigación',
                    workspace_id,
                    user_id: userId,
                    metadata: metadata || {},
                    tags: tags || [],
                    subject: subject || null,
                    priority_score: priority_score || null
                }).select();
                break;

            case 'daily_summary':
                result = await supabaseAdmin.from('daily_journal').insert({
                    summary: content,
                    workspace_id,
                    user_id: userId
                }).select();
                break;

            default:
                console.warn(` [API] Unsupported type: ${type}`);
                return NextResponse.json({ error: `Tipo de dato '${type}' no soportado` }, { status: 400 });
        }

        if (result.error) {
            console.error(" [API] Insert Error:", result.error.message);
            throw result.error;
        }

        console.log(" [API] Insert successful:", result.data);

        // 3. Registrar en Activity Feed
        try {
            await supabaseAdmin.from('activity_feed').insert({
                action_type: `agent_${type}`,
                description: `Agente sincronizó: ${title || 'Resumen diario'}`,
                user_id: userId,
                workspace_id: workspace_id
            });
            console.log(" [API] Activity Feed updated.");
        } catch (feedError) {
            console.error(" [API] Error writing to activity feed", feedError);
            // Non-blocking error
        }

        return NextResponse.json({ success: true, data: result.data });

    } catch (error: any) {
        console.error(" [API] Critical Error:", error.message);
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
}
