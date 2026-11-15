# Deploy Demenova (Render + GitHub Actions)

Owner: devops-engineer (T-029). Roberto does every step below; agents cannot click dashboards or hold secrets.
Values come from your own `.env`; never paste them into a file, commit, issue, screenshot or chat.

## 1. GitHub Environment `production` and its secrets (pipeline workflow)

The pipeline job declares `environment: production`, so its secrets reach only that job, and only on `main`.
1. Repository > **Settings** > **Environments** > **New environment**, name `production` > **Configure environment**.
2. **Deployment branches and tags** > **Selected branches and tags** > **Add deployment branch or tag rule** >
   Ref type **Branch**, pattern `main` > **Add rule**.
3. Under **Environment secrets** > **Add secret**, one per name below (environment secrets, not repository secrets):

| Name | Used by |
| --- | --- |
| `EARTHDATA_USERNAME`, `EARTHDATA_PASSWORD` | `pipeline.yml` Earthdata login check (and the live ingest, once built) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `pipeline.yml` Severe email publishing |
| `RESEND_API_KEY`, `ALERT_EMAIL_TO` | `pipeline.yml` Severe email publishing |

Optional, under **Environment variables** > **Add variable** (not a secret): `APP_BASE_URL` = the public Render
app URL, used for the link in emails. Environments are free for public repositories (this repo is public).
`ci.yml` needs no secret. A missing secret makes `pipeline.yml` skip that step with a warning; it never fails open.
Note: `EARTHDATA_TOKEN` is not read by `pipeline/ingest/auth.py`; use username and password.

## 2. Render Blueprint (app + backend)

`render.yaml` must be on the branch you link (push it first).
1. Render Dashboard > **New > Blueprint** > **Connect** next to the Demenova repository.
2. Name the Blueprint, choose the branch (`main` once merged; `block/2-core` to try it now). Blueprint Path: leave default.
3. Render prompts for every `sync: false` variable. Enter:
   - `demenova-app` (Static Site): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (anon key only, never the service role).
   - `demenova-api` (Web Service, free): `ADMIN_TOKEN`, `RESEND_API_KEY`, `ALERT_EMAIL_TO`, `SUPABASE_URL`,
     `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL` (after step 4 you know the app URL; it may be left empty first).
4. **Deploy Blueprint**. Wait for both services to go live; copy their `onrender.com` URLs.
5. Check the app sends its security headers (DevTools > Network > the document > Response Headers:
   Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) and the Console shows no
   CSP errors on Home, Map and a Lot. Then open `https://<api>.onrender.com/health` (expect `{"status":"ok"}`; first call after sleep is slow), and
   open the app URL on a phone. If `APP_BASE_URL` was empty, set it now in the api service > Environment.
6. Record both public URLs in `docs/HANDOFF.md` and `README.md`; open each in a private window to confirm public.

Both services use `autoDeployTrigger: checksPass`: a push deploys only after the GitHub CI checks pass.
`sync: false` values are asked for only once, at Blueprint creation; later changes go in each service's Environment page.

## 3. Pipeline workflow

GitHub runs `schedule` and shows **Run workflow** only for workflow files on the default branch (`main`).
After merge: Actions > **pipeline** > **Run workflow** once, and confirm green. Until the live ingest/score entry
point exists, the run does: locked install, Earthdata login check, Severe email publishing from Supabase.
The demo replay is committed static data and never depends on this workflow.
