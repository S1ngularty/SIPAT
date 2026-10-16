# AGENTS.md

SIPAT — crop disease/pest identification from short videos. Git root is this
directory; there is **no root `package.json`** and no root build. Four
independent projects, each with its own toolchain and lockfile:

| Path             | Stack                                  | Run                                                       |
| ---------------- | -------------------------------------- | --------------------------------------------------------- |
| `backend/`       | Express 5 + TypeScript (ESM), MongoDB  | `npm run dev` (API), `npm run worker` (jobs)              |
| `mobile/`        | Expo / React Native (SDK 57) + Clerk   | `npm start` (`expo start`)                                |
| `ai-processing/` | FastAPI + Ultralytics YOLO             | `uvicorn main:app` from `ai-processing/app`               |
| `model_training/` | Offline Python scripts (YOLO training) | Not a service; run scripts directly                       |

Full backend layer/API reference: `docs/BACKEND.md`. Mobile has its own
`mobile/AGENTS.md` (see the Expo note below).

## Backend (`backend/`)

- **TypeScript ESM with NodeNext.** Relative imports MUST keep the `.js`
  extension even though the source is `.ts` (e.g. `./video.service.js`). Dropping
  it breaks the build.
- **Two processes, not one.** `server.ts` is the HTTP API; `worker.ts` consumes
  the BullMQ `ai-processing` queue and runs AI processing. Video uploads only get
  analyzed if the worker is running (`npm run worker`).
- `npm run build` cleans `dist/` then runs `tsc`; `npm start` runs
  `node dist/src/server.js` (note the `dist/src/` path).
- **No tests exist** despite `"test": "vitest"` there are no `*.test.ts` files.
  There is no lint or typecheck script; `npm run build` is the only check, and
  it's what CI runs.
- **Env validation is eager.** `core/configs/env.config.ts` throws at import
  time if any required var is missing, so the app needs `backend/.env`
  (gitignored). Keys: `PORT` (`8080`), `DB_URI`, `R2_*`, `S3_API`, `REDIS_HOST`,
  `REDIS_PORT`, `FASTAPI_URL`, `GROQ_API_KEY`, `CLERK_*`.
- Private env files are gitignored in every project; never commit them.
- **Auth is per-router, not global.** `videos` routes require a Clerk session;
  `users` routes require session + `admin` for management; `diagnosis` routes
  currently have **no auth middleware**.
- Video upload uses a **presigned R2 PUT**: the client sends an
  `Idempotency-Key` header to `POST /videos/upload`, uploads directly to R2, then
  calls `PATCH /videos/:videoId/uploaded` to enqueue processing. There is no
  file upload through the API itself.

## Mobile (`mobile/`)

- Expo app; entry is `src/App.tsx` via `main: "src/index.ts"`. Feature code lives
  in `src/features/*`.
- **`mobile/AGENTS.md` says to read the Expo **v54** docs, but `package.json`
  pins Expo `~57.0.26`.** Trust the installed version; verify against
  https://docs.expo.dev/versions/v57.0.0/ before writing Expo APIs.
- `ios/` and `android/` are **gitignored/generated** (Expo prebuild). Don't edit
  them or expect them in the repo.
- `./update-network.sh` writes `EXPO_PUBLIC_API_URL=http://<lan-ip>:8080` into
  `.env` for device testing — it expects the backend on **port 8080**, matching
  backend `.env` (`PORT=8080`), not the code default of `3000`.
- No lint/test scripts.

## AI service (`ai-processing/`)

- **Must be run from inside `ai-processing/app`** (e.g. `uvicorn main:app`).
  Imports are top-level modules (`from api.v1.detection import ...`,
  `from services.detection import ...`, `from models.ai import ...`), not an
  `app.` package.
- Model weights are loaded from **paths relative to CWD**:
  `app/models/crop_identification/v2.pt` and
  `app/models/pest_disease_identification/v2.pt`. Running from the repo root
  fails.
- Needs `ai-processing/.env` with the `R2_*` + `S3_API` keys (boto3 uploads
  evidence crops back to R2).
- Endpoint the backend calls: `POST /api/v1/detection/process`.

## Model training (`model_training/`)

- Offline only — dataset prep scripts in `scripts/` and YOLO training via
  Ultralytics. `main.py` is an interactive local inference test, not a service.
  Not wired into CI or runtime.

## CI (`.github/workflows/CI.yml`)

- Triggers on push/PR to **`master`**.
- Backend job: `npm ci` + `npm run build` (Node 22). Mobile job: `npm ci` only.
  No lint/tests, and `ai-processing`/`model_training` are not built in CI. Match
  the backend build locally before pushing.
