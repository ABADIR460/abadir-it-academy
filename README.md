# Abadir IT Academy — Replacement Package

This ZIP contains the public website, admin dashboard and a Node/Express backend intended for Render + Supabase.

## Files
- `index.html`, `style.css`, `script.js`: public website and registration form
- `admin.html`, `admin.css`, `admin.js`: admin login and student management
- `config.js`: public Render API URL only
- `backend/`: API server, package.json, environment example and Supabase schema

## Important: deployment is not automatic
Uploading this ZIP to GitHub Pages does not deploy the backend. The admin login will only work after the backend code is deployed to Render and its environment variables are set.

## 1. Supabase
1. Open your Supabase project and go to SQL Editor.
2. Run `backend/supabase_schema.sql`.
3. In Project Settings / API, copy the Project URL and service-role key. The service-role key is SECRET: only add it to Render Environment Variables, never to `config.js` or frontend code.

## 2. Render backend
1. Create a Web Service connected to the GitHub repository/folder containing `backend` (or deploy this folder as the service root).
2. Build command: `npm install`
3. Start command: `npm start`
4. Add environment variables:
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service-role key
   - `ADMIN_USERNAME` = your chosen admin username
   - `ADMIN_PASSWORD` = a long, unique password
   - `ADMIN_TOKEN_SECRET` = a random secret at least 32 characters
   - `FRONTEND_ORIGIN` = exact GitHub Pages origin, e.g. `https://YOURNAME.github.io` (include repository path only if your host requires it)
5. Deploy and check `https://YOUR-RENDER-SERVICE.onrender.com/api/health`.

## 3. Frontend
1. Edit `config.js` and set `API_BASE` to your actual Render service URL.
2. Upload the frontend files to the GitHub Pages repository root.
3. Open `admin.html` on the published site and log in with `ADMIN_USERNAME` and `ADMIN_PASSWORD` values from Render.

## 4. Test safely
- Submit one test registration.
- Log in to the admin page and confirm it appears.
- Test edit and delete only with test records first.
- Never share the Supabase service-role key or admin password in chat or commit them to GitHub.

## Troubleshooting
- 503: required Render environment variables are missing.
- 401: wrong username/password, invalid token, or expired session.
- CORS error: check `FRONTEND_ORIGIN` matches the published site origin.
- Registration/database error: confirm the SQL table exists and Render's Supabase URL/key are correct.
- The public registration endpoint is intentionally public; consider rate limiting and spam protection before advertising the form widely.
