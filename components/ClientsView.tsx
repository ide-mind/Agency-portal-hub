import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SupabaseClientRecord, ClickUpList, ClickUpTask } from '../types';
import { 
  Search, Plus, Eye, EyeOff, Copy, MoreHorizontal, 
  Trash2, UserMinus, RefreshCw, Mail, UserCheck, X, Building, Users 
} from 'lucide-react';
import { format } from 'date-fns';
import { DocumentsCard } from './DocumentsCard';

interface ClientsViewProps {
  lists: ClickUpList[];
  allTasks: ClickUpTask[];
}

// Simple Toast implementation
let toastCount = 0;

export const ClientsView: React.FC<ClientsViewProps> = ({ lists, allTasks }) => {
  const [clients, setClients] = useState<SupabaseClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  
  // Modals & Drawers state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SupabaseClientRecord | null>(null);
  
  // Dropdown state
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleBroadcastEmails = async () => {
    if (!window.confirm(`Are you sure you want to email access keys to all ${filteredClients.length} clients shown?`)) return;
    
    setIsBroadcasting(true);
    let sentCount = 0;
    try {
      for (const client of filteredClients) {
        if (!client.email) continue;
        const listName = lists.find(l => l.id === client.clickup_list_id)?.name || '';
        await resendPortalEmail(client.email, client.access_code, client.id, client.name, listName);
        sentCount++;
      }
      addToast(`Successfully broadcasted to ${sentCount} clients.`);
    } catch(err) {
      addToast(`Error during broadcast.`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // New Client Form
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientListId, setNewClientListId] = useState('');
  const [newClientStatus, setNewClientStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Visibility states
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());
  
  // Toasts
  const [toasts, setToasts] = useState<{id: number, message: string}[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Reset pagination when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const addToast = (message: string) => {
    const id = ++toastCount;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clients', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        const text = await response.text();
        let errStr = text;
        try {
            errStr = JSON.parse(text).error;
        } catch(e) {}
        throw new Error(errStr || "Failed to fetch clients");
      }
      const data = await response.json();
      setClients(data as SupabaseClientRecord[]);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Failed to fetch') {
        addToast("Connection failed. Please check Supabase URL/CORS settings.");
      } else {
        addToast(`Failed to load clients: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Closes dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (actionMenuOpenId) setActionMenuOpenId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [actionMenuOpenId]);

  const generateAccessCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const getMaxClientId = () => {
    if (!clients || clients.length === 0) return 1;
    const ids = clients.map(c => {
      const match = c.client_id.match(/CL(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    return Math.max(...ids) + 1;
  };

  const handleSubmitNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail) return;

    setIsSubmitting(true);
    try {
      const code = generateAccessCode();
      const nextId = getMaxClientId();
      const clientIdString = `CL${nextId.toString().padStart(3, '0')}`;
      
      const newRecord = {
        client_id: clientIdString,
        name: newClientName,
        email: newClientEmail,
        access_code: code,
        clickup_list_id: newClientListId,
        status: newClientStatus
      };

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(newRecord)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create client");
      }
      const data = await response.json();
      const generatedId = data && data[0] ? data[0].id : null;

      // Attempt Resend API
      if (generatedId) {
        const listName = lists.find(l => l.id === newClientListId)?.name || '';
        await resendPortalEmail(newClientEmail, code, generatedId, newClientName, listName);
      }
      
      addToast("Client added successfully");
      setIsDrawerOpen(false);
      
      // Reset form
      setNewClientName('');
      setNewClientEmail('');
      setNewClientListId('');
      setNewClientStatus('Active');
      
      if (data) {
        setClients([data[0] as SupabaseClientRecord, ...clients]);
      } else {
        fetchClients();
      }
    } catch (error: any) {
      if (error.message === 'Failed to fetch') {
        addToast("Connection failed. Check Supabase URL/CORS.");
      } else {
        addToast(error.message || "Failed to create client");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCodeVisibility = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setVisibleCodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    addToast("Copied to clipboard!");
  };

  const handleRowClick = (client: SupabaseClientRecord) => {
    setSelectedClient(client);
    setIsDetailDrawerOpen(true);
  };
  
  const handleRegenerateCode = async () => {
    if (!selectedClient) return;
    const newCode = generateAccessCode();
    try {
      const response = await fetch(`/api/clients?id=${selectedClient.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ access_code: newCode })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to regenerate code");
      }
      
      setSelectedClient({ ...selectedClient, access_code: newCode });
      setClients(clients.map(c => c.id === selectedClient.id ? { ...c, access_code: newCode } : c));
      
      // Attempt Resend API
      const listName = lists.find(l => l.id === selectedClient.clickup_list_id)?.name || '';
      await resendPortalEmail(selectedClient.email, newCode, selectedClient.id, selectedClient.name, listName);
      
      addToast("Code regenerated & email sent!");
    } catch (err: any) {
      addToast("Error regenerating code: " + err.message);
    }
  };

  const resendPortalEmail = async (email: string, code: string, id: string, clientName: string, projectName: string) => {
    try {
      const portalUrl = `${window.location.origin}/portal/${id}`;
      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'noreply@idemind.dev',
          to: [email],
          subject: `Portal Access Code - ${clientName} (${new Date().toLocaleTimeString()})`,
          template: {
            id: '6582d6e8-9e84-4a2c-93bd-6afd6413822a',
            variables: {
              allocation_name: projectName || 'General Project',
              client_name: clientName,
              otp_code: code,
              portal_link: portalUrl
            }
          }
        })
      });
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         console.warn("Failed to send email:", errorData);
         addToast(`Failed to send email: ${errorData.error?.message || errorData.message || 'Unknown error'}`);
         return;
      }
      addToast(`Email successfully sent to ${email}`);
    } catch (err: any) {
      console.warn("Error sending email", err);
      addToast(`Error sending email: ${err.message || String(err)}`);
    }
  };

  const handleDeactivate = async (client: SupabaseClientRecord) => {
    const newStatus = client.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const response = await fetch(`/api/clients?id=${client.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update status");
      }
      setClients(clients.map(c => c.id === client.id ? { ...c, status: newStatus } : c));
      if (selectedClient && selectedClient.id === client.id) {
        setSelectedClient({ ...selectedClient, status: newStatus });
      }
      addToast(`Client marked as ${newStatus}`);
    } catch (err: any) {
      addToast("Error updating status: " + err.message);
    }
  };

  const handleDelete = async (client: SupabaseClientRecord) => {
    if (!window.confirm(`Are you sure you want to delete ${client.name}?`)) return;
    try {
      const response = await fetch(`/api/clients?id=${client.id}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete client");
      }
      setClients(clients.filter(c => c.id !== client.id));
      if (selectedClient && selectedClient.id === client.id) {
        setIsDetailDrawerOpen(false);
      }
      addToast("Client deleted successfully");
    } catch (err: any) {
      addToast("Error deleting client: " + err.message);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Client initials helper
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getClientProject = (listId: string) => lists.find(l => l.id === listId);
  const getClientTasks = (listId: string) => allTasks.filter(t => t.listId === listId);

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-none font-display mb-1">
            Clients
          </h1>
          <p className="text-zinc-400 font-medium tracking-wide text-xs">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-zinc-900 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-[#ff4d00]/50 focus:ring-1 focus:ring-[#ff4d00]/50 transition-all w-[240px]"
            />
          </div>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-zinc-900 border border-white/5 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-[#ff4d00]/50 transition-all appearance-none cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <button 
            onClick={handleBroadcastEmails}
            disabled={isBroadcasting}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-semibold transition-colors border border-white/5 disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            {isBroadcasting ? 'Sending...' : 'Broadcast'}
          </button>

          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff4d00] hover:bg-[#ff4d00]/90 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-[#070707] border border-white/5 rounded-xl">
           <div className="w-8 h-8 border-2 border-zinc-800 border-t-[#ff4d00] rounded-full animate-spin mb-4"></div>
           <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Loading Clients...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-[#070707] border border-white/5 rounded-xl">
           <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
             <Users className="w-8 h-8 text-zinc-600" />
           </div>
           <h3 className="text-lg font-bold text-white mb-2 tracking-tight">No clients onboarded yet</h3>
           <p className="text-sm text-zinc-400 mb-6 max-w-sm text-center">Add a client manually or wait for onboarding form submissions to appear here.</p>
           <button 
             onClick={() => setIsDrawerOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-[#ff4d00]/10 text-[#ff4d00] border border-[#ff4d00]/20 hover:bg-[#ff4d00]/20 rounded-lg text-sm font-semibold transition-colors"
           >
             <Plus className="w-4 h-4" />
             Add Client
           </button>
        </div>
      ) : (
        <div className="bg-[#070707] border border-white/5 rounded-xl shadow-2xl flex flex-col flex-1 min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-900/50 border-b border-white/5">
                  <th className="py-3 px-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest min-w-[90px]">Client ID</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest min-w-[200px]">Client</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Projects</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Access Code</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Onboarded</th>
                  <th className="py-3 px-5 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((client) => {
                  const proj = getClientProject(client.clickup_list_id);
                  const isCodeVisible = visibleCodes.has(client.id);
                  
                  return (
                    <tr 
                      key={client.id} 
                      className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors group"
                      onClick={() => handleRowClick(client)}
                    >
                      <td className="py-4 px-5">
                        <span className="font-mono text-zinc-500 text-sm">{client.client_id}</span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#ff4d00] flex items-center justify-center text-white font-bold text-sm shadow-[0_0_10px_rgba(255,77,0,0.3)] shrink-0">
                            {getInitials(client.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-zinc-100 group-hover:text-white transition-colors capitalize">
                              {client.name}
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                              {client.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex gap-2 items-center flex-wrap">
                          {proj ? (
                            <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 text-[10px] font-medium border border-white/5 tracking-wide max-w-[150px] truncate">
                              {proj.name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-600 italic">None assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <div className="font-mono text-sm tracking-wider font-semibold text-zinc-300 bg-zinc-900 border border-white/5 px-3 py-1.5 rounded-md min-w-[85px] text-center">
                            {isCodeVisible ? client.access_code : '•••••'}
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => toggleCodeVisibility(e, client.id)}
                              className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                              title={isCodeVisible ? "Hide Code" : "Show Code"}
                            >
                              {isCodeVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button 
                              onClick={(e) => copyToClipboard(e, client.access_code)}
                              className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                              title="Copy Code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                         <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                           client.status === 'Active' 
                             ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                             : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                         }`}>
                           {client.status}
                         </span>
                      </td>
                      <td className="py-4 px-5">
                         <span className="text-xs text-zinc-400">
                           {client.created_at ? format(new Date(client.created_at), 'MMM d, yyyy') : 'N/A'}
                         </span>
                      </td>
                      <td className="py-4 px-5 text-right relative">
                         <button 
                           onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === client.id ? null : client.id) }}
                           className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                         >
                           <MoreHorizontal className="w-4 h-4" />
                         </button>

                         {/* Action Dropdown Menu */}
                         {actionMenuOpenId === client.id && (
                           <div 
                             className="absolute right-8 top-10 w-48 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-xl py-1 z-10 animate-in fade-in slide-in-from-top-2 duration-200"
                             onClick={(e) => e.stopPropagation()}
                           >
                             <div className="flex flex-col text-sm font-medium">
                               <button 
                                 className="flex items-center gap-2 px-3 py-2.5 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors w-full text-left"
                                 onClick={() => { handleRowClick(client); setActionMenuOpenId(null); }}
                               >
                                 <Eye className="w-4 h-4" /> View Details
                               </button>
                               <button 
                                 className="flex items-center gap-2 px-3 py-2.5 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors w-full text-left"
                                 onClick={() => { copyToClipboard({ stopPropagation: () => {} } as any, client.access_code); setActionMenuOpenId(null); }}
                               >
                                 <Copy className="w-4 h-4" /> Copy Access Code
                               </button>
                               <button 
                                 className="flex items-center gap-2 px-3 py-2.5 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors w-full text-left"
                                 onClick={() => { 
                                   const listName = lists.find(l => l.id === client.clickup_list_id)?.name || '';
                                   resendPortalEmail(client.email, client.access_code, client.id, client.name, listName); 
                                   addToast("Email sent"); 
                                   setActionMenuOpenId(null); 
                                 }}
                               >
                                 <Mail className="w-4 h-4" /> Resend Portal Email
                               </button>
                               <div className="h-px bg-white/10 my-1 mx-2"></div>
                               <button 
                                 className="flex items-center gap-2 px-3 py-2.5 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors w-full text-left"
                                 onClick={() => { handleDeactivate(client); setActionMenuOpenId(null); }}
                               >
                                 {client.status === 'Active' ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />} 
                                 {client.status === 'Active' ? 'Deactivate Client' : 'Activate Client'}
                               </button>
                               <button 
                                 className="flex items-center gap-2 px-3 py-2.5 text-red-500 hover:bg-red-500/10 transition-colors w-full text-left group"
                                 onClick={() => { handleDelete(client); setActionMenuOpenId(null); }}
                               >
                                 <Trash2 className="w-4 h-4 text-red-500/70 group-hover:text-red-500" /> Delete Client
                               </button>
                             </div>
                           </div>
                         )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 bg-[#0a0a0a] px-5 py-3 mt-auto">
              <div className="text-xs text-zinc-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length} clients
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded bg-zinc-900 border border-white/5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                        currentPage === page 
                          ? 'bg-[#ff4d00]/10 text-[#ff4d00] border border-[#ff4d00]/20' 
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded bg-zinc-900 border border-white/5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- DRAWERS & OVERLAYS ---------------- */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop for any drawer */}
          { (isDrawerOpen || isDetailDrawerOpen) && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in"
              onClick={() => { setIsDrawerOpen(false); setIsDetailDrawerOpen(false) }}
            />
          )}

          {/* New Client Drawer */}
          <div className={`fixed inset-y-0 right-0 w-full md:w-[480px] bg-[#070707] border-l border-white/5 z-[101] transform transition-transform duration-300 shadow-2xl ease-out flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold font-display text-white">Add New Client</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-zinc-500 hover:text-white rounded-md hover:bg-white/5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="new-client-form" onSubmit={handleSubmitNewClient} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={newClientName}
                    onChange={e => setNewClientName(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#ff4d00]/50 focus:ring-1 focus:ring-[#ff4d00]/50 transition-all placeholder:text-zinc-600"
                    placeholder="Acme Corp or John Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Email Address</label>
                  <input 
                    type="email"
                    required
                    value={newClientEmail}
                    onChange={e => setNewClientEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#ff4d00]/50 focus:ring-1 focus:ring-[#ff4d00]/50 transition-all placeholder:text-zinc-600"
                    placeholder="client@acme.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Assign Project (ClickUp List)</label>
                  <select 
                    value={newClientListId}
                    onChange={e => setNewClientListId(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#ff4d00]/50 focus:ring-1 focus:ring-[#ff4d00]/50 transition-all appearance-none"
                  >
                    <option value="">No Project Attached</option>
                    {lists.map(list => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <label className="text-sm font-semibold text-white block">Active Status</label>
                    <span className="text-xs text-zinc-500">Allow login via portal access code.</span>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={newClientStatus === 'Active'} onChange={e => setNewClientStatus(e.target.checked ? 'Active' : 'Inactive')} />
                    <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff4d00]"></div>
                  </label>
                </div>
              </div>
              
              <div className="space-y-3 pt-6 border-t border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Onboarding Automation</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Submitting this form will automatically generate a secure 5-character Access Code and send an onboarding email to the client using the Portal Invite template.
                </p>
              </div>
            </form>

            <div className="p-6 border-t border-white/5 bg-[#0a0a0a] flex justify-end gap-3 shrink-0">
               <button 
                 onClick={() => setIsDrawerOpen(false)}
                 className="px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
               >
                 Cancel
               </button>
               <button 
                 type="submit"
                 form="new-client-form"
                 disabled={isSubmitting}
                 className="px-6 py-2 bg-[#ff4d00] hover:bg-[#ff4d00]/90 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
               >
                 {isSubmitting ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : null}
                 Create Client
               </button>
            </div>
          </div>

          {/* Client Details Drawer */}
          <div className={`fixed inset-y-0 right-0 w-full md:w-[540px] bg-[#070707] border-l border-white/5 z-[101] transform transition-transform duration-300 shadow-2xl ease-out flex flex-col ${isDetailDrawerOpen && selectedClient ? 'translate-x-0' : 'translate-x-full'}`}>
             {selectedClient && (
               <>
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-[#ff4d00] flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(255,77,0,0.3)]">
                        {getInitials(selectedClient.name)}
                     </div>
                     <div>
                       <h2 className="text-2xl font-bold font-display text-white capitalize leading-tight">{selectedClient.name}</h2>
                       <div className="flex items-center gap-2 mt-0.5">
                         <span className="font-mono text-xs text-zinc-500 uppercase">{selectedClient.client_id}</span>
                         <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                         <span className="text-xs text-zinc-400">{selectedClient.email}</span>
                       </div>
                     </div>
                   </div>
                   <button onClick={() => setIsDetailDrawerOpen(false)} className="p-2 text-zinc-500 hover:text-white rounded-md hover:bg-white/5 transition-colors self-start">
                     <X className="w-5 h-5" />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                   {/* Metadata Bar */}
                   <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                     <div>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Status</p>
                       <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-widest border ${
                               selectedClient.status === 'Active' 
                                 ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                 : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                             }`}>
                         {selectedClient.status}
                       </span>
                     </div>
                     <div>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Onboarded On</p>
                       <p className="text-sm font-medium text-white">{selectedClient.created_at ? format(new Date(selectedClient.created_at), 'MMMM d, yyyy') : 'Unknown'}</p>
                     </div>
                   </div>

                   {/* Access Code Card */}
                   <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Access Credential</h3>
                      <div className="bg-gradient-to-r from-zinc-900 to-[#0a0a0a] border border-white/5 rounded-xl p-5 relative overflow-hidden flex items-center justify-between group overflow-visible">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff4d00]/5 rounded-full blur-[40px] pointer-events-none"></div>
                         <div>
                            <p className="text-xs text-zinc-400 font-medium mb-1">Current Portal Code</p>
                            <div className="font-mono text-3xl font-bold text-white tracking-[0.2em]">{selectedClient.access_code}</div>
                         </div>
                         <div className="flex flex-col gap-2 relative z-10">
                            <button 
                              onClick={(e) => copyToClipboard(e, selectedClient.access_code)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs font-medium text-white transition-colors"
                            >
                               <Copy className="w-3.5 h-3.5" /> Copy Code
                            </button>
                            <button 
                              onClick={handleRegenerateCode}
                              className="flex items-center gap-2 px-3 py-1.5 bg-[#ff4d00]/10 hover:bg-[#ff4d00]/20 border border-[#ff4d00]/20 rounded-md text-xs font-medium text-[#ff4d00] transition-colors"
                            >
                               <RefreshCw className="w-3.5 h-3.5" /> Regenerate & Email
                            </button>
                         </div>
                      </div>
                   </div>

                   {/* Documents Card (Admin View) */}
                   <div className="-mx-6 border-y border-white/5 bg-[#0a0a0a]">
                     <DocumentsCard clientId={selectedClient.clickup_list_id || selectedClient.id} mode="admin" className="!bg-transparent !border-0 shadow-none !rounded-none" />
                   </div>

                   {/* Projects List */}
                   <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Assigned Projects</h3>
                      {selectedClient.clickup_list_id ? (
                        <div className="space-y-3">
                          {lists.filter(l => l.id === selectedClient.clickup_list_id).map(proj => {
                            const tasks = getClientTasks(proj.id);
                            const done = tasks.filter(t => ['closed','done','complete'].includes(t.status.status.toLowerCase())).length;
                            const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
                            
                            return (
                              <div key={proj.id} className="bg-zinc-900 border border-white/5 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Building className="w-4 h-4 text-[#ff4d00]" />
                                    <span className="font-semibold text-white text-sm tracking-wide">{proj.name}</span>
                                  </div>
                                  <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold bg-black px-2 py-1 rounded">Execution Phase</span>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs text-zinc-400">
                                    <span>Project Setup</span>
                                    <span className="font-mono text-[10px]">{pct}%</span>
                                  </div>
                                  <div className="w-full bg-black rounded-full h-1.5 border border-white/5">
                                    <div className="h-full bg-[#ff4d00] rounded-full" style={{ width: `${pct}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="bg-zinc-900 border border-white/5 rounded-lg p-4 text-center text-zinc-500 text-sm">
                          No active projects connected via ClickUp.
                        </div>
                      )}
                   </div>

                   {/* Recent Activity */}
                   <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Recent Interaction Feed</h3>
                      <div className="bg-zinc-900 border border-white/5 rounded-lg p-4">
                         {selectedClient.clickup_list_id && getClientTasks(selectedClient.clickup_list_id).length > 0 ? (
                           <div className="space-y-4">
                             {getClientTasks(selectedClient.clickup_list_id).slice(0, 5).map((t, idx, arr) => (
                               <div key={t.id} className="flex gap-3 relative">
                                 <div className="flex flex-col items-center">
                                   <div className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: t.status.color || '#ff4d00' }}></div>
                                   {idx !== arr.length - 1 && <div className="w-px h-full bg-white/10 my-1"></div>}
                                 </div>
                                 <div className="pb-1">
                                   <p className="text-sm font-medium text-zinc-200">{t.name}</p>
                                   <span className="text-xs text-zinc-500">{t.status.status}</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                         ) : (
                           <span className="text-sm text-zinc-500 block text-center py-2">No recent task activity tracked.</span>
                         )}
                      </div>
                   </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-[#0a0a0a] shrink-0">
                   <button 
                     onClick={() => window.open(`/portal/${selectedClient.id}`, '_blank')}
                     className="w-full py-3 bg-white hover:bg-zinc-200 text-black rounded-lg text-sm font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                   >
                     <Eye className="w-4 h-4" />
                     View Portal As Client
                   </button>
                </div>
               </>
             )}
          </div>

          {/* Global Toasts */}
          <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
              <div key={t.id} className="bg-zinc-800 border border-white/10 shadow-xl rounded-md px-4 py-3 text-white text-sm font-medium animate-in fade-in slide-in-from-bottom-5">
                {t.message}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}

    </div>
  );
};
