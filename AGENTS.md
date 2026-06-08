# Custom Agent Instructions

## Environment Variables & Secrets
For this project, use Doppler environment variables. NEVER hardcode any secrets.

**Backend (Node.js):**
* `CLICKUP_API_KEY` → `process.env.CLICKUP_API_KEY` 
* `CLICKUP_FOLDER_ID` → `process.env.CLICKUP_FOLDER_ID`
* `RESEND_API_KEY` → `process.env.RESEND_API_KEY`
* `SUPABASE_ANON_KEY` → `process.env.SUPABASE_ANON_KEY`
* `SUPABASE_URL` → `process.env.SUPABASE_URL`

**Frontend (Vite/React):**
* DO NOT USE ANY SECRETS OR ENV VARS IN THE FRONTEND. Route all API calls through the backend (`/api/*`).

**Rule:** Apply this to all future code generated for this project.
