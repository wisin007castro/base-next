# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Start dev server on port 3005
npm run build         # Production build
npm run lint          # ESLint 9 (flat config + reglas de TanStack Query)
npm run typecheck     # tsc --noEmit
npm run format        # Prettier (el pre-commit ya formatea los archivos staged)

# Database
npm run db:generate   # Generate migrations from schema changes in lib/db/schema/index.ts
npm run db:migrate    # Apply pending migrations to dev.db
npm run db:studio     # Open Drizzle Studio GUI (browser-based DB explorer)
npm run db:seed       # Seed initial data (roles, admin user, permissions)
npm run db:permissions # Create missing CRUD-module permissions and assign them to admin (idempotent)
npm run db:seed:blog   # Demo categories/posts/comments/votes (skips if categories exist)

# Code generator
npm run gen:crud -- <entity> <field:type>...   # full CRUD module — see "CRUD Generator" below

# Infrastructure (Docker: MailDev + MinIO)
npm run docker:up     # Start MailDev (port 1080/1025) and MinIO (port 9000/9001)
npm run docker:down   # Stop containers
npm run storage:setup # Initialize MinIO bucket after docker:up

# E2E (Playwright, Chromium) — levanta/reutiliza `npm run dev` en :3005
npm run e2e           # todas las pruebas (e2e/*.spec.ts)
npm run e2e:ui        # modo interactivo
npm run format:check  # lo que corre CI (el repo está formateado entero)
```

### E2E tests

- `e2e/global-setup.ts` creates throwaway users in `dev.db` (`e2e-admin-<run>@test.local` with role admin, `e2e-user-<run>@test.local` with role usuario; emails change per run because the login rate limit is per email). `global-teardown.ts` deletes them (cascade) plus every row whose name starts with `e2e ` (`PREFIX` in `e2e/support/db.ts`). Real users are never touched.
- `auth.setup.ts` logs in as the admin and saves `e2e/.auth/admin.json`; specs run with that session (`login.spec.ts`, `login-2fa.spec.ts`, `sesion.spec.ts` opt out). Data that isn't under test is created through the API with `request` (see `blog.spec.ts`); changes "made by another admin" go straight to the DB (`sesion.spec.ts`). TOTP codes: `generate({ secret })` from otplib.
- CI (`.github/workflows/ci.yml`, on PRs and pushes to main): lint + `format:check` + `next build` (includes typecheck), and the e2e suite against a fresh `dev.db` (`db:migrate` + `db:seed`). Failures upload `playwright-report/` and `test-results/` as an artifact.
- Serial (`workers: 1`): specs share `dev.db` and the admin session.
- Selectors by role/label: `SearchFilter` is `searchbox`; `FieldSelect` uses option indices as values → `selectOption({ label })`; required labels end in ` *` → `getByLabel(/^Nombre/)`; icon buttons by `title`. Next's route announcer is also `role="alert"`.
- URL-state gotchas: wait for the URL after typing in a search (debounce; changing filters clears row selection); URL-controlled checkboxes update async → `click()` + `toBeChecked()`, not `check()`. Wait for a mutation's response before `reload()`.
- Failures leave screenshot + trace in `test-results/`; HTML report in `playwright-report/`.

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

The JWT/session callbacks in `auth.config.ts` propagate `{ id, roles, permissions, twoFactorPending }` into every session. Middleware (`middleware.ts`) uses `auth()` to protect routes and redirect based on role.

On every server-side `auth()` (API routes, server components) the `jwt` callback in `auth.ts` checks the session row (`user_sessions`, revocable from the profile), **kicks out deactivated/deleted users** and **reloads roles + permissions from the DB**: role changes apply without re-login. The middleware only reads the cookie, so it catches up when the cookie is rewritten (next `useSession` refresh). A 401 from the API makes the client `signOut()` (global handler in `TanStackProvider`).

**2FA** (`lib/auth/two-factor.ts → verifyTotp`, the only TOTP check; shared rate limit of 10 / 15 min per user):

- With 2FA enabled, `authorize` returns `twoFactorPending`: the middleware sends everything to `/verify-2fa` and `requireAuth()` answers 403. Only `requireAuthPending()` routes (`/api/auth/verify-2fa`) work.
- `/verify-2fa` calls `update({ twoFactorCode })`; the `jwt` callback verifies the code **on the server** before granting roles + session. Never trust a client flag like `twoFactorVerified` — `update()` accepts any data from the browser.
- otplib v13 `verify()` returns `{ valid }`, not a boolean (`if (!result)` is always false).

Protected admin routes: `/usuarios`, `/roles`, `/permisos`. All other routes just require a valid session.

### API Route Pattern

Every API route follows this pattern:

```ts
import { requireAdmin, isGuardError } from '@/lib/api/api-guard'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin() // or requireAuth() for non-admin
  if (isGuardError(guard)) return guard // returns 401/403 automatically

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

