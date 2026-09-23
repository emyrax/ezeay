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
eas env:create --name EXPO_PUBLIC_API_URL --value "https://ezeay-api.fly.dev" --environment preview,production --visibility plain --non-interactive
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
fly apps create ezeay-api
```

If the name is taken, pick another and update `app` in `fly.toml`. Your production URL becomes `https://ezeay-api.fly.dev`.

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
   # alternative: npm run db:push
   ```

   (Only needs doing once per database.)

### 2.4 Set server secrets

Required + optional — Fly secrets are encrypted and never readable after set:

```powershell
fly secrets set "NEON_DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
fly secrets set "CLERK_SECRET_KEY=sk_live_..."
fly secrets set "GEMINI_API_KEY=..."
fly secrets set "OPENAI_API_KEY=..."          # optional
fly secrets set "ANTHROPIC_API_KEY=..."       # optional
fly secrets set "OPENROUTER_API_KEY=..."      # optional
fly secrets set "CORS_ORIGINS=https://yourapp.example.com"   # only if you later host the web app
fly secrets set "GLOBAL_RATE_LIMIT=300"
fly secrets set "STRICT_RATE_LIMIT=20"
fly secrets set "STUDY_FETCH_ALLOWLIST="     # optional; comma-separated hosts for absolute study URLs
fly secrets list                              # verify names (values masked)
```

`PORT`/`NODE_ENV` are already set in `fly.toml` (8080 / production) — no secret needed. In production, CORS is locked to `CORS_ORIGINS` only (`server/index.ts:56-63`), which is fine for native apps (they don't send an `Origin` header).

### 2.5 Deploy

```powershell
fly deploy
fly status               # wait for "running"
fly logs                 # confirm: "[Server] Running on http://localhost:8080"
```

Health check hits `/api/health` automatically (`fly.toml` → `[http_service.checks]`).

### 2.6 Verify the API end-to-end

```powershell
curl https://ezeay-api.fly.dev/api/health
# → {"status":"ok", ...} or similar 200
```

Full app check: sign in on the **production build** → generate a course (calls `/api/courses/generate` with your Gemini/AI key) → upload a study file → confirm it survives a `fly deploy` (volume persistence).

### 2.7 Custom domain (optional)

```powershell
fly certs add api.yourdomain.com
fly ips list             # add AAAA + A records at your DNS provider
```

Then update EAS `EXPO_PUBLIC_API_URL` to `https://api.yourdomain.com` and rebuild.

### 2.8 Ops notes

- **Cold start:** `fly.toml` auto-stops idle machines (`min_machines_running = 0`); first request after idle costs a few seconds of boot. Raise `min_machines_running` to 1 to keep it warm (billed continuously).
- **Uploads backups:**
  ```powershell
  fly volumes snapshot create <volume-id>     # on-demand snapshot
  fly volumes snapshot list
  ```
- **DB migrations after future schema changes:** run `npm run db:generate` locally, commit `drizzle/`, then locally run `npm run db:migrate` again against Neon (or wire a one-off `fly machine run`).
- **Rate limits:** tune `GLOBAL_RATE_LIMIT`/`STRICT_RATE_LIMIT` via `fly secrets set` + redeploy.

---

## Part 3 — End-to-end acceptance checklist

After everything is live, verify on a production build (not Expo Go):

- [ ] Sign up / sign in (email + Google + Apple) against the **live** Clerk instance
- [ ] Generate a course → succeeds (server reaches Gemini/AI provider)
- [ ] Generate a quiz / bounty / schedule suggestions
- [ ] Upload a PDF/audio study file → process → chat answers from RAG
- [ ] Restart the app → session persists (Clerk token cache via expo-secure-store)
- [ ] `fly deploy` again → uploaded files still downloadable (volume)
- [ ] Kill/suspend the server while idle → request wakes it within ~10 s
- [ ] Offline Gemma: Settings → Offline AI → downloads and answers a question with the **server unreachable**

---

## Part 4 — Secrets reference (never commit)

| Where | Secret/Var |
|---|---|
| EAS project env | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL` |
| GitHub Actions | `EXPO_TOKEN` |
| Fly secrets | `NEON_DATABASE_URL`, `CLERK_SECRET_KEY`, `GEMINI_API_KEY`, optional AI keys, `CORS_ORIGINS`, `GLOBAL_RATE_LIMIT`, `STRICT_RATE_LIMIT`, `STUDY_FETCH_ALLOWLIST` |
| Local only | `.env` (dev), `server/.env` (never pushed) |