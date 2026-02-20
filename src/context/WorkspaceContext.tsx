"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Workspace } from "@/types/supabase";
import { supabaseClient } from "@/lib/supabase";

interface WorkspaceContextType {
    workspaces: Workspace[];
    activeWorkspaceId: string | null;
    setActiveWorkspaceId: (id: string | null) => void;
    isLoading: boolean;
    refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchWorkspaces = async () => {
        setIsLoading(true);
        try {
            // 1. Check Auth
            const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

            if (authError || !user) {
                console.warn("[WorkspaceContext] No user found, redirecting to login.");
                router.push("/login");
                return;
            }

            // 2. Fetch Workspaces for User
            // TODO: Switch to `workspace_members` when RBAC is fully live.
            // For now, fetch workspaces created by user OR where they are members.
            const { data, error } = await supabaseClient
                .from("workspaces")
                .select("*")
            //.eq('user_id', user.id); // Strict ownership for now
            // Actually, let's allow fetching all if policy permits, but we should filter.

            if (error) {
                console.error("Error fetching workspaces:", error);
                return;
            }

            if (data) {
                setWorkspaces(data);

                // Logic to set active workspace
                const storedId = localStorage.getItem("activeWorkspaceId");
                const isValidId = data.some(w => w.id === storedId);

                if (storedId && isValidId) {
                    setActiveWorkspaceId(storedId);
                } else if (data.length > 0) {
                    setActiveWorkspaceId(data[0].id);
                    localStorage.setItem("activeWorkspaceId", data[0].id);
                } else {
                    setActiveWorkspaceId(null);
                }
            }

        } catch (err) {
            console.error("Critical error in fetchWorkspaces:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkspaces();

        // Listen for auth changes
        const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') fetchWorkspaces();
            if (event === 'SIGNED_OUT') {
                setWorkspaces([]);
                setActiveWorkspaceId(null);
                router.push("/login");
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const handleSetActiveWorkspaceId = (id: string | null) => {
        setActiveWorkspaceId(id);
        if (id) {
            localStorage.setItem("activeWorkspaceId", id);
        } else {
            localStorage.removeItem("activeWorkspaceId");
        }
    };

    return (
        <WorkspaceContext.Provider
            value={{
                workspaces,
                activeWorkspaceId,
                setActiveWorkspaceId: handleSetActiveWorkspaceId,
                isLoading,
                refreshWorkspaces: fetchWorkspaces,
            }}
        >
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error("useWorkspace must be used within a WorkspaceProvider");
    }
    return context;
}