### Lists & Tables

```
app/components/data-table/  → DataTable (TanStack Table), selectionColumn, BulkActionsBar,
                              DataTablePagination, Search/Select/Toggle/DateFilter, FilterBar, ConfirmDialog
lib/hooks/use-url-state.ts  → typed filter/page/sort state in the query string
lib/filters/*.filters.ts    → URL schema per list (+ toXxxFilters() for the API)
```

Three layers, each with one job: **TanStack Query** fetches, **TanStack Table** (headless) handles sorting/filtering/selection, **the URL** holds the state.

- Filters, page and sort live in the **URL** via `useUrlState(schema)`: they survive reloads and can be shared. Every schema field needs `.catch(default)`; changing any filter resets `page` to 1.
- Pages using `useUrlState` must render their content inside `<Suspense>` (Next 15 `useSearchParams` rule).
- Columns use `createColumnHelper<T>()`. `col.accessor(...)` columns are sortable (disable with `enableSorting: false`); `col.display(...)` ones are not. Column `id` = sort key sent as `sort=field` / `sort=-field`. Cell styling via `meta: { align, className }`.
- `mode="server"` (paginated lists): the API sorts — it needs a whitelist (see `SORTABLE` in `app/api/users/route.ts`). `mode="client"` (small lists like roles/permissions): TanStack sorts and filters with `globalFilter` (accessor columns; opt out with `enableGlobalFilter: false`).
- Row selection: add `selectionColumn<T>()`, keep `rowSelection` in the table owner, clear it when filters change, and expose actions with `<BulkActionsBar>`. Bulk endpoints validate with Zod and must not let an admin deactivate/delete themselves (see `app/api/users/bulk/route.ts`).
- Destructive actions always go through `<ConfirmDialog>`.

### Forms & Validation

Forms use **react-hook-form + Zod** (`zodResolver`). Never manage fields with `useState`.

```
lib/validation/zod-config.ts  → Spanish Zod messages (import `z` from here, not from 'zod')
lib/api/schemas/*.schema.ts   → server schemas (source of truth for field rules)
lib/forms/*.form.ts           → form schema + defaults(entity) + toDto(values)
app/components/form/          → Form, FieldText, FieldSelect, FieldCheckboxGroup, FormSection, FormStatus, FormActions
```

- Form schemas **reuse rules** from the server schema (`createUserSchema.shape.username`) so client and API never drift.
- Form values are plain strings (`''` for empty); `toDto()` converts `''` → `null`/`undefined`.
- `<Form form onSubmit>` catches errors thrown by `onSubmit`: `ApiError.fieldErrors` matching a field go to that field, the rest to `errors.root.server` (shown by `<FormStatus />`). So pages call `await mutation.mutateAsync(dto)` — no manual error banners.
- API error shape must be `{ message, errors: { fieldErrors, formErrors } }` (Zod `flatten()`).

```tsx
const form = useForm<RoleFormValues>({ resolver: zodResolver(roleFormSchema), defaultValues: roleFormDefaults(role) })
<Form form={form} onSubmit={v => onSubmit(toRoleDto(v))}>
  <FormStatus />
  <FieldText control={form.control} name="name" label="Nombre" required />
  <FormActions submitLabel="Guardar" />
</Form>
```

Field ids are unique per instance (`useFieldId(name)` in `FormField.tsx`): two forms on one page can both have a `password` field without the labels pointing at the wrong input.

Reusable field groups that read `control` from context: `UserAccountFields`, `PersonalDataFields` (`app/components/users/UserFields.tsx`).

### File Storage (Avatars)

Upload flow: client → `POST /api/upload/avatar` (get presigned URL) → PUT directly to MinIO → `PATCH /api/users/:id` (save the resulting public URL). `lib/storage/image.service.ts` handles resizing and generating thumbnails via Sharp.

### Email

`lib/mail/mail.service.ts` exports typed send functions (`sendVerificationLinkEmail`, `sendWelcomeEmail`, `sendPasswordResetEmail`). In dev, all mail is caught by MailDev (UI at `http://localhost:1080`).

### CRUD Generator

