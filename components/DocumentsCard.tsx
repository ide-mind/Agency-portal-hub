import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from './Card';
import { Download, Upload, X, FileText } from 'lucide-react';

const defaultDocuments = [
  { id: 'brand-kit', title: 'BRAND KIT', theme: 'black' },
  { id: 'scope-of-work', title: 'SCOPE OF WORK', theme: 'black' },
  { id: 'invoices', title: 'INVOICES', theme: 'black' },
  { id: 'contract', title: 'CONTRACT', theme: 'orange' }
] as const;

const ICONS = {
  'black-empty': 'https://raw.githubusercontent.com/Muhammad7Ali/IDE-MIND-Assest-/main/folder%20empty%20black.png',
  'black-doc': 'https://raw.githubusercontent.com/Muhammad7Ali/IDE-MIND-Assest-/main/folder%20with%20doc%20black.png',
  'orange-empty': 'https://raw.githubusercontent.com/Muhammad7Ali/IDE-MIND-Assest-/main/folder%20empty%20orange.png',
  'orange-doc': 'https://raw.githubusercontent.com/Muhammad7Ali/IDE-MIND-Assest-/main/folder%20with%20doc%20orange.png'
};

interface DocumentData {
  name: string;
  type: string;
  dataUrl: string;
}

export const DocumentsCard: React.FC<{ className?: string, clientId?: string, mode?: 'admin' | 'client' }> = ({ className = '', clientId = 'global', mode = 'admin' }) => {
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, DocumentData>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  // Load docs from localStorage
  const loadDocs = () => {
    const newDocs: Record<string, DocumentData> = {};
    defaultDocuments.forEach(d => {
      const saved = localStorage.getItem(`doc_${clientId}_${d.id}`);
      if (saved) {
        try {
          newDocs[d.id] = JSON.parse(saved);
        } catch(err) {
          // invalid json
        }
      }
    });
    setUploadedDocs(newDocs);
  };

  useEffect(() => {
    loadDocs();
    const interval = setInterval(loadDocs, 1000);
    return () => clearInterval(interval);
  }, [clientId]);

  const handleBoxClick = (docId: string) => {
    const docData = uploadedDocs[docId];
    if (mode === 'admin') {
      if (docData) {
        setPreviewDocId(docId);
      } else {
        setActiveUploadId(docId);
        fileInputRef.current?.click();
      }
    } else {
      // client mode
      if (docData) {
        setPreviewDocId(docId);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUploadId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const docData = {
          name: file.name,
          type: file.type,
          dataUrl
        };
        localStorage.setItem(`doc_${clientId}_${activeUploadId}`, JSON.stringify(docData));
        setUploadedDocs(prev => ({ ...prev, [activeUploadId]: docData }));
        setActiveUploadId(null);
      };
      reader.readAsDataURL(file);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activePreviewData = previewDocId ? uploadedDocs[previewDocId] : null;
  const activePreviewMeta = previewDocId ? defaultDocuments.find(d => d.id === previewDocId) : null;

  return (
    <>
      <Card className={`font-sans overflow-hidden ${className}`} title="DOCUMENTS">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          {/* We want a 2x2 grid with borders between them */}
          <div className="grid grid-cols-2 grid-rows-2 -mx-8 -mb-8 mt-[-1.5rem]">
            {defaultDocuments.map((doc, idx) => {
               const hasDoc = !!uploadedDocs[doc.id];
               const iconKey = `${doc.theme}-${hasDoc ? 'doc' : 'empty'}` as keyof typeof ICONS;
               const imageUrl = ICONS[iconKey];

               return (
                 <div 
                   key={doc.id} 
                   onClick={() => handleBoxClick(doc.id)}
                   className={`flex flex-col items-center justify-center p-6 border-white/5 hover:bg-white/[0.02] transition-colors ${hasDoc || mode === 'admin' ? 'cursor-pointer' : 'cursor-default'} group pb-8
                   ${idx % 2 === 0 ? 'border-r' : ''} 
                   ${idx < 2 ? 'border-b' : ''}`}
                 >
                    <div className="w-24 h-24 mb-3 flex items-center justify-center relative">
                        <img src={imageUrl} alt={doc.title} className={`w-full h-full object-contain ${hasDoc || mode === 'admin' ? 'group-hover:scale-105 transition-transform' : ''} ${!hasDoc && mode === 'client' ? 'opacity-50 grayscale' : ''}`} />
                        
                        {mode === 'admin' && !hasDoc && (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                              <Upload className="w-6 h-6 text-white" />
                           </div>
                        )}
                        {hasDoc && (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                              <FileText className="w-6 h-6 text-white drop-shadow-md" />
                           </div>
                        )}
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-zinc-500 uppercase tracking-widest text-center mt-2 group-hover:text-zinc-300 transition-colors">{doc.title}</span>
                 </div>
               );
            })}
          </div>
      </Card>

      {/* Document View Modal */}
      {previewDocId && activePreviewData && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setPreviewDocId(null)}>
          <div 
            className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
             <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#070707]">
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activePreviewMeta?.theme === 'orange' ? 'bg-[#ff4d00]/10 text-[#ff4d00]' : 'bg-white/5 text-zinc-400'}`}>
                      <FileText className="w-5 h-5" />
                   </div>
                   <div>
                     <h3 className="font-bold text-white uppercase tracking-widest text-sm">{activePreviewMeta?.title}</h3>
                     <p className="text-zinc-500 text-xs truncate max-w-[200px] sm:max-w-xs">{activePreviewData.name}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   {mode === 'admin' && (
                      <button 
                         onClick={() => {
                            localStorage.removeItem(`doc_${clientId}_${previewDocId}`);
                            setUploadedDocs(prev => {
                               const next = {...prev};
                               delete next[previewDocId];
                               return next;
                            });
                            setPreviewDocId(null);
                         }}
                         className="px-3 py-1.5 rounded-md text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors mr-2"
                      >
                         Delete
                      </button>
                   )}
                   <button onClick={() => setPreviewDocId(null)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-md transition-colors">
                     <X className="w-5 h-5" />
                   </button>
                </div>
             </div>
             
             <div className="p-6 bg-black/50 aspect-video flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                {activePreviewData.type.startsWith('image/') ? (
                    <img src={activePreviewData.dataUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-md" />
                ) : activePreviewData.type === 'application/pdf' ? (
                    <iframe src={`${activePreviewData.dataUrl}#toolbar=0`} title="Preview" className="w-full h-full rounded-md" />
                ) : (
                   <div className="flex flex-col items-center text-zinc-500">
                     <FileText className="w-16 h-16 mb-4 opacity-50" />
                     <p className="font-medium text-sm">Preview not available for this file type.</p>
                     <p className="text-xs mt-1">Please download to view the contents.</p>
                   </div>
                )}
             </div>

             <div className="p-4 sm:p-6 border-t border-white/5 bg-[#070707] flex justify-end">
                <a 
                   href={activePreviewData.dataUrl}
                   download={activePreviewData.name}
                   className="px-6 py-2.5 bg-[#ff4d00] hover:bg-[#ff4d00]/90 text-white rounded-lg text-sm font-semibold tracking-wide transition-colors flex items-center gap-2 w-full sm:w-auto justify-center shadow-[0_0_15px_rgba(255,77,0,0.3)]"
                >
                   <Download className="w-4 h-4" />
                   DOWNLOAD FILE
                </a>
             </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

