import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from './Card';
import { MetricCard } from './MetricCard';
import { StatusDonut } from './StatusDonut';
import { TaskBoard } from './TaskBoard';
import { DocumentsCard } from './DocumentsCard';
import { fetchTasks, fetchLists } from '../services/clickup';
import { ClickUpTask, Metrics, ClickUpList } from '../types';

import { 
  Layers, 
  CheckCircle2, 
  Activity, 
  MoreHorizontal,
  Lock,
  ArrowRight
} from 'lucide-react';

export const ClientPortal: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState(['', '', '', '', '']);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [errorAuth, setErrorAuth] = useState<string | null>(null);
  
  const [listId, setListId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [displayClientId, setDisplayClientId] = useState<string>('');
  
  const [tasks, setTasks] = useState<ClickUpTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for existing valid session
    const storedAuth = localStorage.getItem(`portal_auth_${clientId}`);
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
          setListId(parsed.listId);
          setClientName(parsed.clientName);
          setDisplayClientId(parsed.clientId);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(`portal_auth_${clientId}`);
        }
      } catch (err) {
        // ignore JSON parse error
      }
    }
    setLoadingAuth(false);
  }, [clientId]);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const pastedChars = pastedData.split('').slice(0, 5);
    
    if (pastedChars.length > 0) {
      const newCode = [...accessCode];
      pastedChars.forEach((char, index) => {
        newCode[index] = char;
      });
      setAccessCode(newCode);
      const focusIndex = Math.min(pastedChars.length, 4);
      document.getElementById(`pin-${focusIndex}`)?.focus();
    }
  };

  const handlePinChange = (index: number, value: string) => {
    const val = value.toUpperCase();
    if (val.length > 1) {
      // Handle paste
      const pasted = val.slice(0, 5).split('');
      const newCode = [...accessCode];
      pasted.forEach((char, i) => {
        if (/^[A-Z0-9]$/.test(char) && index + i < 5) {
          newCode[index + i] = char;
        }
      });
      setAccessCode(newCode);
      // focus last filled
    } else if (/^[A-Z0-9]$/.test(val) || val === '') {
      const newCode = [...accessCode];
      newCode[index] = val;
      setAccessCode(newCode);
      if (val !== '' && index < 4) {
        document.getElementById(`pin-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && accessCode[index] === '' && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = accessCode.join('');
    if (code.length !== 5) return;
    
    setLoadingAuth(true);
    setErrorAuth(null);
    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, accessCode: code })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      setIsAuthenticated(true);
      setListId(data.listId);
      setClientName(data.clientName);
      setDisplayClientId(data.clientId);
      
      // Store in localStorage with 1 day expiration
      localStorage.setItem(`portal_auth_${clientId}`, JSON.stringify({
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        listId: data.listId,
        clientName: data.clientName,
        clientId: data.clientId
      }));
    } catch (err: any) {
      setErrorAuth(err.message);
    } finally {
      setLoadingAuth(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && listId) {
      setLoadingTasks(true);
      
      // Fetch both tasks and lists in parallel
      Promise.all([
        fetchTasks(listId, ''),
        fetchLists('', '') // Folder ID and API key are handled by the server endpoint
      ])
        .then(([fetchedTasks, fetchedLists]) => {
          setTasks(fetchedTasks);
          const currentList = fetchedLists.find(l => l.id === listId);
          if (currentList) {
            setProjectName(currentList.name);
          }
        })
        .catch(err => {
          console.error(err);
          setErrorTasks(err.message || 'Failed to fetch tasks or project info');
        })
        .finally(() => {
          setLoadingTasks(false);
        });
    }
  }, [isAuthenticated, listId]);

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

    const byStatus = Object.entries(statusCounts).map(([name, data]) => ({
      name: name.toUpperCase(),
      value: data.count,
      fill: data.color || '#3f3f46'
    })).sort((a, b) => b.value - a.value);

    return { total, completed, inProgress, byStatus };
  }, [tasks]);

  const currentPhaseData = useMemo(() => {
    if (!tasks || tasks.length === 0) return { count: 0, daysText: "Next 7 days" };

    const getParentId = (t: ClickUpTask): string | null => {
      if (!t.parent) return null;
      if (typeof t.parent === 'object' && (t.parent as any).id) return (t.parent as any).id;
      return String(t.parent);
    };
    
    const tasksById = new Map<string, ClickUpTask>();
    const childrenByParent = new Map<string, ClickUpTask[]>();
    const roots: ClickUpTask[] = [];

    tasks.forEach(t => tasksById.set(t.id, t));

    tasks.forEach(t => {
      const pId = getParentId(t);
      if (pId && tasksById.has(pId)) {
        if (!childrenByParent.has(pId)) childrenByParent.set(pId, []);
        childrenByParent.get(pId)!.push(t);
      } else {
        roots.push(t);
      }
    });

    const STAGES = [
      { id: 'planning', label: 'Planning', keywords: ['planning', 'strategy', 'discovery'] },
      { id: 'design', label: 'Design', keywords: ['design', 'wireframe', 'ui', 'ux'] },
      { id: 'revision', label: 'Revision', keywords: ['revision', 'feedback', 'review'] },
      { id: 'testing', label: 'Testing', keywords: ['testing', 'qa', 'staging'] },
      { id: 'handoff', label: 'Handoff', keywords: ['handoff', 'delivery', 'live', 'prod'] }
    ];

    const buckets = STAGES.map(stage => ({ ...stage, items: [] as ClickUpTask[], mainTask: null as ClickUpTask | null }));

    roots.forEach(root => {
      const statusLower = root.status.status.toLowerCase();
      const nameLower = root.name.toLowerCase();
      let targetBucketIndex = -1;
      for (let i = 0; i < buckets.length; i++) {
        if (buckets[i].keywords.some(k => statusLower.includes(k) || nameLower.includes(k))) {
          targetBucketIndex = i;
          break;
        }
      }
      if (targetBucketIndex !== -1) {
        buckets[targetBucketIndex].items.push(root);
        if (childrenByParent.has(root.id)) {
          buckets[targetBucketIndex].items.push(...childrenByParent.get(root.id)!);
        }
      }
    });

    buckets.forEach(bucket => {
        const exactMatch = bucket.items.find(t => t.name.trim().toLowerCase() === bucket.label.toLowerCase());
        const looseMatch = bucket.items.find(t => t.name.toLowerCase().includes(bucket.label.toLowerCase()));
        bucket.mainTask = exactMatch || looseMatch || null;
    });

    const isDone = (status?: string) => ['complete', 'closed', 'done', 'finished'].includes(status?.toLowerCase() || '');
    const isInProgress = (status?: string) => ['in progress', 'running', 'doing', 'active', 'development', 'in review', 'review'].includes(status?.toLowerCase() || '');

    let activeBucket = buckets.find(b => b.mainTask && isInProgress(b.mainTask.status.status));
    if (!activeBucket) {
        activeBucket = buckets.find(b => b.mainTask && !isDone(b.mainTask.status.status));
    }
    if (!activeBucket && buckets.some(b => b.mainTask)) {
        activeBucket = [...buckets].reverse().find(b => b.mainTask); 
    }

    if (!activeBucket || !activeBucket.mainTask) return { count: 0, daysText: "Next 7 days" };

    const activeSubtasks = activeBucket.items.filter(t => t.id !== activeBucket!.mainTask!.id && !isDone(t.status.status));
    const count = activeSubtasks.length;
    
    const rootTarget = activeBucket.mainTask;

    let daysText = "-";
    if (rootTarget.start_date && rootTarget.due_date) {
        const start = new Date(parseInt(rootTarget.start_date));
        const due = new Date(parseInt(rootTarget.due_date));
        const diffTime = Math.abs(due.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysText = `${diffDays} Days Phase`;
    } else if (rootTarget.due_date) {
        const due = new Date(parseInt(rootTarget.due_date));
        const now = new Date();
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) daysText = `${Math.abs(diffDays)} Days Overdue`;
        else daysText = `${diffDays} Days Left`;
    } else {
        daysText = "No Dates Set";
    }

    return { count, daysText };
  }, [tasks]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#040404] flex items-center justify-center p-4 selection:bg-[#ff4d00]/30 font-sans">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#ff4d00]/5 blur-[120px] pointer-events-none"></div>

        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 md:p-12 w-full max-w-md relative z-10 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <img 
              src="https://raw.githubusercontent.com/Muhammad7Ali/IDE-MIND-Assest-/main/IDE%20MIND%20Logo(2000%20x%201000%20px).png" 
              alt="IDE MIND Logo" 
              className="w-32 h-auto object-contain mb-8" 
            />
            <div className="w-12 h-12 bg-zinc-900 border border-white/5 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-[#ff4d00]" />
            </div>
            <h1 className="text-2xl font-bold text-white font-display tracking-tight text-center">Client Portal</h1>
            <p className="text-zinc-500 text-sm mt-2 text-center">Enter your 5-character access code</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="flex justify-center gap-2 sm:gap-3">
              {accessCode.map((digit, i) => (
                <input
                  key={i}
                  id={`pin-${i}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  className="w-10 h-12 sm:w-12 sm:h-14 bg-zinc-900 border border-white/10 text-center text-lg sm:text-xl font-mono text-white rounded-xl focus:outline-none focus:border-[#ff4d00]/50 focus:ring-1 focus:ring-[#ff4d00]/50 transition-all placeholder:text-zinc-700"
                  placeholder="&bull;"
                />
              ))}
            </div>

            {errorAuth && (
              <div className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2 rounded-lg">
                {errorAuth}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loadingAuth || accessCode.join('').length !== 5}
              className="w-full bg-white text-black font-bold uppercase tracking-widest text-xs py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingAuth ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
              ) : (
                <>Access Portal <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040404] text-white font-sans selection:bg-[#ff4d00]/30 flex flex-col items-center">
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8 lg:p-12 relative flex flex-col flex-1">
        {/* Background Effects */}
        <div className="fixed inset-0 bg-[#040404] -z-20"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none -z-10 opacity-30"></div>
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-[#ff4d00]/5 blur-[150px] pointer-events-none -z-10"></div>

        {/* Client Header */}
        <header className="mb-12 relative shrink-0 border-b border-white/5 pb-8">
           <div className="flex flex-row justify-between items-center gap-4">
             <img 
               src="https://raw.githubusercontent.com/Muhammad7Ali/IDE-MIND-Assest-/main/IDE%20MIND%20Logo(2000%20x%201000%20px).png" 
               alt="IDE MIND Logo" 
               className="w-28 md:w-32 h-auto object-contain" 
             />
             <div className="flex items-center gap-3 md:gap-4">
               <div className="text-right hidden sm:block">
                 <div className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-widest">{displayClientId || 'Client'}</div>
                 <div className="text-white text-xs md:text-sm font-bold truncate max-w-[150px] md:max-w-[200px]">{clientName}</div>
               </div>
               <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#ff4d00] flex items-center justify-center font-bold text-white shadow-[0_0_10px_rgba(255,77,0,0.3)] text-xs md:text-base">
                  {clientName.slice(0,2).toUpperCase()}
               </div>
             </div>
           </div>

           <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
             <div className="text-center sm:text-left">
               <h2 className="text-zinc-500 text-[10px] md:text-[11px] font-semibold uppercase tracking-widest mb-2">Project Dashboard</h2>
               <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-none font-display">
                 {projectName || clientName}
               </h1>
             </div>
             <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
               {errorTasks && (
                  <span className="text-red-400 text-[10px] font-medium flex items-center justify-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-full w-full sm:w-auto">
                    <Activity className="w-3 h-3" /> {errorTasks}
                  </span>
               )}
               <a href="https://wa.me/923110484556"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 bg-white text-[#111111] text-xs md:text-sm font-medium py-3 px-5 rounded-xl no-underline tracking-wide w-full sm:w-auto transition-transform active:scale-95"
               >
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                   <path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.16 1.6 5.97L0 24l6.22-1.57A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.21-1.25-6.22-3.48-8.52ZM12 21.94a9.89 9.89 0 0 1-5.04-1.38l-.36-.21-3.7.93.99-3.6-.24-.38A9.93 9.93 0 0 1 2.06 12C2.06 6.5 6.5 2.06 12 2.06S21.94 6.5 21.94 12 17.5 21.94 12 21.94Zm5.44-7.44c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35Z"/>
                 </svg>
                 CONTACT ON WHATSAPP
               </a>
             </div>
           </div>
        </header>

        {loadingTasks ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <div className="w-12 h-12 border-2 border-zinc-800 border-t-[#ff4d00] rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#ff4d00]/70">Loading Dashboard...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500 flex-1">
            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="col-span-1 min-h-[140px] md:min-h-[160px]">
                <MetricCard 
                  title="Total Tasks" 
                  value={metrics.total} 
                  subValue="All phases"
                  icon={<Layers className="w-5 h-5" />}
                />
              </div>
              <div className="col-span-1 min-h-[140px] md:min-h-[160px]">
                <MetricCard 
                  title="Active Work" 
                  value={metrics.inProgress} 
                  subValue={`${metrics.total > 0 ? ((metrics.inProgress / metrics.total) * 100).toFixed(1) : 0}% of workload`}
                  icon={<Activity className="w-5 h-5" />}
                  active={false}
                />
              </div>
              <div className="col-span-1 min-h-[140px] md:min-h-[160px]">
                <MetricCard 
                  title="Completion Rate" 
                  value={`${metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}%`} 
                  subValue="Target: 80%"
                  icon={<CheckCircle2 className="w-5 h-5" />}
                />
              </div>
               <div className="col-span-1 min-h-[140px] md:min-h-[160px]">
                <MetricCard 
                  title="Upcoming Deadlines" 
                  value={`${currentPhaseData.count}`} 
                  subValue={currentPhaseData.daysText.toUpperCase()}
                  icon={<MoreHorizontal className="w-5 h-5" />}
                />
              </div>
            </div>

            {/* Graphs Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
               <div className="lg:col-span-1">
                  <Card className="h-full min-h-[320px] md:min-h-[380px]" title="STATUS DISTRIBUTION">
                     <StatusDonut data={metrics.byStatus} total={metrics.total} />
                  </Card>
               </div>
               <div className="lg:col-span-1">
                  <DocumentsCard clientId={listId || clientId} mode="client" className="h-full min-h-[320px] md:min-h-[380px]" />
               </div>
            </div>

            {/* Modular Task Board */}
            <div className="pt-6">
               <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                 <div className="flex items-center gap-3">
                   <h2 className="text-lg font-bold text-white tracking-tight">Project Phases</h2>
                 </div>
               </div>
               <TaskBoard tasks={tasks} />
            </div>
          </div>
        )}

        {/* Global Footer */}
        <footer className="mt-16 border-t border-white/5 pt-6 pb-4 flex flex-col md:flex-row items-center justify-between relative gap-4 text-zinc-600 shrink-0">
           <div className="flex items-center gap-6 text-[11px] font-medium tracking-wide">
             <span>&copy; 2026 IDE MIND</span>
             <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
             <span>Privacy Policy</span>
             <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
             <span>Terms of Service</span>
           </div>
        </footer>
      </div>
    </div>
  );
};