```bash
npm run gen:crud -- etiqueta "nombre!:string=Nombre" --fem
npm run gen:crud -- categoria "nombre!:string=Nombre" "descripcion?:text=Descripción" --fem --soft-delete
npm run gen:crud -- publicacion "titulo:string=Título" contenido:text "categoria_id:ref(categorias)=Categoría"   "etiqueta_ids?:many(etiquetas)=Etiquetas" publicada:boolean --owner --fem --soft-delete
```

- Field syntax `name[?][!]:type[=Label]` — `?` optional, `!` unique, `=Label` UI label (use it for accents).
- Types: `string, text, int, number, boolean, date, enum(a|b)`, plus relations:
  - `x_id:ref(<module>[,restrict|cascade|set null])` — N:1. Default policy: `restrict` (required) / `set null` (optional). FK + existence check (422), select fed by `/options`, related label in the table (sortable), filter. API returns `<rel>: { id, label }`.
  - `x_ids:many(<module>)` — N:M through a generated pivot table (`<plural>_<target>`, composite PK, cascade). API accepts/returns `x_ids: number[]` + `<target>: { id, label }[]`; synced in the same transaction as the row; loaded with one query per page (no N+1); checkbox group in the form; filter `?x_ids=3`.
  - Targets must be **generated** modules (registry `scripts/gen-crud/modules.json`): generate them first. Self-references (trees) are not supported yet.
- `--owner`: `autor_id` (FK users, cascade), set server-side from the session, never from the body.
- `--soft-delete` (opt-in): `deleted_at`, partial unique indexes (`WHERE deleted_at IS NULL`), `POST /:id/restore`, `DELETE /:id/force` (permission `<plural>.force_delete`, only already-deleted rows), bulk `delete|restore|force_delete`, `?with_trashed=true`, "Incluir eliminados" toggle, Restore / Delete permanently buttons. Lists, `/options`, joins and ref validation exclude deleted rows; children of a deleted required parent are hidden. Votes / pivots stay hard-delete.
- Delete policies under soft delete live in `lib/api/dependents.ts` (FKs only fire on hard deletes): `restrict` → 409 if active children; `cascade` → soft-deletes children with the same timestamp and restoring the parent restores exactly those; restoring a child whose required parent is deleted → 422.
- Other options: `--plural=`, `--label=`, `--label-singular=`, `--fem`, `--dry-run`, `--force` (regenerate: overwrites the module files and **replaces** its blocks).
- Generates: Drizzle table (+ pivots), enum constants, types, Zod schema, serializer (base SELECT with joins, visibility conditions, N:M loader/sync, ref validation), API (`list`, `[id]`, `restore`, `force`, `bulk`, `options`), API client, hooks, form schema, URL filters, Form, Table (selection + bulk actions), list/new/edit pages.
- Writes into existing files as `// @gen:begin <module>` … `// @gen:end <module>` blocks before the markers — never remove them: `// @gen:tables` (schema), `// @gen:query-keys`, `// @gen:modules` (`lib/auth/module-permissions.ts`), `// @gen:menu`, `// @gen:dependents` (`lib/api/dependents.ts`), `// @gen:dependencies` (`lib/constants/query-dependencies.ts`). Re-running replaces the block. Only new files are formatted.
- After generating: `db:generate` (review the SQL) → `db:migrate` → `db:permissions` (no re-login needed: permissions are reloaded on every server `auth()`).
- Security: API uses `requirePermission('<plural>.view|create|edit|delete|force_delete')` (admin always passes); `/options` uses `requireAnyPermission(optionsPermissions(prefix))` so whoever creates/edits a referencing module can load the select; middleware maps `/<plural>` → view, `/nuevo` → create, `/editar` → edit; menu needs `.view`; UI uses `useCan()`.
- Cache: mutations call `invalidateDependents(qc, '<plural>')` (`lib/hooks/invalidate-dependents.ts` + `QUERY_DEPENDENCIES`) so renaming a category refreshes the posts list and the blog.
- Generated code is a starting point: edit it freely. Templates live in `scripts/gen-crud/templates/`.

### Database notes

- `lib/db/index.ts` enables `PRAGMA foreign_keys = ON`: `onDelete` rules in the schema are enforced (SQLite ignores them otherwise). `ON DELETE RESTRICT` surfaces as `SQLITE_CONSTRAINT_TRIGGER` (`foreignKeyViolationResponse` handles both).
- Soft-deleted tables use partial unique indexes; `users.username/email` too, so a deleted user doesn't block its username. Restoring into a taken value → 422 (`uniqueViolationResponse`).
- Users: `DELETE /api/users/:id` soft-deletes, `DELETE /api/users/:id/force` hard-deletes (only already-deleted; cascades their content). Admins can't delete/deactivate themselves.

