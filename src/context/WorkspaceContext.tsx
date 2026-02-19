"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Workspace } from "@/types/supabase";
import { supabaseClient } from "@/lib/supabase";

interface WorkspaceContextType {
    workspaces: Workspace[];
    activeWorkspaceId: string | null;
    setActiveWorkspaceId: (id: string) => void;
    isLoading: boolean;
    refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Load active workspace from localStorage on mount
    useEffect(() => {
        const storedId = localStorage.getItem("activeWorkspaceId");
        if (storedId) {
            setActiveWorkspaceId(storedId);
        }
    }, []);

    const fetchWorkspaces = async () => {
        setIsLoading(true);
        try {
            // Use the singleton client from lib/supabase
            // Check for mock mode via public URL check if needed, or rely on client behavior.
            // But since we are debugging RLS, let's assume we want real data if env is set.
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const isMock = !supabaseUrl || supabaseUrl.includes("placeholder");

            if (isMock) {
                console.warn("[WorkspaceContext] Supabase URL missing or placeholder. Using mock data.");
                const mockWorkspaces = [
                    { id: "ws-1", name: "Laboral - Ebox", slug: "laboral-ebox", user_id: "user-1" },
                    { id: "ws-2", name: "Personal", slug: "personal", user_id: "user-1" },
                    { id: "ws-3", name: "Proyecto X", slug: "proyecto-x", user_id: "user-1" },
                ];
                setWorkspaces(mockWorkspaces);
                if (!activeWorkspaceId && mockWorkspaces.length > 0) {
                    setActiveWorkspaceId(mockWorkspaces[0].id);
                    localStorage.setItem("activeWorkspaceId", mockWorkspaces[0].id);
                }
                return;
            }

            const { data, error } = await supabaseClient.from("workspaces").select("*");

            if (error) {
                console.error("Error fetching workspaces:", JSON.stringify(error, null, 2));
                return;
            }

            console.log(`[WorkspaceContext] Workspaces fetched: ${data?.length || 0}`);

            if (data) {
                setWorkspaces(data);

                // Validate activeWorkspaceId against fetched data
                const isValidId = data.some(w => w.id === activeWorkspaceId);

                if (!activeWorkspaceId || (activeWorkspaceId && !isValidId)) {
                    console.log("[WorkspaceContext] Auto-selecting first workspace.");

                    if (data.length > 0) {
                        const firstId = data[0].id;
                        setActiveWorkspaceId(firstId);
                        localStorage.setItem("activeWorkspaceId", firstId);
                    } else {
                        setActiveWorkspaceId(null);
                        localStorage.removeItem("activeWorkspaceId");
                    }
                }
            }
        } catch (err) {
            console.error("Critical error in fetchWorkspaces:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchWorkspaces();
    }, []); // Only run once on mount

    // Update localStorage when activeWorkspaceId changes
    const handleSetActiveWorkspaceId = (id: string) => {
        setActiveWorkspaceId(id);
        localStorage.setItem("activeWorkspaceId", id);
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
