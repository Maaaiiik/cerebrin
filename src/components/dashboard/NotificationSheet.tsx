"use client";

import React, { useEffect } from "react";
import { X, Check, Clock, BrainCircuit, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/components/providers/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface NotificationSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationSheet({ isOpen, onClose }: NotificationSheetProps) {
    const { notifications, unreadCount, markAllAsRead, refresh } = useNotifications();

    useEffect(() => {
        if (isOpen) {
            refresh();
        }
    }, [isOpen]);

    const getIcon = (actionType: string) => {
        if (actionType.includes("idea")) return <BrainCircuit size={16} className="text-pink-400" />;
        if (actionType.includes("error")) return <AlertCircle size={16} className="text-red-400" />;
        return <Clock size={16} className="text-indigo-400" />;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-[70] flex flex-col"
                    >
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
                            <div>
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    Notificaciones
                                    {unreadCount > 0 && (
                                        <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">
                                            {unreadCount} nuevas
                                        </span>
                                    )}
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">Actividad reciente del sistema</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {notifications.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Clock size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No hay actividad reciente</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className="group p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/30 rounded-xl transition-all relative"
                                    >
                                        <div className="flex gap-4">
                                            <div className="mt-1 p-2 bg-slate-900 rounded-lg h-fit border border-slate-700/50">
                                                {getIcon(notification.action_type || "")}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-medium text-indigo-400 px-1.5 py-0.5 bg-indigo-500/10 rounded uppercase tracking-wider">
                                                        {notification.action_type?.replace(/_/g, " ")}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-mono">
                                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    {notification.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-800 bg-slate-900">
                            <button
                                onClick={markAllAsRead}
                                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Check size={18} />
                                Marcar todo como leído
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
