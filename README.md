# WebChat

A WhatsApp-style messaging app: 1:1 and group chat with real-time delivery over WebSockets, built as a Turborepo monorepo with an Express/Prisma API and a Next.js frontend.

## Features

- Email/password auth with httpOnly access + refresh token cookies, transparent refresh-and-retry on the frontend
- 1:1 conversations (auto-created on first message) and named group chats (3+ members)
- Real-time message push over WebSockets to every open connection/tab of a recipient or group member
- Paginated message history (cursor-based)
- User search to start new chats / add group members
- WhatsApp-style UI: sidebar chat list, chat window, new chat/group modals

## Stack

- **API** (`apps/api`): Express 5, Prisma 7 + PostgreSQL, Redis (refresh tokens + rate limiting), `ws` for WebSockets, `zod` for validation, `argon2` for password hashing, JWT access tokens
- **Web** (`apps/web`): Next.js (App Router), React 19, Redux Toolkit Query (with a mutex-guarded reauth wrapper), Tailwind CSS v4
- **Shared** (`packages/shared`): `zod` schemas/types shared between API and web
- Monorepo managed with Turborepo + pnpm workspaces

## Project structure

```
apps/
  api/     Express API, Prisma schema/migrations, WebSocket server
  web/     Next.js frontend
  docs/    Planning / tech-spec / data-flow docs per feature
packages/
  shared/           zod schemas shared by api and web
  ui/               shared React components
  eslint-config/    shared eslint configs
  typescript-config/ shared tsconfig bases
docker-compose.yml   Postgres + Redis for local dev
```

## Prerequisites

- Node.js >= 18
- pnpm (`packageManager` pins `pnpm@9.0.0`)
- Docker (for local Postgres + Redis), or your own instances of each

## Setup

1. Install dependencies from the repo root:

   ```sh
   pnpm install
   ```

2. Start Postgres and Redis:

   ```sh
   docker compose up -d
   ```

3. Configure environment variables.

   `apps/api/.env`:

   ```
   DATABASE_URL=postgresql://webchat:webchat_dev_password@localhost:5432/webchat
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=<any long random string>
   FRONTEND_URL=http://localhost:3000
   ```

   `apps/web/.env.local`:

   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

4. Run database migrations:

   ```sh
   cd apps/api
   npx prisma migrate deploy
   ```

## Develop

From the repo root, run everything (api + web) via Turborepo:

```sh
pnpm dev
```

Or run a single app:

```sh
pnpm --filter api dev    # API on http://localhost:4000
pnpm --filter web dev    # Web on http://localhost:3000
```

## Build / typecheck / lint

```sh
pnpm build
pnpm check-types
pnpm lint
```

Each command runs across all apps/packages via Turborepo; scope to one with `--filter=<name>`, e.g. `pnpm build --filter=web`.

## API overview

All endpoints are on the API base URL (`http://localhost:4000` by default).

**Auth** — `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`

**Users** — `GET /users/search?q=` — search other users by email/display name

**1:1 messaging** — `POST /messages`, `GET /conversations`, `GET /conversations/:id/messages`

**Group chat** — `POST /groups`, `POST /groups/:groupId/members`, `POST /groups/:groupId/leave`, `POST /groups/:groupId/messages`, `GET /groups`, `GET /groups/:groupId/messages`, `GET /groups/:groupId/members`

**Real-time** — `GET /ws` (WebSocket upgrade, authenticated via the `accessToken` cookie). Pushes `{ type: "message", data }` and `{ type: "group_message", data }` events.

See `apps/docs/*/02-*-techspec.md` for full request/response contracts and design rationale behind each feature.
