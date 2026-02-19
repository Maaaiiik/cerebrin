"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";

interface Notification {
    id: string;
    action_type: string;
    description: string;
    created_at: string;
    read: boolean;
    metadata?: any;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { activeWorkspaceId } = useWorkspace();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        if (!activeWorkspaceId) return;

        try {
            // Fetch recent 20 activities
            const { data, error } = await supabaseClient
                .from("activity_feed")
                .select("*")
                .eq("workspace_id", activeWorkspaceId)
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;

            // In a real app, we would have a 'read_status' table or column. 
            // For now, we'll assume locally that everything is unread unless marked locally
            // OR we can add a 'read' column to activity_feed if we want to persist it.
            // Given the scope, let's just map the data and use local state for "new" since last load?
            // actually, let's assume we want to just show the latest.

            // Better approach for MVP:
            // Just show the list. "Unread" count could be "Activity in last 24h" or simple local storage timestamp comparison.
            // Let's stick to a simple list first.

            const mapped = data.map((item: any) => ({
                ...item,
                read: false // Default to false for now, logic can be enhanced
            }));

            setNotifications(mapped);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Optional: Realtime subscription
        const channel = supabaseClient
            .channel('public:activity_feed')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'activity_feed', filter: activeWorkspaceId ? `workspace_id=eq.${activeWorkspaceId}` : undefined },
                (payload) => {
                    console.log('New notification:', payload);
                    fetchNotifications(); // Refresh on new event
                }
            )
            .subscribe();

        return () => {
            supabaseClient.removeChannel(channel);
        };
    }, [activeWorkspaceId]);

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
            loading,
            markAsRead,
            markAllAsRead,
            refresh: fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}
