# SIPAT Backend

Backend API for SIPAT — a crop disease and pest identification system. Farmers
submit a short video of their crops; the system detects visible conditions and
returns an interpretation with recommendations.

---

## 1. Overview

The backend is a layered **Express 5 + TypeScript (ESM)** application with two
independent runtime processes that share the same codebase and database:

| Process      | Entry point          | Responsibility                                      |
| ------------ | -------------------- | --------------------------------------------------- |
| **API**      | `src/server.ts`      | HTTP endpoints, auth, video upload orchestration    |
| **Worker**   | `src/worker.ts`      | Consumes the AI queue and runs the detection pipeline |

| Concern          | Technology                          |
| ---------------- | ----------------------------------- |
| HTTP             | Express 5 (`express`)               |
| Auth             | Clerk (`@clerk/express`)            |
| Database         | MongoDB via Mongoose                |
| Queue / cache    | Redis via `ioredis` + `bullmq`      |
| Object storage   | Cloudflare R2 (`@aws-sdk/client-s3`)|
| AI detection     | FastAPI service                     |
| Interpretation   | Groq LLM (`groq-sdk`)               |
| Validation       | Zod                                 |

```
Client ──▶ API (server.ts) ──▶ R2 (presigned upload)
                │
                ▼
            Redis queue ──▶ Worker (worker.ts) ──▶ FastAPI ──▶ Groq
                                        │
                                        ▼
                                   MongoDB (diagnoses)
```

---

## 2. Entry & Bootstrap

- **`server.ts`** — loads `.env` (via `dotenv`), dynamically imports `app.ts`
  and the Mongo connector, creates the HTTP server, connects to the database,
  and listens on `0.0.0.0:$PORT` (default `3000`).
- **`worker.ts`** — loads `.env`, imports the Mongo connector and the AI worker,
  then connects to the database. Imports are dynamic so env/config
  initialization happens before modules are evaluated.
- **`app.ts`** — builds the Express app. Middleware mount order:

  ```
  cors → urlencoded → json → cookieParser → clerkMiddleware → requestLogger → /api/v1 router
  ```

  Also exposes a plain `GET /ping` liveness endpoint.

---

## 3. Routing

`src/routes/index.route.ts` mounts everything under `/api/v1`:

```
GET  /api/v1/health          → inline health check (status, timestamp)
     /api/v1/users           → user routes
     /api/v1/videos          → video routes
     /api/v1/diagnosis       → diagnosis routes
```

Each module owns its own `Router` in `<module>.route.ts`. Middleware is applied
at the router level (see §4 for auth details).

| Method   | Path                                  | Auth        | Handler                              |
| -------- | ------------------------------------- | ----------- | ------------------------------------ |
| GET      | `/users/me`                           | session     | `getCurrentUser`                     |
| PATCH    | `/users/me`                           | session     | `updateCurrentUser`                  |
| PUT      | `/users/me/preferred-crops`           | session     | `updatePreferredCrops`               |
| GET      | `/users/stats/overview`               | admin       | `getUserStats`                       |
| GET      | `/users`                              | admin       | `getUsersList`                       |
| GET      | `/users/:userId`                      | admin       | `getUserById`                        |
| PATCH    | `/users/:userId/role`                 | admin       | `updateUserRole`                     |
| PATCH    | `/users/:userId/deactivate`           | admin       | `deactivateUser`                     |
| PATCH    | `/users/:userId/reactivate`           | admin       | `reactivateUser`                     |
| DELETE   | `/users/:userId`                      | admin       | `deleteUser`                         |
| POST     | `/videos/upload`                      | session     | `createVideoUpload`                  |
| PATCH    | `/videos/:videoId/uploaded`           | session     | `updateVideoUploadStatus`            |
| POST     | `/diagnosis`                          | —           | `create`                             |
| GET      | `/diagnosis/list`                     | —           | `getDiagnosisList`                   |
| GET      | `/diagnosis/:diagnosisId`             | —           | `getById`                            |
| PUT      | `/diagnosis/:diagnosisId`             | —           | `updateResults`                      |
| PATCH    | `/diagnosis/:diagnosisId`             | —           | `renameDiagnosis`                    |
| GET      | `/diagnosis/video/:videoId`           | —           | `getByVideoId`                       |
| DELETE   | `/diagnosis/video/:videoId`           | —           | `deleteByVideoId`                    |

---

## 4. Middleware

`src/middleware/`

- **`auth.middleware.ts`** — `AuthMiddleware` class.
  - `requireSession` — reads `getAuth(req)`; rejects with `401` if there is no
    valid session, otherwise assigns `req.auth` and continues.
  - `requireRole(role)` — factory that looks up the user by Clerk ID and rejects
    with `403` when the role does not match. Used for the admin-only user routes.
