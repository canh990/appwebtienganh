Deployment guide

This repository includes GitHub Actions to automate deployment of the frontend to Vercel and the backend to Railway.

Required GitHub Secrets
- `VERCEL_TOKEN` — Vercel personal token
- `VERCEL_ORG_ID` — (optional) Vercel organization ID or scope
- `VERCEL_PROJECT_ID` — (optional) Vercel project id
- `RAILWAY_TOKEN` — Railway personal token
- `RAILWAY_PROJECT_ID` — Railway project id

How it works
- On push to `main`, `.github/workflows/deploy-frontend.yml` builds `frontend/` and runs the Vercel CLI to deploy.
- On push to `main`, `.github/workflows/deploy-backend.yml` installs dependencies in `backend/` and runs the Railway CLI to deploy.

Before you use these workflows
1. Push this repo to GitHub and enable Actions.
2. Create a project on Railway for the backend and add a MySQL plugin (or configure DB). Copy the project id.
3. Create a Vercel project for the frontend (optional to create manually) and copy any org/project ids if needed.
4. In the GitHub repository Settings → Secrets, add the secrets listed above.

Notes & troubleshooting
- CI uses the `vercel` and `@railway/cli` CLIs. If your Vercel/​Railway setup requires additional flags (org/project IDs), set `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `RAILWAY_PROJECT_ID` secrets.
- If you prefer the web dashboard integrations (recommended for first-time deploy), connect the GitHub repo directly in Vercel and Railway dashboard instead of using the CLI.

If you want, I can also:
- Open pull requests to add these workflows to other branches or customize them further.
- Add steps to set Railway environment variables from GitHub secrets automatically (requires more Railway CLI commands).

Auto-sync environment variables from GitHub Secrets
-----------------------------------------------
You can automate copying environment variables stored as GitHub Secrets into Vercel and Railway by using the included workflow `.github/workflows/sync-envs.yml`.

How to provide variables
- Create two GitHub Secrets containing JSON objects (string value):
	- `VERCEL_ENV_JSON` — JSON of key/value pairs for the frontend. Example:

		{"VITE_API_URL":"https://api.yourdomain.com","ANOTHER_KEY":"value"}

	- `RAILWAY_ENV_JSON` — JSON of key/value pairs for the backend. Example:

		{"DB_HOST":"db.host","DB_USER":"user","DB_PASS":"pass","DB_NAME":"dbname","JWT_SECRET":"secret"}

Also make sure `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `RAILWAY_TOKEN`, and `RAILWAY_PROJECT_ID` are set as repository Secrets.

Triggering
- The sync workflow runs automatically on push to `main`, and can be run manually from the Actions tab (select "Sync Environment Variables to Vercel & Railway").

Notes
- The workflow uses the Vercel CLI and Railway CLI to create/update env vars. It expects the CLIs to support non-interactive `env add` / `variables set` commands. If your CLI version behaves differently, use the web dashboards or the platform APIs.
- Secrets values are copied into the target platforms as-is; keep them encrypted in GitHub Secrets.
