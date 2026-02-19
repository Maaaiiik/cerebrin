"use client";

import { useWorkspace } from "@/context/WorkspaceContext";
import { supabaseClient } from "@/lib/supabase";
import {
  Lightbulb,
  FileText,
  BrainCircuit,
  TrendingUp,
  Activity,
  Calendar,
  Layers
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Home() {
  const { activeWorkspaceId, workspaces, isLoading: isContextLoading } = useWorkspace();
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  const [stats, setStats] = useState({
    ideasCount: 0,
    activeTasksCount: 0,
    upcomingTasks: [] as any[],
    activeProjects: [] as any[],
    recentActivity: [] as any[],
    loading: true
  });

  useEffect(() => {
    async function fetchStats() {
      if (!activeWorkspaceId) return;

      setStats(prev => ({ ...prev, loading: true }));

      // Mock Mode Fallback
      if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder")) {
        setTimeout(() => {
          setStats({
            ideasCount: 12,
            activeTasksCount: 4,
            upcomingTasks: [
              { id: "1", title: "Informe Trimestral Ebox", due_date: new Date().toISOString(), category: "En Progreso" },
              { id: "2", title: "Revisión de Contrato", due_date: new Date(Date.now() + 86400000).toISOString(), category: "Investigación" }
            ],
            activeProjects: [],
            recentActivity: [
              { id: "1", action_type: "promote_idea", description: "Idea promovida a proyecto", created_at: new Date().toISOString() },
              { id: "2", action_type: "agent_sync", description: "Sincronización de agente completada", created_at: new Date(Date.now() - 3600000).toISOString() }
            ],
            loading: false
          });
        }, 1000);
        return;
      }

      try {
        // 1. Counts
        const { count: ideasCount } = await supabaseClient
          .from("idea_pipeline")
          .select("*", { count: 'exact', head: true })
          .eq("workspace_id", activeWorkspaceId);

        const { count: tasksCount } = await supabaseClient
          .from("documents")
          .select("*", { count: 'exact', head: true })
          .eq("workspace_id", activeWorkspaceId)
          .neq("category", "Finalizado");

        // 2. Upcoming Tasks
        const { data: upcoming } = await supabaseClient
          .from("documents")
          .select("id, title, due_date, category")
          .eq("workspace_id", activeWorkspaceId)
          .neq("category", "Finalizado") // Only active tasks
          .not("due_date", "is", null)
          .order("due_date", { ascending: true })
          .limit(5);

        // 3. Active Projects (Top level docs with tag 'proyecto')
        const { data: projects } = await supabaseClient
          .from("documents")
          .select("id, title, category, ai_analysis")
          .eq("workspace_id", activeWorkspaceId)
          .contains("tags", ["proyecto"])
          .neq("category", "Finalizado")
          .limit(3);

        // 4. Recent Activity
        const { data: activity } = await supabaseClient
          .from("activity_feed")
          .select("id, action_type, description, created_at")
          .eq("workspace_id", activeWorkspaceId)
          .order("created_at", { ascending: false })
          .limit(4);

        setStats({
          ideasCount: ideasCount || 0,
          activeTasksCount: tasksCount || 0,
          upcomingTasks: upcoming || [],
          activeProjects: projects || [],
          recentActivity: activity || [],
          loading: false
        });

      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    }

    if (!isContextLoading) fetchStats();
  }, [activeWorkspaceId, isContextLoading]);

  const skeletonCard = (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-4 w-32" />
    </div>
  );

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
            Hola, Miguel
          </h1>
          <div className="text-slate-400 mt-1 flex items-center gap-2">
            Contexto Activo:
            {isContextLoading ? (
              <Skeleton className="h-4 w-24 inline-block ml-1" />
            ) : (
              <span className="text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {activeWorkspace?.name || "Selecciona un Workspace"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-medium text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Agente OpenClaw Activo
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.loading ? (
          <>
            {skeletonCard}
            {skeletonCard}
            {skeletonCard}
          </>
        ) : (
          <>
            {/* Metric 1 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-indigo-500/50 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <Lightbulb size={24} />
                </div>
                <span className="text-3xl font-bold text-slate-100">{stats.ideasCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-slate-400 font-medium text-sm">Ideas en Incubadora</h3>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
            </motion.div>

            {/* Metric 2 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-purple-500/50 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <FileText size={24} />
                </div>
                <span className="text-3xl font-bold text-slate-100">{stats.activeTasksCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-slate-400 font-medium text-sm">Tareas Activas</h3>
                <Activity size={16} className="text-blue-500" />
              </div>
            </motion.div>

            {/* Metric 3 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-pink-500/50 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl group-hover:bg-pink-500 group-hover:text-white transition-colors">
                  <BrainCircuit size={24} />
                </div>
                <span className="text-3xl font-bold text-slate-100">92%</span>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-slate-400 font-medium text-sm">Precisión del Agente</h3>
                <span className="text-xs text-slate-500">Última sync: 5m</span>
              </div>
            </motion.div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Active Projects (Workspace Specific) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <BrainCircuit size={18} className="text-blue-400" />
            Proyectos Activos
          </h2>
          {stats.loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : stats.activeProjects?.length === 0 ? (
            <div className="text-slate-500 text-sm py-4">
              No hay proyectos activos.
              <br />
              <Link href="/documents" className="text-indigo-400 hover:underline mt-2 inline-block">crear uno</Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {stats.activeProjects?.map((proj: any) => (
                <li key={proj.id} className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 hover:border-blue-500/30 transition-all group">
                  <h3 className="text-slate-200 font-semibold text-sm group-hover:text-blue-400 transition-colors">{proj.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{proj.ai_analysis || "Sin descripción"}</p>
                  <span className="inline-block mt-2 text-[10px] uppercase font-bold text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded">
                    {proj.category}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Due Dates (Workspace Specific) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-orange-400" />
            Próximos Vencimientos
          </h2>
          {stats.loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : stats.upcomingTasks.length === 0 ? (
            <div className="text-slate-500 text-sm py-4">
              No hay tareas próximas a vencer.
            </div>
          ) : (
            <ul className="space-y-3">
              {stats.upcomingTasks.map((task: any) => (
                <li key={task.id} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 hover:border-orange-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${new Date(task.due_date) < new Date() ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                    <div>
                      <p className="text-slate-200 font-medium text-sm line-clamp-1">{task.title}</p>
                      <span className="text-xs text-slate-500">{task.category}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-mono px-2 py-1 rounded ${new Date(task.due_date) < new Date() ? 'text-red-300 bg-red-500/10' : 'text-orange-300 bg-orange-500/10'}`}>
                    {format(new Date(task.due_date), "d MMM", { locale: es })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Activity Feed Mini (Workspace Specific) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-emerald-400" />
            Actividad Reciente
          </h2>
          {stats.loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : stats.recentActivity.length === 0 ? (
            <div className="text-slate-500 text-sm py-4">
              Sin actividad reciente.
            </div>
          ) : (
            <div className="relative border-l border-slate-800 ml-2 space-y-4">
              {stats.recentActivity.map((activity: any, idx) => (
                <div key={activity.id} className="pl-6 relative">
                  <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-800 border-2 border-slate-600"></div>
                  <p className="text-sm text-slate-300 line-clamp-2">{activity.description}</p>
                  <span className="text-xs text-slate-500">
                    {format(new Date(activity.created_at), "HH:mm aaa", { locale: es })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
