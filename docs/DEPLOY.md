# Yuinx — Production Deployment Guide

## 0. Accounts & prerequisites

| Account | Needed for | Notes |
|---|---|---|
| expo.dev | EAS builds | Free tier (limited concurrent builds) |
| Clerk | Auth | Dev instance exists; create a **live** one for prod |
| Neon (neon.tech) | Postgres DB | Free tier OK |
| Google AI Studio | `GEMINI_API_KEY` | Free; required |
| OpenAI / Anthropic / OpenRouter | optional AI models | Only if users select those models |
| fly.io | Server host | Free trial; paid for always-on |
| Apple Developer ($99/yr) | iOS builds/submission | Required for iOS |
| Google Play Console ($25) | Android submission | One-time fee |

Local tools: **Node 22+**, **git**, **EAS CLI**, **Fly CLI**:

```powershell
npm install -g eas-cli
irm https://fly.io/install.ps1 | iex   # Windows; macOS/Linux: curl -L https://fly.io/install.sh | sh
```

---

## Part 1 — App builds (EAS)

### 1.1 Login & link the project

```powershell
eas login                # browser flow, logs into your Expo account
eas init                 # links this repo → writes extra.eas.projectId into app.json
```

> `eas init` interactively creates the project on your Expo dashboard. **Do NOT run `eas build:configure`** — it would overwrite the checked-in `eas.json`.

Verify `app.json` now has:

```json
"extra": { "eas": { "projectId": "..." } }
```

### 1.2 Create the LIVE Clerk instance

1. dashboard.clerk.com → **Add application** → name `Yuinx`, Sign-in: email + Google + Apple.
2. Copy from **API Keys**:
   - Publishable key → `pk_live_...`
   - Secret key → `sk_live_...`

### 1.3 Set build-time env vars in EAS

`EXPO_PUBLIC_*` vars are **inlined at build time**, so they must live on the EAS project (never in git). Dashboard: expo.dev → your project → **Environment variables** → *Create*:

| Name | Value | Visibility | Environments |
|---|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` (Clerk live) | Plain | preview, production |
| `EXPO_PUBLIC_API_URL` | `https://<your-api>.fly.dev` (final URL from Part 2) | Plain | preview, production |

CLI alternative:

```powershell
eas env:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_..." --environment preview,production --visibility plain --non-interactive
eas env:create --name EXPO_PUBLIC_API_URL --value "https://yuinx.fly.dev" --environment preview,production --visibility plain --non-interactive
eas env:list
```

> Production builds **throw without** `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (see `app/_layout.tsx:190`). Leave these on the EAS project and the CI workflow (which uses EAS envs) will pick them up automatically.

### 1.4 Provision signing credentials

**Android** (managed keystore — nothing to do manually):

```powershell
eas build --profile preview --platform android
```

First run generates and stores an EAS-managed keystore automatically. It prints a **keystore backup URL — save it**.

**iOS** (needs Apple Dev account):

```powershell
eas credentials
```

→ Platform **iOS** → log in with your Apple ID → *Add new* → create **Distribution certificate** (and provisioning profile). Also register test devices for internal builds:

```powershell
eas device:create
```

Run the first iOS build interactively so credentials persist:

```powershell
eas build --profile preview --platform ios
```

### 1.5 First test builds

```powershell
eas build --profile preview --platform android     # → APK
eas build --profile preview --platform ios         # → installs to registered devices / TestFlight
```

Install the Android APK, sign in, and confirm course/quiz generation answers against the Fly server.

### 1.6 Wire up CI

1. expo.dev → **Access tokens** → *Create token* (`EXPO_TOKEN`).
2. GitHub → repo → **Settings → Secrets and variables → Actions** → *New repository secret*:

   | Secret | Value |
   |---|---|
   | `EXPO_TOKEN` | the Expo token from step 1 |

Triggers:

```powershell
git tag v1.0.0
git push origin v1.0.0      # → .github/workflows/eas-build.yml builds iOS + Android (preview)
```

Manual run: GitHub → **Actions** → *EAS Build* → *Run workflow*.

> If iOS credentials aren't provisioned yet, temporarily change `--platform all` to `--platform android` in `.github/workflows/eas-build.yml`.

### 1.7 Store submission (when ready)

```powershell
eas build --profile production --platform android    # → AAB
eas build --profile production --platform ios
eas submit --platform all --profile production
```

- Android: upload the AAB to Play Console → `com.ezeay.app` → Internal testing → promote.
- iOS: `eas submit` pushes to App Store Connect → TestFlight → App Review. Bundle id must exist in your Apple portal; if `com.ezeay.app` conflicts, change `ios.bundleIdentifier` in `app.json`.

> Big-binary note: `expo-ai-kit` + `llm: true` make builds large (~200–400 MB). On-device Gemma models are downloaded in-app per user, not in the binary.

---

## Part 2 — Server (Fly.io)

`fly.toml`, `Dockerfile`, `.dockerignore` are already committed. The server runs exactly like local dev (`npx tsx server/index.ts`).

### 2.1 Login & create the app

```powershell
flyctl auth login
fly apps create yuinx
```

If the name is taken, pick another and update `app` in `fly.toml`. Your production URL becomes `https://yuinx.fly.dev`.