### Blog (reference for non-CRUD features)

Example of what the generator does **not** cover, built by hand on top of the generated `categorias` / `publicaciones`:

- `comentarios` and `votos` tables (vote = composite PK user+post, upsert with `onConflictDoUpdate`).
- Visibility reuses the generated `publicacionActive` + `publicacionVisibleParents` (soft delete of post / category / author hides it). Content from deleted users (comments, votes) is excluded from lists and counters.
- Reader API under `/api/blog` (`requireAuth`, only published posts): list with correlated subqueries for comment count / score / my vote (`lib/api/blog/queries.ts`), comments (author or moderator can delete), `PUT /voto`.
- `lib/hooks/blog.hooks.ts`: optimistic vote that patches the detail **and** every cached list page, rollback on error; comment mutations update the counters in place.
- `/blog` (cards + URL filters) and `/blog/[id]` (votes + comments). `npm run db:seed:blog` loads demo data (idempotent).

### Environment Variables

Template: `.env.example` (copy to `.env`; personal overrides in `.env.local`).

`lib/env.ts` validates them with Zod when the server boots (`instrumentation.ts`): a missing/invalid variable stops startup with a message naming it. **Read config through `env.X`, never `process.env.X`** (except `NODE_ENV`/`NEXT_RUNTIME`). Only `AUTH_SECRET` (≥ 32 chars) is mandatory; the rest default to the docker-compose dev setup. Storage is optional: `storageEnv()` throws a clear error only when uploading. Add new variables to the schema in `lib/env.ts` and to `.env.example`.

### Settings (`/configuracion`, admin)

`settings` table, one row per section (`system`, `access`, `mail`) holding JSON validated by the Zod schemas in `lib/settings/schemas.ts` (shared by API and forms). Read with `getSettings('access')` (`lib/settings/index.ts`; in-memory cache with 10 s TTL, defaults fill missing keys), write with `saveSettings`. API: `GET|PUT /api/settings/:section` (admin), `POST /api/settings/mail/test`, `GET /api/settings/public` (name, logo, `loginCodeEnabled`; no auth).

- **system**: name + logo URL → sidebar/header (`<Brand />`) and email layout.
- **access**: `twoFactorPolicy` (`off`/`admins`/`everyone`), invitation days, login-by-code toggle + minutes. With a policy that applies to the user and no 2FA, the JWT carries `twoFactorSetupRequired`: middleware sends pages to `/configurar-2fa`, `requireAuth()` answers 403 except routes declared with `requireAuth({ allowTwoFactorSetup: true })` (`GET /api/me`, `/api/me/2fa/setup|enable`); disabling 2FA is refused (409).
- **mail**: `source: 'env'` (MAIL_* variables) or `'database'`. The SMTP password is stored AES-256-GCM-encrypted with a key derived from `AUTH_SECRET` (`lib/settings/secrets.ts`) and never returned (`hasPassword`). `getMailer()` (`lib/mail/mail.client.ts`) rebuilds the transport when the config changes.

### Invitations & emails

- `/usuarios/invitaciones` (admin): invite by email with roles; `/invitacion?token=` (public) creates the account (verified, with the roles) and signs in. Token = 256 bits, only its SHA-256 is stored; lifetime from settings; re-inviting replaces the pending one.
- Emails are React components in `lib/mail/templates` (react-email, inline styles); `lib/mail/mail.service.tsx` renders HTML + plain text with the system branding. e2e read them from MailDev's REST API (`e2e/support/maildev.ts`).

### Logging

`lib/logger.ts` (pino): pretty output in dev, JSON lines in production, level via `LOG_LEVEL`. Use `logger.child({ module: 'x' })` and `log.info({ userId }, 'mensaje fijo')` — data in the object, constant message. Never log passwords, tokens, secrets or 2FA codes (`redact` is only a safety net). Auth events (login ok/failed/locked, 2FA, expelled sessions) and mail failures are logged; unhandled request errors go through `onRequestError` in `instrumentation.ts`. Node-only imports in `instrumentation.ts` must sit inside `if (process.env.NEXT_RUNTIME === 'nodejs') { … }` (the Edge bundle has no `stream`).

Standalone scripts (`tsx scripts/…`, `drizzle/seed.ts`) don't load `.env` and must not import `lib/env` / `lib/db`: they open SQLite with `process.env.DATABASE_URL ?? './dev.db'`.
