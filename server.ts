import express from "express";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add CORS middleware so external dashboards (from Vercel or anywhere) can make API calls smoothly
  app.use(cors());
  app.use(express.json());

  // API routes
  app.get("/api/clickup/lists", async (req, res) => {
    try {
        const response = await fetch(`https://api.clickup.com/api/v2/folder/${process.env.CLICKUP_FOLDER_ID}/list`, {
            headers: {
                'Authorization': process.env.CLICKUP_API_KEY || '',
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch ClickUp lists' });
    }
  });

  app.get("/api/clickup/tasks/:listId", async (req, res) => {
    try {
        const response = await fetch(`https://api.clickup.com/api/v2/list/${req.params.listId}/task?page=0&include_closed=true&subtasks=true`, {
            headers: {
                'Authorization': process.env.CLICKUP_API_KEY || '',
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch ClickUp tasks' });
    }
  });

  // External endpoint for other dashboards to fetch current phase
  app.get("/api/external/client-phases", async (req, res) => {
      try {
        // 1. Fetch lists
        const listsResponse = await fetch(`https://api.clickup.com/api/v2/folder/${process.env.CLICKUP_FOLDER_ID}/list`, {
            headers: { 'Authorization': process.env.CLICKUP_API_KEY || '', 'Content-Type': 'application/json' }
        });
        const listsData = await listsResponse.json();
        const lists = listsData.lists || [];

        // 2. Define stages logic
        const STAGES = [
          { id: 'planning', label: 'Planning', number: '01', keywords: ['planning', 'strategy', 'discovery'] },
          { id: 'design', label: 'Design', number: '02', keywords: ['design', 'wireframe', 'ui', 'ux'] },
          { id: 'revision', label: 'Revision', number: '03', keywords: ['revision', 'feedback', 'review'] },
          { id: 'testing', label: 'Testing', number: '04', keywords: ['testing', 'qa', 'staging'] },
          { id: 'handoff', label: 'Handoff', number: '05', keywords: ['handoff', 'delivery', 'live', 'prod'] }
        ];

        const results = [];

        // 3. For each list, fetch tasks and compute active phase
        for (const list of lists) {
             const tasksResponse = await fetch(`https://api.clickup.com/api/v2/list/${list.id}/task?page=0&include_closed=true&subtasks=true`, {
                 headers: { 'Authorization': process.env.CLICKUP_API_KEY || '', 'Content-Type': 'application/json' }
             });
             const tasksData = await tasksResponse.json();
             const tasks = tasksData.tasks || [];

             let currentPhaseLabel = "01 Planning"; // Default
             let firstActiveStageIndex = -1;

             for (let i = 0; i < STAGES.length; i++) {
                 const stage = STAGES[i];
                 const isDoneStatus = (sts: string) => ['complete', 'closed', 'done', 'finished'].includes(sts?.toLowerCase() || '');
                 
                 const stageTasks = tasks.filter((t: any) => 
                     stage.keywords.some(k => t.name.toLowerCase().includes(k) || t.status.status.toLowerCase().includes(k))
                 );
                 
                 // If there's an in progress/to-do task in this stage, this stage is active
                 const hasActive = stageTasks.some((t: any) => !isDoneStatus(t.status.status));

                 if (stageTasks.length > 0 && hasActive) {
                     if (firstActiveStageIndex === -1) {
                         firstActiveStageIndex = i;
                     }
                 }
             }

             if (firstActiveStageIndex !== -1) {
                 currentPhaseLabel = STAGES[firstActiveStageIndex].number + " " + STAGES[firstActiveStageIndex].label;
             } else if (tasks.length > 0) {
                 // Check if all are done
                 const allDone = tasks.every((t: any) => ['complete', 'closed', 'done', 'finished'].includes(t.status.status.toLowerCase()));
                 if (allDone) currentPhaseLabel = "05 Handoff (Completed)";
             } else {
                 currentPhaseLabel = "Not Started";
             }

             results.push({
                 projectId: list.id,
                 projectName: list.name,
                 currentPhase: currentPhaseLabel,
                 tasksAnalyzed: tasks.length
             });
        }

        res.json({ success: true, timestamp: new Date().toISOString(), projects: results });
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  });

  // Supabase proxy? Actually for Supabase, client-side is fine, but the user requested backend.
  // Given their request, I'll pass the URL and key to the frontend via an API endpoint,
  // or construct the client on the backend if they really wanted all traffic proxied.
  // The easiest is just to provide an API endpoint to get the config:
  // Supabase API Routes
  const getSupabaseClient = () => {
      const url = process.env.SUPABASE_URL || 'https://mock.supabase.co';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'mock-key';
      return createClient(url, key);
  }

  // In-memory fallback if Supabase is missing
  let mockClients: any[] = [];
  let nextMockId = 1;

  const isSupabaseMocked = !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('mock.supabase.co');

  app.post("/api/emails", async (req, res) => {
      try {
          const key = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
          if (!key) {
              return res.status(400).json({ error: "No Resend API Key configured" });
          }
          const response = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(req.body)
          });
          const data = await response.json();
          if (!response.ok) {
              return res.status(response.status).json(data);
          }
          res.json(data);
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  });

  app.get("/api/clients", async (req, res) => {
      try {
          if (isSupabaseMocked) {
              return res.json([...mockClients].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          }
          const supabase = getSupabaseClient();
          const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          res.json(data);
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  });

  app.post("/api/clients", async (req, res) => {
      try {
          if (isSupabaseMocked) {
              const newClient = {
                  ...req.body,
                  id: `mock-id-${nextMockId++}`,
                  created_at: new Date().toISOString()
              };
              mockClients.push(newClient);
              return res.json([newClient]);
          }
          const supabase = getSupabaseClient();
          const { data, error } = await supabase.from('clients').insert([req.body]).select();
          if (error) throw error;
          res.json(data);
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  });

  app.patch("/api/clients/:id", async (req, res) => {
      try {
          if (isSupabaseMocked) {
              const clientIndex = mockClients.findIndex(c => c.id === req.params.id);
              if (clientIndex !== -1) {
                  mockClients[clientIndex] = { ...mockClients[clientIndex], ...req.body };
                  return res.json([mockClients[clientIndex]]);
              }
              return res.status(404).json({ error: "Client not found" });
          }
          const supabase = getSupabaseClient();
          const { data, error } = await supabase.from('clients').update(req.body).eq('id', req.params.id).select();
          if (error) throw error;
          res.json(data);
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  });

  app.delete("/api/clients/:id", async (req, res) => {
      try {
          if (isSupabaseMocked) {
              const clientIndex = mockClients.findIndex(c => c.id === req.params.id);
              if (clientIndex !== -1) {
                  const deleted = mockClients[clientIndex];
                  mockClients.splice(clientIndex, 1);
                  return res.json([deleted]);
              }
              return res.status(404).json({ error: "Client not found" });
          }
          const supabase = getSupabaseClient();
          const { data, error } = await supabase.from('clients').delete().eq('id', req.params.id).select();
          if (error) throw error;
          res.json(data);
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  });

  app.post("/api/portal/auth", async (req, res) => {
      try {
          const { id, accessCode } = req.body;
          if (isSupabaseMocked) {
              const client = mockClients.find(c => c.id === id && c.access_code === accessCode && c.status === 'Active');
              if (client) {
                  return res.json({ success: true, listId: client.clickup_list_id, clientName: client.name, clientId: client.client_id });
              }
              return res.status(401).json({ error: "Invalid code or client inactive" });
          }
          const supabase = getSupabaseClient();
          const { data, error } = await supabase.from('clients')
            .select('clickup_list_id, name, access_code, status, client_id')
            .eq('id', id).single();
          
          if (error || !data) throw error;
          
          if (data.access_code === accessCode && data.status === 'Active') {
              return res.json({ success: true, listId: data.clickup_list_id, clientName: data.name, clientId: data.client_id });
          }
          return res.status(401).json({ error: "Invalid code or client inactive" });
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  });

  app.get("/api/config", (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_ANON_KEY,
        clickUpApiKey: process.env.CLICKUP_API_KEY,
        clickUpFolderId: process.env.CLICKUP_FOLDER_ID,
        googleApiKey: process.env.GOOGLE_API_KEY
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ... Existing code up to listen ...
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  return app;
}

const appPromise = startServer();
// Need to export the app if Vercel serverless requires it
export default appPromise;
