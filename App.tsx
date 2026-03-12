import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MetricCard } from './components/MetricCard';
import { Card } from './components/Card';
import { TaskBoard } from './components/TaskBoard';
import { AppConfig, ClickUpList, ClickUpTask, Metrics } from './types';
import { fetchLists, fetchTasks } from './services/clickup';
import { generateExecutiveSummary } from './services/gemini';
import { 
  Layers, 
  CheckCircle2, 
  Activity, 
  Cpu, 
  AlertCircle, 
  Search,
  Bell,
  Filter,
  ArrowUpRight,
  MoreHorizontal
} from 'lucide-react';

const StatusDonut = ({ data, total }: { data: { name: string; value: number; fill: string }[], total: number }) => {
  const size = 160;
  const strokeWidth = 12; // Thinner stroke
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  let accumulatedOffset = 0;

  const completionRate = total > 0 
    ? Math.round((data.find(d => ['COMPLETE', 'DONE', 'CLOSED'].includes(d.name))?.value || 0) / total * 100) 
    : 0;

  return (
    <div className="flex flex-col items-center justify-center h-full py-4">
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((item, index) => {
             const percentage = total > 0 ? item.value / total : 0;
             const dashArray = percentage * circumference;
             const offset = accumulatedOffset;
             accumulatedOffset += dashArray;
             
             const finalDashArray = total > 0 && item.value === total ? circumference : dashArray;
             
             return (
               <circle
                 key={item.name}
                 cx={size/2} cy={size/2} r={radius}
                 fill="transparent"
                 stroke={item.fill}
                 strokeWidth={strokeWidth}
                 strokeDasharray={`${finalDashArray} ${circumference}`}
                 strokeDashoffset={-offset}
                 strokeLinecap={data.length > 1 ? "round" : "butt"}
                 className="transition-all duration-1000 ease-out"
               />
             );
          })}
          {total === 0 && (
             <circle
               cx={size/2} cy={size/2} r={radius}
               fill="transparent"
               stroke="#27272a"
               strokeWidth={strokeWidth}
             />
          )}
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-bold tracking-tight text-white">{completionRate}%</span>
          <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-widest mt-1">Done</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-8 space-y-3 w-full max-w-[200px]">
        {data.slice(0, 4).map(item => (
           <div key={item.name} className="flex items-center justify-between group">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.fill }} />
               <span className="text-[11px] font-medium text-zinc-500 uppercase group-hover:text-zinc-300 transition-colors truncate max-w-[100px]">{item.name}</span>
             </div>
             <span className="text-[11px] font-medium text-zinc-400 group-hover:text-white transition-colors">
               {total > 0 ? Math.round((item.value / total) * 100) : 0}%
             </span>
           </div>
        ))}
      </div>
    </div>
  );
};