- **`requestLogger.middleware.ts`** — logs each finished request (timestamp,
  method, URL, status, duration, IP) as JSON to `logs/requests.log`. Writes are
  serialized through a promise queue; the log rotates on size (`MAX_LOG_SIZE`)
  and old files are pruned beyond `MAX_TOTAL_SIZE`.

---

## 5. Modules (vertical slices)

Every module follows the same shape:

```
route → controller → service → repository → model
              └── types / validation / dto
              └── index.ts  (composition root: instantiates + wires dependencies)
```

- **Controller** — parses/validates the request, calls the service, wraps the
  response. Holds no business logic.
- **Service** — business rules and orchestration; calls repositories and
  integrations.
- **Repository** — the only layer that touches Mongoose models.
- **`index.ts`** — constructs the repository → service → controller graph and
  exports the singletons the routes import. This is manual dependency injection.

### `modules/user`

- **Model** `users` — `clerkId` (unique), `name`, `role` (`user` | `admin`),
  `phoneNumber`, nested `farmLocation` (province/municipality/barangay),
  `preferredCrops` (`tomato`/`eggplant`/`pepper`/`potato`), `isActive`,
  `lastLoginAt`. `email` is part of the user type and lookup queries.
- **Service** is a static class: profile updates, role changes, soft
  deactivation/reactivation, hard delete, paginated listing, and stats.
- **Validation** uses Zod schemas (`updateProfileSchema`, `updateRoleSchema`,
  `getUsersQuerySchema`, ...). Controllers call `safeParse` and return `400` on
  failure.
- Guards against self-deactivation and self-deletion.

### `modules/video`

- **Model** `videos` — `userId`, `storageKey` (unique), `idempotencyKey`,
  `originalFileName`, `contentType`, `fileSize`, `status`, `processedAt`.
- **Status lifecycle:** `pending_upload → uploaded → processing → completed`
  (or `failed`).
- **Validation** (`validateVideoUpload`) restricts MIME types to
  `mp4`/`quicktime`/`webm` and enforces a 100 MB max.
- **`createUpload`** validates input, checks the `Idempotency-Key`, then either
  re-issues a presigned URL for an existing record or creates a new one. Video
  objects are keyed as `videos/{userId}/{videoId}/{fileName}.{ext}`.
- **`updateUploadedVideoStatus`** marks the video `uploaded` and enqueues an
  `ai-processing` job.
- **`ai-processing.service.ts`** — the worker-side pipeline: set `processing`,
  build a download URL, call FastAPI, optionally call Groq, create the
  diagnosis, then set `completed`/`failed` (see §7).

### `modules/diagnosis`

- **Model** `diagnoses` — `diagnosisName`, `videoId` (ObjectId ref `Video`,
  unique), `results[]` (`trackId`, `crop`, `condition`, `confidence`,
  `duration`, `observations`, `evidenceKey`), `analysis`
  (`summary`, `recommendations[]`).
- **Service** — create (rejects duplicates per video), paginated list, fetch by
  ID / video ID, update results, rename, delete by video ID (also deletes the
  video).
- **Retrieval with URLs** — `getDiagnosisById` maps each result's `evidenceKey`
  and the video's `storageKey` to signed R2 download URLs before returning.
- The list query uses a Mongo aggregation (`$lookup` into `videos` + `$facet`
  for pagination).

---

## 6. Integrations

`src/integrations/` — thin wrappers around external services, each exporting a
singleton.

- **`storage/r2.client.ts`** — `R2Client` over the S3 SDK.
  - `createUploadUrl(storageKey, contentType)` — presigned `PutObject` (300 s).
  - `createDownloadUrl(storageKey, expiresIn=300)` — presigned `GetObject`.
  - `deleteObject(storageKey)`.
- **`fastApi/fastapi.client.ts`** — `FastAPIClient.aiProcess({ video_url,
  storage_key })` → `POST {FASTAPI_URL}/api/v1/detection/process`. Returns
  `{ success, results[] }` (raw detections) or `null` on error.
- **`groq/groq.client.ts`** — `GroqClient.getGroqChatCompletion(detections)`
  sends the detections to model `openai/gpt-oss-20b` with a detailed Tagalog
  system prompt and JSON response format, returning `{ summary,
  recommendations[] }`. The LLM only interprets detection output; it does not
  detect.

---

## 7. Infrastructure & Jobs

- **`infrastructure/redis/redis.client.ts`** — a shared `ioredis` connection
  (`maxRetriesPerRequest: null`) used by both the queue and the worker.
- **`jobs/queues/ai.queue.ts`** — BullMQ `Queue` named `ai-processing`.
- **`jobs/workers/ai.worker.ts`** — BullMQ `Worker` for `ai-processing`. Each
  job carries `{ videoId }` and calls
  `aiProcessingService.processVideo(videoId)`. Logs `completed` / `failed`
  events.

