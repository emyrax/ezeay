# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Deployment

See `docs/DEPLOY.md` for the full step-by-step production deployment guide (accounts, EAS setup, signing credentials, Fly.io secrets, acceptance checklist).

### App builds (EAS)

Profiles live in `eas.json`: `development` (dev-client), `preview` (internal test builds), `production` (store: AAB + App Store). CI runs lint, typechecks, and a web export on every PR; a tag `v*` (or manual `workflow_dispatch`) triggers internal iOS + Android preview builds via `.github/workflows/eas-build.yml`.

One-time setup (requires an Expo account — run locally, never in CI):

```bash
npx eas init        # links the project, writes extra.eas.projectId into app.json
npx eas build:configure
npx eas credentials # iOS signing certs/profiles + Android keystore
```

Set the production envs in EAS (dashboard → project → Environment variables or `eas env`):

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | live Clerk publishable key (`pk_live_...`) |
| `EXPO_PUBLIC_API_URL` | production API origin, e.g. `https://api.your-domain.com` |

`.env.example` mirrors what CI needs. EAS store submissions: `eas submit --platform all --profile production`.

### Server (Fly.io)

The server is an Express app run via `tsx` (same as `npm run start:server`). `fly.toml` + `Dockerfile` are checked in.

```bash
# one-time: create the app (needs flyctl + Fly account); do NOT run fly launch
fly apps create ezeay-api
fly volume create uploads --region iad --size 1   # before first deploy; must match fly.toml region

# env & secrets (never in git)
fly secrets set NEON_DATABASE_URL=... CLERK_SECRET_KEY=... GEMINI_API_KEY=...
fly secrets set OPENAI_API_KEY=... ANTHROPIC_API_KEY=... OPENROUTER_API_KEY=...
fly secrets set CORS_ORIGINS=https://app.your-domain.com GLOBAL_RATE_LIMIT=300 STRICT_RATE_LIMIT=20
fly secrets set STUDY_FETCH_ALLOWLIST=
fly secrets list

fly deploy            # builds + deploys; uploads persist on the "uploads" volume
fly volumes snapshot list # backup the uploads volume as needed
```

Notes:
- User-uploaded study files persist at `/app/server/uploads` on a Fly volume (survives redeploys). Cloudinary is not wired into the client.
- Health check hits `/api/health`.
- Deploy with `NODE_ENV=production` (already set in `fly.toml`) so CORS is locked to `CORS_ORIGINS` only.
