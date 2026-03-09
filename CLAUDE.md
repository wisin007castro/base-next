# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Start dev server on port 3000
npm run build         # Production build
npm run lint          # ESLint

# Database
npm run db:generate   # Generate migrations from schema changes in lib/db/schema/index.ts
npm run db:migrate    # Apply pending migrations to dev.db
npm run db:studio     # Open Drizzle Studio GUI (browser-based DB explorer)
npm run db:seed       # Seed initial data (roles, admin user, permissions)

# Infrastructure (Docker: MailDev + MinIO)
npm run docker:up     # Start MailDev (port 1080/1025) and MinIO (port 9000/9001)
npm run docker:down   # Stop containers
npm run storage:setup # Initialize MinIO bucket after docker:up

# No test suite is configured in this project.
```

## Architecture

### Stack
- **Next.js 15** App Router, TypeScript, Tailwind CSS
- **Auth:** NextAuth v5 (beta) — Credentials provider, JWT strategy
- **ORM:** Drizzle ORM + `better-sqlite3` (file: `dev.db`)
- **Data fetching:** TanStack React Query v5
- **Validation:** Zod (server-side in API routes, `lib/api/schemas/`)
- **Storage:** MinIO (S3-compatible) via AWS SDK
- **Email:** Nodemailer → MailDev (dev) / SMTP (prod)

### Auth & Session

`auth.ts` bootstraps NextAuth with a Credentials provider. On login:
1. Rate-limited to 5 attempts / 15 min per email (`lib/api/rate-limiter.ts`)
2. Password verified with bcrypt
3. Roles and permissions fetched from RBAC (`lib/auth/rbac.ts`) and embedded in the JWT
4. `lastLoginAt` updated on success

The JWT/session callbacks in `auth.config.ts` propagate `{ id, roles, permissions }` into every session. Middleware (`middleware.ts`) uses `auth()` to protect routes and redirect based on role.

Protected admin routes: `/usuarios`, `/roles`, `/permisos`. All other routes just require a valid session.

### API Route Pattern

Every API route follows this pattern:

```ts
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()   // or requireAuth() for non-admin
  if (isGuardError(guard)) return guard  // returns 401/403 automatically

  // ... handler logic
}
```

Input is validated with Zod before any DB operation:
```ts
const parsed = createUserSchema.safeParse(await req.json())
if (!parsed.success)
  return NextResponse.json({ message: 'Datos inválidos', errors: parsed.error.flatten() }, { status: 422 })
```

### Database Schema

Single file: `lib/db/schema/index.ts`. All tables and Drizzle relations are defined there.

Key tables:
- `users` — accounts, soft-deleted via `deletedAt`
- `userProfiles` — personal info + avatar keys (MinIO)
- `roles`, `permissions` — Spatie-style RBAC
- `userRoles`, `userPermissions`, `rolePermissions` — junction tables

**Always run `db:generate` then `db:migrate` after editing the schema file.**

Drizzle singleton lives in `lib/db/index.ts` using `globalThis` to survive hot-reload.

### RBAC

`lib/auth/rbac.ts` exposes:
- `getUserRoles(userId)` / `getUserPermissions(userId)` — used in NextAuth callbacks
- `syncRoles(userId, roleIds[])` — replaces all roles atomically (used in user update)
- `assignRole` / `removeRole` / `givePermissionTo` / `revokePermission` — individual mutations

Permissions are additive: a user's effective permissions = direct permissions ∪ permissions from all assigned roles.

### Frontend Data Layer

```
lib/api/*.api.ts      → fetch wrappers (usersApi, rolesApi, permissionsApi)
lib/hooks/*.hooks.ts  → React Query hooks built on top of the API clients
lib/constants/query-keys.ts → centralised cache key factory
```

Components call hooks, never `fetch` directly. Mutations invalidate the relevant query keys on success.

### Forms & Validation

Client-side validation runs **before** the API call in `handleSubmit`. The pattern used throughout:

```ts
const [errors, setErrors] = useState<Record<string, string>>({})

function clr(key: string) {   // call in onChange to clear individual field error
  setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
}

function validate(): Record<string, string> {
  const e: Record<string, string> = {}
  if (!username.trim()) e.username = 'El username es obligatorio'
  // ...
  return e
}
```

Input classes toggle between `inputClass` (normal) and `inputError` (red border) via a `ci(err?)` helper defined at the top of each form file.

### File Storage (Avatars)

Upload flow: client → `POST /api/upload/avatar` (get presigned URL) → PUT directly to MinIO → `PATCH /api/users/:id` (save the resulting public URL). `lib/storage/image.service.ts` handles resizing and generating thumbnails via Sharp.

### Email

`lib/mail/mail.service.ts` exports typed send functions (`sendVerificationLinkEmail`, `sendWelcomeEmail`, `sendPasswordResetEmail`). In dev, all mail is caught by MailDev (UI at `http://localhost:1080`).

### Environment Variables

Required in `.env.local`:
```
AUTH_SECRET=
DATABASE_URL=./dev.db
MAIL_HOST=  MAIL_PORT=  MAIL_USER=  MAIL_PASS=  MAIL_FROM=
STORAGE_ENDPOINT=  STORAGE_ACCESS_KEY=  STORAGE_SECRET_KEY=
STORAGE_BUCKET=  STORAGE_PUBLIC_URL=
```