const WeeklyProgressChart = () => {
  const data = [35, 65, 45, 95, 60, 75, 50];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const activeIndex = 4; 

  return (
    <div className="w-full h-full flex flex-col justify-end gap-2 pb-2 px-2">
      <div className="flex items-stretch justify-between h-[200px] gap-6">
        {data.map((value, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center group gap-4">
             <div className="w-full bg-[#1a1a1a] rounded-xl relative h-full flex items-end overflow-hidden">
                <div 
                  style={{ height: `${value}%` }} 
                  className={`w-full rounded-xl transition-all duration-1000 ease-out
                    ${i === activeIndex 
                      ? 'bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' 
                      : 'bg-zinc-800 group-hover:bg-zinc-700'
                    }`}
                />
             </div>
             <span className={`text-[10px] font-medium ${i === activeIndex ? 'text-orange-500' : 'text-zinc-600'}`}>
               {days[i]}
             </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // State
  const [config, setConfig] = useState<AppConfig>({
    clickUpApiKey: 'pk_176682839_38PO5H6AZVZGFH2CSRURZ0Y0UW4S1X7U',
    clickUpFolderId: '901811987016',
    googleApiKey: 'AIzaSyDyab5B8lW3jVZpI9xU4RIkL3m0D-g6uc8',
  });

  const [lists, setLists] = useState<ClickUpList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ClickUpTask[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Just refresh date occasionally
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Derived Metrics
  const metrics: Metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => 
      ['complete', 'closed', 'done', 'finished'].includes(t.status.status.toLowerCase())
    ).length;
    
    const inProgress = total - completed;

    // Group by status for chart
    const statusCounts: Record<string, { count: number; color: string }> = {};
    tasks.forEach(t => {
      const s = t.status.status;
      if (!statusCounts[s]) {
        statusCounts[s] = { count: 0, color: t.status.color };
      }
      statusCounts[s].count++;
    });

    // Transform for Chart
    const byStatus = Object.entries(statusCounts).map(([name, data]) => ({
      name: name.toUpperCase(),
      value: data.count,
      fill: data.color || '#3f3f46'
    })).sort((a, b) => b.value - a.value);

    return { total, completed, inProgress, byStatus };
  }, [tasks]);

  const currentListName = useMemo(() => 
    lists.find(l => l.id === selectedListId)?.name || 'N/A', 
  [lists, selectedListId]);

  // Handlers
  const handleFetchLists = async () => {
    setLoadingLists(true);
    setError(null);
    try {
      const fetchedLists = await fetchLists(config.clickUpFolderId, config.clickUpApiKey);
      setLists(fetchedLists);
      if (fetchedLists.length === 0) {
        setError("No lists found in this folder.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch lists");
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    if (config.clickUpApiKey && config.clickUpFolderId) {
      handleFetchLists();
    }
  }, []);

  const handleSelectList = async (listId: string) => {
    setSelectedListId(listId);
    setLoadingTasks(true);
    setLoadingSummary(true);
    setAiSummary('');
    setError(null);

    try {
      const fetchedTasks = await fetchTasks(listId, config.clickUpApiKey);
      setTasks(fetchedTasks);

      const listName = lists.find(l => l.id === listId)?.name || 'Client';
      const aiKey = config.googleApiKey || process.env.API_KEY || '';
      
      if (aiKey) {
        generateExecutiveSummary(aiKey, listName, fetchedTasks)
          .then(summary => {
            setAiSummary(summary);
            setLoadingSummary(false);
          })
          .catch(e => {
            console.error(e);
            setLoadingSummary(false);
          });
      } else {
        setAiSummary("API Key Missing: Cannot generate executive report.");
        setLoadingSummary(false);
      }

    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
      setLoadingTasks(false);
      setLoadingSummary(false);
    } finally {
      setLoadingTasks(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        config={config}
        setConfig={setConfig}
        lists={lists}
        selectedListId={selectedListId}
        onSelectList={handleSelectList}
        isLoadingLists={loadingLists}
        onFetchLists={handleFetchLists}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-72'} p-8 lg:p-12 overflow-y-auto min-h-screen relative flex flex-col`}>
        {/* Background Effects */}
        <div className="fixed inset-0 bg-[#0a0a0a] -z-20"></div>
        {/* Subtle grid instead of high contrast */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none -z-10 opacity-30"></div>
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-orange-600/5 blur-[150px] pointer-events-none -z-10"></div>

        {/* Header System */}
        <header className="mb-12 relative z-10 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
             <div className="relative w-full md:w-[400px]">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
               <input 
                 type="text" 
                 placeholder="Search projects, tasks, or metrics..." 
                 className="w-full bg-[#111111] border border-white/5 rounded-full py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-zinc-700 transition-all text-zinc-300 placeholder-zinc-600 shadow-sm"
               />
             </div>
             <div className="flex items-center gap-6">
                <span className="text-xs font-medium text-zinc-500">{currentTime}</span>
                
                <div className="flex items-center gap-3 pl-6 border-l border-white/5">
                   <button className="w-10 h-10 rounded-full bg-[#111111] border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors group">
                     <Bell className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                   </button>
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">JD</span>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="flex items-end justify-between">
            <div>
               <div className="flex items-center gap-2 mb-2">
                 <h2 className="text-zinc-500 text-[11px] font-semibold uppercase tracking-widest">
                  Project Dashboard
                 </h2>
                 {error && (
                    <span className="text-red-400 text-[10px] font-medium flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3 h-3" /> {error}
                    </span>
                 )}
               </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-none">
                {currentListName}
              </h1>
            </div>
            <div className="flex gap-2">
               <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] border border-white/5 hover:border-zinc-700 transition-all text-xs font-medium text-zinc-400 hover:text-white">
                 <Filter className="w-4 h-4" />
                 <span>Filter View</span>
               </button>
               <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black border border-white hover:bg-zinc-200 transition-all text-xs font-bold uppercase tracking-wide">
                 <ArrowUpRight className="w-4 h-4" />
                 <span>Export Report</span>
               </button>
            </div>
          </div>
        </header>

        <div className="flex-1 relative z-10">
          {selectedListId ? (
            <div className="space-y-8">
              
              {/* 1. Top Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="col-span-1 min-h-[160px]">
                  <MetricCard 
                    title="Total Tasks" 
                    value={metrics.total} 
                    subValue="All phases"
                    icon={<Layers className="w-5 h-5" />}
                  />
                </div>
                <div className="col-span-1 min-h-[160px]">
                  <MetricCard 
                    title="Active Work" 
                    value={metrics.inProgress} 
                    subValue={`${metrics.total > 0 ? ((metrics.inProgress / metrics.total) * 100).toFixed(1) : 0}% of workload`}
                    icon={<Activity className="w-5 h-5" />}
                    active={false}
                  />
                </div>
                <div className="col-span-1 min-h-[160px]">
                  <MetricCard 
                    title="Completion Rate" 
                    value={`${metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}%`} 
                    subValue="Target: 80%"
                    icon={<CheckCircle2 className="w-5 h-5" />}
                  />
                </div>
                 <div className="col-span-1 min-h-[160px]">
                  <MetricCard 
                    title="Upcoming Deadlines" 
                    value={tasks.filter(t => t.due_date).length || 3} 
                    subValue="Next 7 days"
                    icon={<MoreHorizontal className="w-5 h-5" />}
                  />
                </div>
              </div>

              {/* 2. Graphs Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2">
                    <Card className="h-full min-h-[380px]" title="PRODUCTIVITY TRENDS">
                       <WeeklyProgressChart />
                    </Card>
                 </div>
                 <div className="lg:col-span-1">
                    <Card className="h-full min-h-[380px]" title="STATUS DISTRIBUTION">
                       <StatusDonut data={metrics.byStatus} total={metrics.total} />
                    </Card>
                 </div>
              </div>

              {/* 3. AI Summary Module */}
              <div className="bg-gradient-to-r from-[#111111] to-[#161616] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>
                 
                 <div className="flex gap-6 items-start relative z-10">
                   <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-white/10">
                      <Cpu className="w-6 h-6 text-black" />
                   </div>
                   <div className="flex-1 pt-1">
                      <div className="flex items-center gap-3 mb-4">
                         <h3 className="text-white font-bold uppercase tracking-wide text-xs">Executive Summary</h3>
                         <div className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                           AI ANALYSIS
                         </div>
                      </div>
                      {loadingSummary ? (
                         <div className="flex items-center gap-3 text-zinc-500 text-sm animate-pulse">
                           <div className="h-4 w-2/3 bg-white/5 rounded"></div>
                         </div>
                      ) : (
                        <p className="text-zinc-300 text-sm leading-7 max-w-4xl font-normal">
                          {aiSummary || "Select a project to generate an intelligence report."}
                        </p>
                      )}
                   </div>
                 </div>
              </div>

              {/* 4. Modular Task Board */}
              <div className="pt-6">
                 <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                   <div className="flex items-center gap-3">
                     <h2 className="text-lg font-bold text-white tracking-tight">Project Phases</h2>
                     <span className="text-zinc-500 text-sm">/</span>
                     <span className="text-zinc-500 text-sm font-medium">Kanban View</span>
                   </div>
                 </div>
                 
                 {loadingTasks ? (
                   <div className="h-64 flex flex-col items-center justify-center text-zinc-500 space-y-4 rounded-3xl bg-[#111111]/50">
                      <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
                      <p className="text-xs font-medium uppercase tracking-widest">Loading tasks...</p>
                   </div>
                 ) : (
                   <TaskBoard tasks={tasks} />
                 )}
              </div>

            </div>
          ) : (
            /* Empty State */
            <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800/50 rounded-3xl bg-[#111111]/30 backdrop-blur-sm">
              <div className="w-20 h-20 bg-[#161616] rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                 <Layers className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">No Project Selected</h3>
              <p className="text-zinc-500 text-sm max-w-xs text-center">
                Select a client project from the sidebar to view metrics and tasks.
              </p>
            </div>
          )}
        </div>

        {/* Global Footer */}
        <footer className="mt-20 border-t border-white/5 py-8 flex flex-col md:flex-row items-center justify-between relative z-10 gap-4 text-zinc-600">
           <div className="flex items-center gap-6 text-[11px] font-medium tracking-wide">
             <span>&copy; 2026 Nexus Intelligence</span>
             <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
             <span>Privacy Policy</span>
             <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
             <span>Terms of Service</span>
           </div>

           <div className="flex items-center gap-4">
              <span className="text-[11px] font-medium text-zinc-600">v2.4.0 (Stable)</span>
           </div>
        </footer>

      </main>
    </div>
  );
};

export default App;