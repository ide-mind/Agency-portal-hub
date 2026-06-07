# Custom Agent Instructions

## Environment Variables & Secrets
For this project, use Doppler environment variables. NEVER hardcode any secrets.

**Backend (Node.js):**
* `CLICKUP_API_KEY` → `process.env.CLICKUP_API_KEY` 
* `CLICKUP_FOLDER_ID` → `process.env.CLICKUP_FOLDER_ID`

**Frontend (Vite/React):**
* `VITE_RESEND_API_KEY` → `import.meta.env.VITE_RESEND_API_KEY`
* `VITE_SUPABASE_ANON_KEY` → `import.meta.env.VITE_SUPABASE_ANON_KEY`
* `VITE_SUPABASE_URL` → `import.meta.env.VITE_SUPABASE_URL`

**Rule:** Apply this to all future code generated for this project.