> Do **not** run `fly launch` — `fly.toml` already exists and `fly launch` would prompt about Postgres/Redis (you don't need them; DB is Neon).

### 2.2 Create the uploads volume (before first deploy)

`fly.toml` mounts a volume at `/app/server/uploads` (study-file uploads). Fly refuses to start with a missing mount:

```powershell
fly volume create uploads --region iad --size 1    # 1 GB; region must match fly.toml primary_region
fly volume list
```

### 2.3 Configure the Neon database

1. neon.tech → *Create project* (region: `US East (Virginia)` to match Fly `iad`) → copy the **direct connection string**:

   ```
   postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

   (Use the plain host, **not** the `-pooler` variant.)

2. Apply the schema once (from this repo):

   ```powershell
   $env:NEON_DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
   npm run db:migrate        # applies committed migrations in /drizzle
   ```

   (Only needs doing once per database.)

> **Reusing a database that was created with `db:push`?** `drizzle-kit migrate` will fail with `relation ... already exists` because `db:push` never records migration history. Baseline it once, before the first deploy.
>
> In Neon → **SQL Editor**, check what exists:
>
> ```sql
> select count(*) from drizzle.__drizzle_migrations;
> select table_name from information_schema.tables
> where table_schema = 'public' order by table_name;
> ```
>
> This repo's shared dev DB matched migration `0016` with migration `0017` unapplied, so the baseline was a single row:
>
> ```sql
> insert into drizzle.__drizzle_migrations (hash, created_at)
> values ('6343dd30fe5082bcf24915aec428f37c8e0fd0cfc1b49853647f91041cdc60d3', 1794414879517);
> ```
>
> Then apply the remaining migrations locally:
>
> ```powershell
> npm run db:migrate
> ```
>
> For a different database, find the last migration it already matches in `drizzle/meta/_journal.json`, compute `sha256` of that `.sql` file, and insert its `when` timestamp. From then on, use `db:generate` + `npm run db:migrate` — never `db:push` against a migrated database.
>
> Note: reusing the shared dev DB means the hosted app and local dev read/write the same data, and testers can change it. Fine for a testing stage; isolate with a Neon branch before real users.

### 2.4 Set server secrets

Required + optional — Fly secrets are encrypted and never readable after set:

```powershell
fly secrets set "NEON_DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
fly secrets set "CLERK_SECRET_KEY=sk_live_..."
fly secrets set "GEMINI_API_KEY=..."
fly secrets set "EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=..."          # required: avatar/community/course images
fly secrets set "EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=..."       # required unless using signed uploads
fly secrets set "OPENAI_API_KEY=..."          # optional
fly secrets set "ANTHROPIC_API_KEY=..."       # optional
fly secrets set "OPENROUTER_API_KEY=..."      # optional
fly secrets set "CLOUDINARY_AUDIO_UPLOAD_PRESET=..."   # optional: animated lesson audio clips
fly secrets set "CORS_ORIGINS=https://ezeay.vercel.app"   # every browser origin that calls the API
fly secrets set "GLOBAL_RATE_LIMIT=300"
fly secrets set "STRICT_RATE_LIMIT=20"
fly secrets set "STUDY_FETCH_ALLOWLIST="     # optional; comma-separated hosts for absolute study URLs
fly secrets list                              # verify names (values masked)
```

> Testing stage only: you can keep the existing **Clerk test instance** (`sk_test_...` here must match the `pk_test_...` baked into the hosted frontend). Create the live instance and swap keys only when moving to production.
>
> Two upload paths exist and **both must be configured**: images go `POST /api/uploads/cloudinary` (Cloudinary secrets above), while study files go `POST /api/study/upload` and need the `uploads` volume from §2.2.

`PORT`/`NODE_ENV` are already set in `fly.toml` (8080 / production) — no secret needed. In production, CORS is locked to `CORS_ORIGINS` plus the hardcoded app/web origins (`server/index.ts:145-165`), which is fine for native apps (they don't send an `Origin` header).

### 2.5 Continuous deployment on `git push`

`fly.toml` uses `[deploy] release_command = "npm run db:migrate"`: every deploy applies committed Drizzle migrations before machines boot, and a failed migration aborts the deploy with the previous release still running.

`.github/workflows/ci.yml` deploys the API automatically:

- Pull requests: lint, typecheck, tests only — never deploys.
- Push to `main`: the `deploy` job runs **after** `app`, `server`, and `test` pass, then `flyctl deploy --remote-only`.

One-time setup:

1. Create an app-scoped deploy token and copy it:
   ```powershell
   fly tokens create deploy -a yuinx
   ```
2. GitHub → repo → **Settings → Secrets and variables → Actions** → *New repository secret* → `FLY_API_TOKEN` = the token.

After that, the normal flow is `git push origin main` → CI → deploy, with no Fly CLI needed on your machine. Rollback with `fly releases` + `fly deploy --image registry.fly.io/yuinx:deployment-<id>`.

### 2.6 Deploy manually (first time or hotfix)

```powershell
fly deploy --remote-only  # builds on Fly's builders (no local Docker needed)
fly status                # wait for "running"
fly logs                  # confirm: "[Server] Running on http://localhost:8080"
```

Health check hits `/api/health` automatically (`fly.toml` → `[http_service.checks]`).

### 2.7 Verify the API end-to-end

```powershell
curl https://yuinx.fly.dev/api/health
# → {"status":"ok","database":"ok","ai":{...}} 200
```

Full app check: sign in on the **hosted build** → generate a course (calls `/api/courses/generate` with your Gemini/AI key) → upload an avatar (Cloudinary) → upload a study file → confirm it survives a `fly deploy` (volume persistence).

### 2.8 Point the hosted web app (Vercel) at the API

`EXPO_PUBLIC_*` values are inlined at build time, so the Vercel project must be **rebuilt**, not restarted:

1. Vercel → project → **Settings → Environment Variables** (Production):
   - `EXPO_PUBLIC_API_URL` = `https://yuinx.fly.dev`
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` = the `pk_test_...` (or `pk_live_...`) matching the server's `CLERK_SECRET_KEY`
2. **Redeploy** the project (Deployments → ⋯ → Redeploy, or push to `main`).
3. Clerk dashboard → the same instance → add the deployed origin (e.g. `https://ezeay.vercel.app`) to allowed origins/redirect URLs.
4. Add every browser origin to the Fly `CORS_ORIGINS` secret (comma-separated) and redeploy. Vercel **preview** URLs (`*-git-*.vercel.app`) are not allowed unless explicitly listed.

### 2.9 Custom domain (optional)

```powershell
fly certs add api.yourdomain.com
fly ips list             # add AAAA + A records at your DNS provider
```

Then update `EXPO_PUBLIC_API_URL` (Vercel/EAS) and `CORS_ORIGINS` (Fly), and rebuild the frontend.

### 2.10 Ops notes

- **Cold start:** `fly.toml` currently keeps one machine warm (`min_machines_running = 1`) for the testing stage. Lower it to `0` when idle cost matters; the first request after idle then costs a few seconds of boot.
- **Uploads backups:**
  ```powershell
  fly volumes snapshot create <volume-id>     # on-demand snapshot
  fly volumes snapshot list
  ```
- **DB migrations after future schema changes:** run `npm run db:generate` locally and commit `drizzle/`. The next deploy applies them automatically via the release command (no manual `db:migrate` needed).
- **Rate limits:** tune `GLOBAL_RATE_LIMIT`/`STRICT_RATE_LIMIT` via `fly secrets set` + redeploy.

---

## Part 3 — End-to-end acceptance checklist

After everything is live, verify on a hosted build (not Expo Go):

- [ ] `GET /api/health` returns 200 with `database: "ok"` (also checks AI provider keys)
- [ ] Sign in against the Clerk instance used by the frontend (test instance is fine for testing)
- [ ] Generate a course → succeeds (server reaches Gemini/AI provider)
- [ ] Generate a quiz / bounty / schedule suggestions
- [ ] Upload an avatar / community image → Cloudinary URL returned
- [ ] Upload a PDF/audio study file → process → chat answers from RAG
- [ ] Restart the app → session persists (Clerk token cache via expo-secure-store)
- [ ] Push a commit to `main` → GitHub Actions deploy job green → health still OK → uploaded files still downloadable (volume)
- [ ] Offline Gemma: Settings → Offline AI → downloads and answers a question with the **server unreachable**

---

## Part 4 — Secrets reference (never commit)

| Where | Secret/Var |
|---|---|
| EAS project env | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL` |
| Vercel project env | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL` (build-time inlined) |
| GitHub Actions | `EXPO_TOKEN`, `FLY_API_TOKEN` |
| Fly secrets | `NEON_DATABASE_URL`, `CLERK_SECRET_KEY`, `GEMINI_API_KEY`, `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME`, `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, optional AI keys / `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_AUDIO_UPLOAD_PRESET`, `CORS_ORIGINS`, `GLOBAL_RATE_LIMIT`, `STRICT_RATE_LIMIT`, `STUDY_FETCH_ALLOWLIST` |
| Local only | `.env` (dev), `server/.env` (never pushed) |