### `ai-processing.service` pipeline

1. Set video status → `processing` (with `processedAt`).
2. Build a signed R2 download URL for the video.
3. Call `fastAPIClient.aiProcess(...)`.
4. On failure → status `failed`, throw.
5. If detections exist → `groqClient.getGroqChatCompletion(...)` for the
   analysis.
6. Map detections to diagnosis `results` and call
   `diagnosisService.createDiagnosis(...)`.
7. Set video status → `completed`.

The worker is started separately from the API (`npm run worker`), so the queue is
only consumed when that process is running.

---

## 8. Core / Shared

`src/core/`

- **`configs/env.config.ts`** — validates and exposes environment variables as a
  typed `env` object (R2, Mongoose, Redis, FastAPI, Groq). `requiredEnv()` throws
  at startup if a required variable is missing.
- **`configs/mongoose.config.ts`** — `connectDB()` connects to `DB_URI` and logs
  the connection host.
- **`types/api.type.ts`** — `ApiResponse<T>` envelope (`message`, `success`,
  `result`, optional `error`, `timestamp`, `meta`), plus `PaginationQuery`,
  `AuthUser`, `RequestContext`.
- **`types/express.d.ts`** — augments Express `Request` with Clerk's `auth`
  (with `userId` guaranteed) and an optional custom `user`.
- **`utils/response.util.ts`** — `wrapResponse(message, status, res, data, meta)`
  builds the standard response envelope; `success` is derived from `status < 400`.
- **`constants/roles.constant.ts`** — `SYSTEM_ROLES` (`admin`, `user`) and the
  `ROLE_TYPES` union.

**Note:** some controllers return the `ApiResponse` shape inline instead of using
`wrapResponse`, so both conventions appear in the codebase.

---

## 9. Data Models

| Collection   | Key fields / indexes                                                       |
| ------------ | -------------------------------------------------------------------------- |
| `users`      | `clerkId` (unique); indexes on `clerkId+isActive`, `role+isActive`, `farmLocation.province+municipality`, `preferredCrops` |
| `videos`     | `storageKey` (unique), `status`; indexes on `userId+createdAt`, `userId+status`, `status+createdAt` |
| `diagnoses`  | `videoId` (unique, ref `Video`); embedded `results[]`, `analysis`          |

All schemas use `timestamps: true` and `versionKey: false` (except diagnoses,
which keeps defaults).

---

## 10. End-to-End Flow

```
1. POST /videos/upload              (client, session, Idempotency-Key header)
2.   → validate type/size, create video doc (pending_upload), return presigned URL
3. Client uploads file directly to R2
4. PATCH /videos/:videoId/uploaded  → status "uploaded" + enqueue ai-processing
5. Worker picks up job → aiProcessingService.processVideo(videoId)
6.   → status "processing", signed download URL
7.   → FastAPI /detection/process → detections
8.   → Groq → { summary, recommendations }
9.   → create diagnosis doc → status "completed"
10. GET /diagnosis/video/:videoId or /diagnosis/:diagnosisId
11.   → results + Groq analysis + signed evidence/video URLs
```

---

## 11. Configuration & Scripts

Required environment variables (validated at startup by `env.config.ts`):

| Variable              | Used for            |
| --------------------- | ------------------- |
| `PORT`                | API listen port     |
| `DB_URI`              | MongoDB connection  |
| `R2_ACCOUNT_ID`       | R2 / S3             |
| `R2_ACCESS_KEY_ID`    | R2 / S3             |
| `R2_SECRET_ACCESS_KEY`| R2 / S3             |
| `R2_BUCKET_NAME`      | R2 / S3             |
| `S3_API`              | R2 endpoint URL     |
| `REDIS_HOST`          | Queue / cache       |
| `REDIS_PORT`          | Queue / cache       |
| `FASTAPI_URL`         | AI detection service|
| `GROQ_API_KEY`        | Groq LLM            |
| `CLERK_*`             | Clerk auth          |
| `MAX_LOG_SIZE`        | Log rotation (MB, optional) |
| `MAX_TOTAL_SIZE`      | Log retention (MB, optional)|

npm scripts:

| Script          | Command                              | Purpose                     |
| --------------- | ------------------------------------ | --------------------------- |
| `npm run dev`   | `nodemon … tsx src/server.ts`        | API dev server (watch)      |
| `npm run worker`| `tsx src/worker.ts`                  | AI queue worker             |
| `npm run build` | `tsc` (cleans `dist/` first)         | Compile to `dist/`          |
| `npm start`     | `node dist/src/server.js`            | Run compiled API            |
| `npm test`      | `vitest`                             | Tests                       |
