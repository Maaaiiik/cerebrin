import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Document, Idea, KanbanItem } from "@/types/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";

export function useKanbanData(workspaceIdsFilter: string[] = []) {
    const { activeWorkspaceId } = useWorkspace();
    const [items, setItems] = useState<KanbanItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        setLoading(true);

        try {
            // Build Queries
            let docQuery = supabaseClient
                .from("documents")
                .select("*")
                .order("created_at", { ascending: false });

            let ideaQuery = supabaseClient
                .from("idea_pipeline")
                .select("*")
                .neq("status", "draft");

            // Apply Filter
            // If filter has items, use IN
            if (workspaceIdsFilter.length > 0) {
                docQuery = docQuery.in("workspace_id", workspaceIdsFilter);
                ideaQuery = ideaQuery.in("workspace_id", workspaceIdsFilter);
            }
            // If filter is empty, we fetch ALL (requested behavior default to ALL)
            // No need to filter by activeWorkspaceId logic anymore as per "Autonomy" requirement.

            // Execute
            const [docRes, ideaRes] = await Promise.all([docQuery, ideaQuery]);

            if (docRes.error) throw docRes.error;
            if (ideaRes.error) throw ideaRes.error;

            const docs = docRes.data as Document[] || [];
            const ideas = ideaRes.data as Idea[] || [];

            // 3. Unify Data
            const unifiedItems: KanbanItem[] = [];

            // Map Documents
            docs.forEach((doc) => {
                unifiedItems.push({
                    id: doc.id,
                    title: doc.title,
                    status: doc.category,
                    type: 'document',
                    priority: doc.priority_score || 5,
                    workspace_id: doc.workspace_id,
                    doc_type: (doc as any).type || 'markdown',
                    external_url: (doc as any).external_url,
                    parent_id: doc.parent_id || undefined,
                    due_date: doc.due_date || undefined,
                    tags: doc.tags,
                    original_data: doc
                });
            });

            // Map Ideas
            ideas.forEach((idea) => {
                let mappedStatus = "Investigación";
                if (idea.status === "evaluating") mappedStatus = "Investigación";
                if (idea.status === "prioritized") mappedStatus = "Investigación"; // Or mapped to others
                if (idea.status === "executed") mappedStatus = "En Progreso";

                // Fallback for any other status
                if (!["Investigación", "En Progreso", "Finalizado"].includes(mappedStatus)) {
                    mappedStatus = "Investigación";
                }

                unifiedItems.push({
                    id: idea.id,
                    title: idea.title,
                    status: mappedStatus,
                    type: 'idea',
                    priority: idea.priority_score,
                    workspace_id: idea.workspace_id,
                    description: idea.description,
                    start_date: idea.start_date,
                    due_date: idea.due_date,
                    original_data: idea
                });
            });

            setItems(unifiedItems);

        } catch (error) {
            console.error("Error fetching Kanban data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [JSON.stringify(workspaceIdsFilter)]); // Re-fetch if filter array changes (deep compare)

    return { items, loading, refresh: fetchAll, setItems }; // Expose setItems for optimistic updates
}
