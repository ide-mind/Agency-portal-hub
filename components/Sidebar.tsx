import React, { useState } from 'react';
import { Input } from './Input';
import { ClickUpList, AppConfig } from '../types';
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
  Command
} from 'lucide-react';

interface SidebarProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  lists: ClickUpList[];
  selectedListId: string | null;
  onSelectList: (id: string) => void;
  isLoadingLists: boolean;
  onFetchLists: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  config,
  setConfig,
  lists,
  selectedListId,
  onSelectList,
  isLoadingLists,
  onFetchLists,
  isCollapsed,
  onToggleCollapse
}) => {
  const [isTargetIndexOpen, setIsTargetIndexOpen] = useState(true);
  const [isConfigMatrixOpen, setIsConfigMatrixOpen] = useState(true);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  return (
    <aside 
      className={`h-screen bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-white/5 flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ${
        isCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-72'
      }`}
    >
      {/* Toggle Button */}
      <button 
        onClick={onToggleCollapse}
        className="hidden md:flex absolute -right-3 top-10 w-6 h-6 bg-[#1a1a1a] border border-white/10 rounded-full items-center justify-center text-zinc-500 hover:text-white hover:bg-orange-500 transition-all z-50 shadow-lg"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header Logo */}
      <div className={`p-8 flex flex-col items-center border-b border-white/5 transition-all duration-300 ${isCollapsed ? 'py-10' : ''}`}>
        <div 
          onClick={onToggleCollapse}
          className={`bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20 hover:scale-105 transition-all cursor-pointer ${
            isCollapsed ? 'w-10 h-10 mb-0' : 'w-10 h-10 mb-4'
          }`}
        >
           <Command size={isCollapsed ? 20 : 20} className="text-white" />
        </div>
        
        {!isCollapsed && (
          <div className="flex flex-col items-center animate-in fade-in duration-300">
            <h1 className="text-sm font-bold uppercase tracking-wider text-white">
              Nexus<span className="text-zinc-500">Intel</span>
            </h1>
            <span className="text-[10px] text-zinc-600 mt-1 font-medium tracking-wide">Enterprise Dashboard v2.0</span>
          </div>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-2 py-8' : 'px-5 py-8 space-y-8'}`}>
        
        {isCollapsed ? (
          /* Collapsed View Icons */
          <div className="flex flex-col items-center gap-8 mt-4 animate-in fade-in slide-in-from-left-4 duration-500">
             <div className="p-3 rounded-xl hover:bg-white/5 cursor-pointer text-orange-500 transition-colors" onClick={onToggleCollapse}>
                <LayoutGrid size={20} />
             </div>
             <div className="p-3 rounded-xl hover:bg-white/5 cursor-pointer text-zinc-600 hover:text-orange-500 transition-colors" onClick={onToggleCollapse}>
                <CheckSquare size={20} />
             </div>
             <div className="p-3 rounded-xl hover:bg-white/5 cursor-pointer text-zinc-600 hover:text-orange-500 transition-colors" onClick={onToggleCollapse}>
                <Clock size={20} />
             </div>
             <div className="p-3 rounded-xl hover:bg-white/5 cursor-pointer text-zinc-600 hover:text-orange-500 transition-colors" onClick={onToggleCollapse}>
                <BarChart3 size={20} />
             </div>
          </div>
        ) : (
          /* Expanded View Content */
          <>
            {/* Active Clients */}
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <div 
                className="flex items-center justify-between mb-4 px-2 cursor-pointer group select-none"
                onClick={() => setIsTargetIndexOpen(!isTargetIndexOpen)}
              >
                <div className="flex items-center gap-2">
                   <h2 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest group-hover:text-zinc-300 transition-colors">
                     Projects
                   </h2>
                </div>
                <span className="text-[10px] text-zinc-600 font-medium">{lists.length}</span>
              </div>

              <div className={`transition-all duration-300 overflow-hidden ${isTargetIndexOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {lists.length > 0 ? (
                  <div className="space-y-1">
                    {lists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => onSelectList(list.id)}
                        className={`group w-full text-left px-4 py-3 rounded-lg text-xs font-medium transition-all relative overflow-hidden ${
                          selectedListId === list.id 
                            ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' 
                            : 'text-zinc-400 border border-transparent hover:bg-white/[0.03] hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between relative z-10">
                          <span className="truncate max-w-[160px] tracking-wide">{list.name}</span>
                          {selectedListId === list.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-zinc-800 text-center bg-white/[0.01]">
                    <Database className="w-4 h-4 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-600 text-[10px]">No projects found</p>
                  </div>
                )}
              </div>
            </div>

            {/* System Config */}
            <div className="animate-in fade-in slide-in-from-left-2 duration-300 delay-100">
              <div 
                className="flex items-center justify-between mb-4 px-2 cursor-pointer group select-none"
                onClick={() => setIsConfigMatrixOpen(!isConfigMatrixOpen)}
              >
                 <h2 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 group-hover:text-zinc-300 transition-colors">
                   Configuration
                 </h2>
              </div>
              
              <div className={`transition-all duration-300 overflow-hidden ${isConfigMatrixOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-3 bg-[#111111] p-5 rounded-2xl border border-white/5">
                  <Input
                    label="ClickUp API Key"
                    name="clickUpApiKey"
                    type="password"
                    placeholder="pk_..."
                    value={config.clickUpApiKey}
                    onChange={handleChange}
                    className="bg-[#0a0a0a]"
                  />
                   <Input
                    label="Folder ID"
                    name="clickUpFolderId"
                    placeholder="12345678"
                    value={config.clickUpFolderId}
                    onChange={handleChange}
                    className="bg-[#0a0a0a]"
                  />
                  <Input
                    label="Gemini API Key"
                    name="googleApiKey"
                    type="password"
                    placeholder="AIza..."
                    value={config.googleApiKey}
                    onChange={handleChange}
                    className="bg-[#0a0a0a]"
                  />
                  
                  <button
                    onClick={onFetchLists}
                    disabled={isLoadingLists || !config.clickUpApiKey || !config.clickUpFolderId}
                    className="w-full mt-2 py-3 px-4 bg-white hover:bg-zinc-200 text-black disabled:bg-zinc-800 disabled:text-zinc-600 font-bold uppercase tracking-wider text-[10px] rounded-lg transition-all flex items-center justify-center gap-2 relative overflow-hidden shadow-lg hover:shadow-xl"
                  >
                    {isLoadingLists ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderSearch className="w-3 h-3" />}
                    <span>Sync Data</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </aside>
  );
};