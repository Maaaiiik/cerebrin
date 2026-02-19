import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { targetUserId, targetWorkspaceId } = body;

        if (!targetUserId) {
            return NextResponse.json({ error: "Target User ID is required" }, { status: 400 });
        }

        const report = {
            documentsUpdated: 0,
            apiKeysUpdated: 0,
            errors: [] as string[]
        };

        // 1. Update Documents (user_id IS NULL)
        const { data: docs, error: docFetchError } = await supabaseAdmin
            .from("documents")
            .select("id")
            .is("user_id", null);

        if (docFetchError) {
            report.errors.push(`Error fetching docs: ${docFetchError.message}`);
        } else if (docs && docs.length > 0) {
            const { error: docUpdateError, count } = await supabaseAdmin
                .from("documents")
                .update({ user_id: targetUserId })
                .is("user_id", null)
                .select(); // select to get count if needed, or stick to result properties

            if (docUpdateError) {
                report.errors.push(`Error updating docs: ${docUpdateError.message}`);
            } else {
                // re-fetch count or trust the operation
                report.documentsUpdated = docs.length;
            }
        }

        // 2. Update API Keys (workspace_id IS NULL)
        // Only if targetWorkspaceId is provided
        if (targetWorkspaceId) {
            const { data: keys, error: keyFetchError } = await supabaseAdmin
                .from("api_keys")
                .select("id")
                .is("workspace_id", null);

            if (keyFetchError) {
                report.errors.push(`Error fetching keys: ${keyFetchError.message}`);
            } else if (keys && keys.length > 0) {
                const { error: keyUpdateError } = await supabaseAdmin
                    .from("api_keys")
                    .update({ workspace_id: targetWorkspaceId })
                    .is("workspace_id", null);

                if (keyUpdateError) {
                    report.errors.push(`Error updating keys: ${keyUpdateError.message}`);
                } else {
                    report.apiKeysUpdated = keys.length;
                }
            }
        }

        return NextResponse.json({ success: true, report });

    } catch (error: any) {
        console.error("[Migration API] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
