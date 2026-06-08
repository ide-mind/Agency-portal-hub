import React, { useState } from 'react';
import { Input } from './Input';
import { ClickUpList } from '../types';
import { 
  Settings, 
  FolderSearch, 
  Loader2, 
  Database, 
  ChevronRight, 
  LayoutGrid,
  CheckSquare,
  Clock,
  BarChart3,
  ChevronLeft,
  Command,
  Globe,
  Home,
  Users,
  Key,
  RefreshCw,
  Sliders
} from 'lucide-react';

interface SidebarProps {
  lists: ClickUpList[];
  selectedListId: string | null;
  onSelectList: (id: string) => void;
  isLoadingLists: boolean;
  onFetchLists: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeView: 'dashboard' | 'external' | 'all-clients';
  onSelectExternal: () => void;
  onNavigateDashboard: () => void;
  onNavigateClients: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  lists,
  selectedListId,
  onSelectList,
  isLoadingLists,
  onFetchLists,
  isCollapsed,
  onToggleCollapse,
  activeView,
  onSelectExternal,
  onNavigateDashboard,
  onNavigateClients
}) => {
  const [isTargetIndexOpen, setIsTargetIndexOpen] = useState(true);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(true);
  
  // Local state to track which dummy item is active
  const [activeItem, setActiveItem] = useState<string>('dashboard');

  // Helper for applying un-clicked logic + selection
  const handleSelectNav = (item: string, callback?: () => void) => {
    setActiveItem(item);
    if (callback) callback();
  };

  // Whenever external list or item is selected from outside, sync if we needed, but activeView syncs mostly:
  const isDashboardActive = activeItem === 'dashboard' && activeView !== 'external' && !selectedListId;

  return (
    <aside 
      className={`h-screen bg-[#040404] border-r border-white/5 flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ${
        isCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-72'
      }`}
    >
      {/* Toggle Button */}
      <button 
        onClick={onToggleCollapse}
        className="hidden md:flex absolute -right-3 top-10 w-6 h-6 bg-[#0a0a0a] border border-white/10 rounded-full items-center justify-center text-zinc-500 hover:text-white hover:bg-[#ff4d00] transition-all z-50 shadow-lg"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header Logo */}
      <div className={`p-8 flex flex-col items-center border-b border-white/5 transition-all duration-300 ${isCollapsed ? 'py-10' : ''}`}>
        <div 
          onClick={onToggleCollapse}
          className={`flex items-center justify-center hover:scale-105 transition-all cursor-pointer ${
            isCollapsed ? 'mb-0' : 'mb-4'
          }`}
        >
           <div className={`flex items-center justify-center`}>
             <img 
               src="https://raw.githubusercontent.com/Muhammad7Ali/IDE-MIND-Assest-/main/IDE%20MIND%20Logo(2000%20x%201000%20px).png" 
               alt="IDE MIND Logo" 
               className={`${isCollapsed ? 'w-10' : 'w-32'} h-auto object-contain transition-all duration-300`} 
             />
           </div>
        </div>
        
        {!isCollapsed && (
          <div className="flex flex-col items-center animate-in fade-in duration-300 gap-1 mt-2">
            <span className="text-[10px] text-zinc-600 font-medium tracking-wide">Client Portal</span>
          </div>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-2 py-8' : 'px-5 py-8 space-y-8 font-sans'}`}>
        
        {isCollapsed ? (
          /* Collapsed View Icons */
          <div className="flex flex-col items-center gap-6 mt-2 animate-in fade-in slide-in-from-left-4 duration-500">
             <div className="p-3 rounded-lg hover:bg-white/5 cursor-pointer text-zinc-600 hover:text-[#ff4d00] transition-colors" onClick={onToggleCollapse}>
                <Home size={20} />
             </div>
             <div className="p-3 rounded-lg hover:bg-white/5 cursor-pointer text-zinc-600 hover:text-[#ff4d00] transition-colors" onClick={onToggleCollapse}>
                <Users size={20} />
             </div>
             <div className="p-3 rounded-lg hover:bg-white/5 cursor-pointer text-zinc-600 hover:text-[#ff4d00] transition-colors" onClick={onToggleCollapse}>
                <LayoutGrid size={20} />
             </div>
             <div className="p-3 rounded-lg hover:bg-white/5 cursor-pointer text-zinc-600 hover:text-[#ff4d00] transition-colors" onClick={onToggleCollapse}>
                <Globe size={20} />
             </div>
             <div className="p-3 rounded-lg hover:bg-white/5 cursor-pointer text-zinc-600 hover:text-[#ff4d00] transition-colors" onClick={onToggleCollapse}>
                <Settings size={20} />
             </div>
          </div>
        ) : (
          /* Expanded View Content */
          <>
            {/* MAIN section */}
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center justify-between mb-3 px-2 select-none">
                 <h2 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                   Main
                 </h2>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => handleSelectNav('dashboard', onNavigateDashboard)}
                  className={`group w-full text-left px-4 py-3 rounded-lg text-xs font-medium transition-all relative overflow-hidden ${
                    activeItem === 'dashboard'
                      ? 'bg-[#ff4d00]/10 text-[#ff4d00] border border-[#ff4d00]/20' 
                      : 'text-zinc-400 border border-transparent hover:bg-white/[0.03] hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <Home className="w-4 h-4" />
                    <span className="tracking-wide">Dashboard</span>
                  </div>
                </button>
              </div>
            </div>

            {/* CLIENTS section */}
            <div className="animate-in fade-in slide-in-from-left-2 duration-300 delay-75">
              <div className="flex items-center justify-between mb-3 px-2 select-none">
                 <h2 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                   Clients
                 </h2>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => handleSelectNav('all-clients', onNavigateClients)}
                  className={`group w-full text-left px-4 py-3 rounded-lg text-xs font-medium transition-all relative overflow-hidden ${
                    activeItem === 'all-clients'
                      ? 'bg-[#ff4d00]/10 text-[#ff4d00] border border-[#ff4d00]/20' 
                      : 'text-zinc-400 border border-transparent hover:bg-white/[0.03] hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <Users className="w-4 h-4" />
                    <span className="tracking-wide">All Clients</span>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectNav('access-codes')}
                  className={`group w-full text-left px-4 py-3 rounded-lg text-xs font-medium transition-all relative overflow-hidden ${
                    activeItem === 'access-codes'
                      ? 'bg-[#ff4d00]/10 text-[#ff4d00] border border-[#ff4d00]/20' 
                      : 'text-zinc-400 border border-transparent hover:bg-white/[0.03] hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <Key className="w-4 h-4" />
                    <span className="tracking-wide">Access Codes</span>
                  </div>
                </button>
              </div>
            </div>

            {/* PROJECTS section */}
            <div className="animate-in fade-in slide-in-from-left-2 duration-300 delay-100">
              <div 
                className="flex items-center justify-between mb-3 px-2 cursor-pointer group select-none"
                onClick={() => setIsTargetIndexOpen(!isTargetIndexOpen)}
              >
                <div className="flex items-center gap-2">
                   <h2 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest group-hover:text-zinc-300 transition-colors">
                     Projects
                   </h2>
                </div>
                <span className="text-[10px] text-zinc-600 font-mono font-medium">{lists.length}</span>
              </div>

              <div className={`transition-all duration-300 overflow-hidden ${isTargetIndexOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {lists.length > 0 ? (
                  <div className="space-y-1">
                    {lists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => handleSelectNav('project', () => onSelectList(list.id))}
                        className={`group w-full text-left px-4 py-3 rounded-lg text-xs font-medium transition-all relative overflow-hidden ${
                          selectedListId === list.id && activeView === 'dashboard'
                            ? 'bg-[#ff4d00]/10 text-[#ff4d00] border border-[#ff4d00]/20' 
                            : 'text-zinc-400 border border-transparent hover:bg-white/[0.03] hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between relative z-10">
                          <span className="truncate max-w-[160px] tracking-wide pl-7">{list.name}</span>
                          {selectedListId === list.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#ff4d00] shadow-[0_0_8px_rgba(255,77,0,0.5)]"></div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-lg border border-dashed border-zinc-800 text-center bg-white/[0.01]">
                    <Database className="w-4 h-4 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-600 text-[10px]">No projects found</p>
                  </div>
                )}
              </div>
            </div>

            {/* WORKSPACE section */}
            <div className="animate-in fade-in slide-in-from-left-2 duration-300 delay-150">
              <div className="flex items-center justify-between mb-3 px-2 select-none">
                 <h2 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                   Workspace
                 </h2>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => handleSelectNav('clickup-sync', onFetchLists)}
                  disabled={isLoadingLists}
                  className={`group w-full text-left px-4 py-3 rounded-lg text-xs font-medium transition-all relative overflow-hidden ${
                    activeItem === 'clickup-sync'
                      ? 'bg-[#ff4d00]/10 text-[#ff4d00] border border-[#ff4d00]/20' 
                      : 'text-zinc-400 border border-transparent hover:bg-white/[0.03] hover:text-zinc-200'
                  } ${isLoadingLists ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <RefreshCw className={`w-4 h-4 ${isLoadingLists ? 'animate-spin' : ''}`} />
                    <span className="tracking-wide">ClickUp Sync</span>
                  </div>
                </button>
                
                <div>
                  <button
                    onClick={() => setIsIntegrationsOpen(!isIntegrationsOpen)}
                    className={`group w-full text-left px-4 py-3 rounded-lg text-xs font-medium transition-all relative overflow-hidden text-zinc-400 border border-transparent hover:bg-white/[0.03] hover:text-zinc-200`}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <Globe className="w-4 h-4" />
                      <span className="tracking-wide">Integrations</span>
                    </div>
                  </button>
                  <div className={`transition-all duration-300 overflow-hidden ${isIntegrationsOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="pl-4 pr-1 py-1">
                      <button
                        onClick={() => handleSelectNav('external', onSelectExternal)}
                        className={`group w-full text-left px-4 py-2.5 rounded-lg text-xs font-medium transition-all relative overflow-hidden ${
                          activeView === 'external' 
                            ? 'bg-[#ff4d00]/10 text-[#ff4d00] border border-[#ff4d00]/20' 
                            : 'text-zinc-500 border border-transparent hover:bg-white/[0.03] hover:text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 relative z-10">
                          <div className={`w-1.5 h-1.5 rounded-full ${activeView === 'external' ? 'bg-[#ff4d00] shadow-[0_0_8px_rgba(255,77,0,0.5)]' : 'bg-zinc-600 group-hover:bg-zinc-400'}`}></div>
                          <span className="truncate tracking-wide">Zite Website</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SETTINGS section */}
            <div className="animate-in fade-in slide-in-from-left-2 duration-300 delay-200">
              <div className="flex items-center justify-between mb-3 px-2 select-none">
                 <h2 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                   Settings
                 </h2>
              </div>
              
              <div className="space-y-1">
                <button
                  onClick={() => handleSelectNav('preferences')}
                  className={`group w-full text-left px-4 py-3 rounded-lg text-xs font-medium transition-all relative overflow-hidden ${
                    activeItem === 'preferences'
                      ? 'bg-[#ff4d00]/10 text-[#ff4d00] border border-[#ff4d00]/20' 
                      : 'text-zinc-400 border border-transparent hover:bg-white/[0.03] hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <Sliders className="w-4 h-4" />
                    <span className="tracking-wide">Preferences</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('admin_token');
                    window.location.href = '/login';
                  }}
                  className={`group w-full text-left px-4 py-3 rounded-lg text-xs font-medium transition-all relative overflow-hidden text-red-400 border border-transparent hover:bg-red-500/10 hover:text-red-500`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span className="tracking-wide">Log Out</span>
                  </div>
                </button>
              </div>
            </div>

          </>
        )}

      </div>
    </aside>
  );
};