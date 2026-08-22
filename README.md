# WebChat

A WhatsApp-style messaging app: 1:1 and group chat with real-time delivery over WebSockets, built as a Turborepo monorepo with an Express/Prisma API and a Next.js frontend.

## Features

- Email/password auth with httpOnly access + refresh token cookies, transparent refresh-and-retry on the frontend
- 1:1 conversations (auto-created on first message) and named group chats (3+ members)
- Real-time message push over WebSockets to every open connection/tab of a recipient or group member
- Paginated message history (cursor-based)
- User search to start new chats / add group members
- WhatsApp-style UI: sidebar chat list, chat window, new chat/group modals

## High-level design

In plain terms, there are three moving pieces:

1. **The web app** — what you see in the browser. It shows your chat list, opens a chat, and lets you type and send messages.
2. **The API server** — the brain in the middle. It checks who you are, saves messages to the database, and tells other people's browsers when a new message arrives.
3. **Two storage pieces** — a **database** (Postgres) that permanently remembers users, chats, and messages, and a fast in-memory store (**Redis**) that only holds short-lived things like login sessions.

How sending a message actually works:

- You type a message and hit send. The web app sends it to the API over a normal web request.
- The API saves it to the database so it's never lost, then immediately replies back "saved" to your app.
- At the same time, if the other person has the app open right now, the API pushes the message straight to their screen over an always-open connection (a WebSocket) — that's what makes it feel instant, like WhatsApp, instead of them having to refresh the page.
- If the other person isn't online, nothing extra happens — the message is safely sitting in the database, and they'll see it next time they open the app.

Logging in works the same way most apps do it: when you log in, the server hands your browser two secret cookies — a short-lived one used for every request, and a longer-lived one used only to quietly get a new short-lived one when it expires. That's why you don't get logged out every 15 minutes even though the "real" session token is that short-lived.

```mermaid
flowchart TB
    You(["You, in the browser"])
    Friend(["A friend, in their browser"])
    App["Web app"]
    Server["API server"]
    DB[("Database\nusers, chats, messages")]

    You --> App
    App -- "1. send message" --> Server
    Server -- "2. save it" --> DB
    Server -- "3. instantly push it" --> Friend
```

## Stack

- **API** (`apps/api`): Express 5, Prisma 7 + PostgreSQL, Redis (refresh tokens + rate limiting), `ws` for WebSockets, `zod` for validation, `argon2` for password hashing, JWT access tokens
- **Web** (`apps/web`): Next.js (App Router), React 19, Redux Toolkit Query (with a mutex-guarded reauth wrapper), Tailwind CSS v4
- **Shared** (`packages/shared`): `zod` schemas/types shared between API and web
- Monorepo managed with Turborepo + pnpm workspaces

## Architecture

The section above is the plain-English version; this section is the same thing with real component and endpoint names, for when you're actually working in the code.

```mermaid
flowchart LR
    subgraph Browser
        UI["Next.js app (RTK Query)"]
        WS["WebSocket client"]
    end

    UI -- "REST, credentials: include" --> API
    WS -- "GET /ws (upgrade)" --> API

    subgraph Server["apps/api (Express)"]
        API["HTTP routes\n/auth /users /conversations /groups"]
        Registry["In-memory ws registry\nMap<userId, Set<WebSocket>>"]
        API --> Registry
        Registry --> WS
    end

    API --> PG[(PostgreSQL\nvia Prisma)]
    API --> Redis[(Redis\nrefresh tokens, rate limiting)]
```

A message send is a plain REST call; the API writes it to Postgres, then looks up the recipient's (or group members') open sockets in the in-memory registry and pushes the new message straight down each one — no polling, no message queue.

### Data model

```mermaid
erDiagram
    User ||--o{ Conversation : "userA/userB"
    User ||--o{ Message : sends
    User ||--o{ GroupConversation : creates
    User ||--o{ GroupMembership : "belongs to"
    User ||--o{ GroupMessage : sends

    Conversation ||--o{ Message : contains
    GroupConversation ||--o{ GroupMembership : has
    GroupConversation ||--o{ GroupMessage : contains

    User {
        string id
        string email
        string displayName
        string passwordHash
    }
    Conversation {
        string id
        string userAId
        string userBId
        datetime lastMessageAt
    }
    Message {
        string id
        string conversationId
        string senderId
        string content
        datetime createdAt
    }
    GroupConversation {
        string id
        string name
        string createdBy
        datetime lastMessageAt
    }
    GroupMembership {
        string userId
        string groupConversationId
        datetime joinedAt
    }
    GroupMessage {
        string id
        string groupConversationId
        string senderId
        string content
        datetime createdAt
    }
```

### Auth flow (access + refresh tokens)

```mermaid
sequenceDiagram
    participant Web as Web (RTK Query)
    participant API as API
    participant Redis as Redis

    Web->>API: POST /auth/login {email, password}
    API->>API: verify argon2 hash
    API->>Redis: store refresh token id
    API-->>Web: 200 + Set-Cookie accessToken, refreshToken

    Note over Web,API: later, access token expired
    Web->>API: GET /auth/me (accessToken cookie)
    API-->>Web: 401
    Web->>API: POST /auth/refresh (refreshToken cookie)
    API->>Redis: getdel + reissue refresh token id
    API-->>Web: 200 + new Set-Cookie accessToken, refreshToken
    Web->>API: retry GET /auth/me (new accessToken)
    API-->>Web: 200 {id, email, displayName}
```

Concurrent 401s from multiple in-flight requests are coalesced by an `async-mutex` in `baseQueryWithReauth` — only one `/auth/refresh` call ever fires at a time.

### Real-time message delivery

```mermaid
sequenceDiagram
    participant Sender as Sender (tab)
    participant API as API
    participant DB as Postgres
    participant Registry as ws registry
    participant Recipient as Recipient (tab, open socket)

    Sender->>API: POST /messages {recipientId, content}
    API->>DB: $transaction: create Message, update Conversation.lastMessageAt
    DB-->>API: message row
    API-->>Sender: 201 {id, conversationId, ...}
    API->>Registry: lookup recipientId
    alt recipient has open connection(s)
        Registry-->>Recipient: {"type":"message","data":{...}}
        Recipient->>Recipient: invalidate RTK Query cache, refetch
    else no open connection
        Registry-->>API: no-op (not an error)
    end
```

Group sends follow the same shape, except the fanout loops over every *current* `GroupMembership` row except the sender (queried live, never cached) and emits `{"type":"group_message", ...}`.

## Project structure

```
apps/
  api/     Express API, Prisma schema/migrations, WebSocket server
  web/     Next.js frontend
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
