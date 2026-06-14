import React, { useMemo } from 'react';
import { ClickUpList, ClickUpTask, Metrics } from '../types';
import { MetricCard } from './MetricCard';
import { Card } from './Card';
import { Users, Folder, Layers, Clock, ArrowRight, Activity, ServerCrash } from 'lucide-react';
import { StatusDonut } from './StatusDonut';
import { DocumentsCard } from './DocumentsCard';
import { getPhaseData } from './phaseUtils';

interface DashboardOverviewProps {
  lists: ClickUpList[];
  allTasks: ClickUpTask[];
  loadingAllTasks: boolean;
  overallAiSummary: string;
  loadingOverallSummary: boolean;
  onNavigateToList: (listId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  lists,
  allTasks,
  loadingAllTasks,
  overallAiSummary,
  loadingOverallSummary,
  onNavigateToList
}) => {
  const overallMetrics: Metrics = useMemo(() => {
    const total = allTasks.length;
    const completed = allTasks.filter(t => 
      ['complete', 'closed', 'done', 'finished'].includes(t.status.status.toLowerCase())
    ).length;
    const inProgress = total - completed;

    const statusCounts: Record<string, { count: number; color: string }> = {};
    allTasks.forEach(t => {
      const s = t.status.status;
      if (!statusCounts[s]) {
        statusCounts[s] = { count: 0, color: t.status.color };
      }
      statusCounts[s].count++;
    });

    const byStatus = Object.entries(statusCounts).map(([name, data]) => ({
      name: name.toUpperCase(),
      value: data.count,
      fill: data.color || '#3f3f46'
    })).sort((a, b) => b.value - a.value);

    return { total, completed, inProgress, byStatus };
  }, [allTasks]);

  const upcomingDeadlinesCount = useMemo(() => {
    let activeDeadlines = 0;
    lists.forEach(list => {
      const listTasks = allTasks.filter(t => t.listId === list.id);
      const phaseData = getPhaseData(listTasks);
      activeDeadlines += phaseData.count;
    });
    return activeDeadlines;
  }, [lists, allTasks]);

  const projectsHealth = useMemo(() => {
    return lists.map(list => {
      const listTasks = allTasks.filter(t => t.listId === list.id);
      const totalTasks = listTasks.length;
      const completedTasks = listTasks.filter(t => ['complete', 'closed', 'done', 'finished'].includes(t.status.status.toLowerCase())).length;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      let status = 'To Do';
      // simple logic. If all closed -> Closed. If some > 0 -> In Progress. Else To Do. Wait, lists don't have statuses, I'll derive from tasks.
      if (totalTasks > 0) {
        if (completedTasks === totalTasks) status = 'Closed';
        else if (completedTasks > 0 || listTasks.some(t => t.status.status.toLowerCase() === 'in progress' || t.status.status.toLowerCase() === 'doing')) {
          status = 'In Progress';
        } else status = 'To Do';
      }

      const phaseData = getPhaseData(listTasks);
      const phaseString = phaseData.phaseName ? `${phaseData.phaseName} • ${phaseData.daysText}` : 'Planning';

      // We can map status to specific styling
      return {
        id: list.id,
        name: list.name,
        phase: phaseString,
        completionPercentage,
        status,
        totalTasks
      };
    });
  }, [lists, allTasks]);

  const recentActivity = useMemo(() => {
    // We sort by date_created (or date_updated if available) descending
    // Since ClickUp API returns epoch strings for date_created/date_updated, we parse them
    return [...allTasks]
      .sort((a, b) => {
        const dateA = parseInt(a.date_updated || a.date_created || '0');
        const dateB = parseInt(b.date_updated || b.date_created || '0');
        return dateB - dateA;
      })
      .slice(0, 6)
      .map(t => {
        const date = new Date(parseInt(t.date_updated || t.date_created || '0'));
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        let timeAgo = '';
        if (diffMins < 60) timeAgo = `${diffMins}m ago`;
        else if (diffMins < 1440) timeAgo = `${Math.floor(diffMins / 60)}h ago`;
        else timeAgo = `${Math.floor(diffMins / 1440)}d ago`;

        return {
          id: t.id,
          taskName: t.name,
          projectName: t.listName || 'Unknown Project',
          action: `Status changed to ${t.status.status}`, // Simulated action
          timeAgo,
          color: t.status.color
        };
      });
  }, [allTasks]);

  if (loadingAllTasks) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-500 space-y-4 rounded-lg bg-[#070707]/30 backdrop-blur-sm border-2 border-dashed border-zinc-800/50">
         <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
         <p className="text-xs font-medium uppercase tracking-widest">Compiling Overview Data...</p>
      </div>
    );
  }

  // Stat Cards Row (4 cards): Total Clients (users icon), Active Projects (folder icon), Total Open Tasks across all projects (layers icon), Upcoming Deadlines in next 7 days (clock icon). Pull real numbers from existing ClickUp data.
  // We use lists.length for Total Clients and Active Projects (assuming 1 list = 1 client).

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="col-span-1 min-h-[160px]">
          <MetricCard 
            title="Total Clients" 
            value={lists.length} 
            subValue="Active partnerships"
            icon={<Users className="w-5 h-5" />}
          />
        </div>
        <div className="col-span-1 min-h-[160px]">
          <MetricCard 
            title="Active Projects" 
            value={lists.length} 
            subValue="Across all clients"
            icon={<Folder className="w-5 h-5" />}
          />
        </div>
        <div className="col-span-1 min-h-[160px]">
          <MetricCard 
            title="Total Open Tasks" 
            value={overallMetrics.inProgress} 
            subValue="Across all projects"
            icon={<Layers className="w-5 h-5" />}
          />
        </div>
          <div className="col-span-1 min-h-[160px]">
          <MetricCard 
            title="Upcoming Deadlines" 
            value={upcomingDeadlinesCount} 
            subValue="Across active phases"
            icon={<Clock className="w-5 h-5" />}
          />
        </div>
      </div>

      {/* 2. Projects Health Table */}
      <Card title="Projects Health" className="min-h-[380px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4">Project Name</th>
                <th className="pb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4">Current Phase</th>
                <th className="pb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4">Task Completion</th>
                <th className="pb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {projectsHealth.length > 0 ? projectsHealth.map((project, idx) => (
                <tr 
                  key={project.id} 
                  className={`border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors group ${idx === projectsHealth.length - 1 ? 'border-b-0' : ''}`}
                  onClick={() => onNavigateToList(project.id)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5 group-hover:border-zinc-700 transition-colors">
                        <Folder className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
                      </div>
                      <span className="font-semibold text-sm text-zinc-200 group-hover:text-white tracking-wide">{project.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-zinc-400">
                    {project.phase}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-[150px] w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-[#ff4d00]" 
                          style={{ width: `${project.completionPercentage}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-zinc-400 font-mono w-8">{project.completionPercentage}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      project.status === 'Closed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      project.status === 'In Progress' ? 'bg-[#ff4d00]/10 text-[#ff4d00] border-[#ff4d00]/20' :
                      project.status === 'On Hold' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {project.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-600 text-sm">
                    No active projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bottom row two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="min-h-[380px]" title="STATUS DISTRIBUTION">
          <StatusDonut data={overallMetrics.byStatus} total={overallMetrics.total} />
        </Card>
        <DocumentsCard className="min-h-[380px]" />
      </div>

      <div className="grid grid-cols-1 mb-6">
        {/* Left side — Recent Activity feed */}
        <Card title="Recent Activity" className="min-h-[380px]">
          <div className="space-y-6 mt-2">
            {recentActivity.length > 0 ? recentActivity.map((activity, idx) => (
              <div key={activity.id + idx} className="flex gap-4 relative group">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: activity.color || '#ff4d00' }}></div>
                  {idx !== recentActivity.length - 1 && (
                    <div className="w-px h-full bg-white/5 my-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-sm text-zinc-300 font-medium leading-snug group-hover:text-white transition-colors">
                        {activity.taskName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{activity.projectName}</span>
                        <span className="text-zinc-700 text-[10px]">•</span>
                        <span className="text-[11px] text-zinc-400">{activity.action}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">{activity.timeAgo}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-zinc-600 text-sm">
                No recent activity.
              </div>
            )}
          </div>
        </Card>

      </div>

       {/* AI Summary Module */}
       <div className="bg-gradient-to-r from-[#070707] to-[#0a0a0a] border border-white/5 rounded-lg p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="flex gap-6 items-start relative z-10">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-white/10">
               <Activity className="w-6 h-6 text-black" />
            </div>
            <div className="flex-1 pt-1">
               <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-white font-bold uppercase tracking-wide text-xs">Executive Summary</h3>
                  <div className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                    AI ANALYSIS
                  </div>
               </div>
               {loadingOverallSummary ? (
                  <div className="flex items-center gap-3 text-zinc-500 text-sm animate-pulse">
                    <div className="h-4 w-2/3 bg-white/5 rounded"></div>
                  </div>
               ) : (
                 <p className="text-zinc-300 text-sm leading-7 max-w-4xl font-normal">
                   {overallAiSummary || "Gathering intelligence across all client projects..."}
                 </p>
               )}
            </div>
          </div>
       </div>
    </div>
  );
};
