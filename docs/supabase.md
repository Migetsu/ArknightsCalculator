# Supabase Integration: Architecture, Auth & RLS

## 1. Overview

ArknightsCalculator uses **Supabase** for user authentication and cross-device cloud synchronization.
The client integrates via `@nuxtjs/supabase` (v2.1.0) with SSR-safe configuration (`redirect: false`) and strict Row-Level Security (RLS) enforcement.

In accordance with **AGENTS.md §4 (Security)** and **§14 (Merge Policy)**:

- On the client side, only the anonymous public key (`anon key`) is used.
- The `service_role` key is **never** used in client code or committed to git.
- RLS is permanently enabled on all tables: users can only read and modify their own rows.
- Supabase migrations and RLS policies are classified as a **Manual Approval Zone**. PRs with database migrations require explicit review and manual merge by the project owner.

---

## 2. Database Schema & Migrations

### 2.1 File Location

Migrations are located in `supabase/migrations/`:

- `0001_initial_profiles.sql`

### 2.2 Table Structure: `public.profiles`

```sql
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

- **`id`**: Primary key referencing `auth.users(id)` with `ON DELETE CASCADE`. Guarantees 1:1 relationship with Supabase Auth accounts and automatic cleanup on account deletion.
- **`display_name`**: User's public/display callsign (e.g. "Doctor"). Defaulted from email prefix or user metadata.
- **`created_at`** / **`updated_at`**: Timestamps in UTC.

### 2.3 Row Level Security (RLS) Policies

RLS is enabled and enforced:

```sql
alter table public.profiles enable row level security;
```

Policies defined:

1. **`Users can view own profile`** (`SELECT`):
   - Role: `authenticated`
   - Using: `(select auth.uid()) = id`
   - Anonymous access: Rejected. Other users' rows: Rejected.
2. **`Users can update own profile`** (`UPDATE`):
   - Role: `authenticated`
   - Using: `(select auth.uid()) = id`
   - With check: `(select auth.uid()) = id`
3. **`Users can insert own profile`** (`INSERT`):
   - Role: `authenticated`
   - With check: `(select auth.uid()) = id`

### 2.4 Triggers

1. **`on_auth_user_created`**:
   - Fires `AFTER INSERT` on `auth.users`.
   - Function: `public.handle_new_user()` (`security definer`, `set search_path = ''`).
   - Inserts a corresponding row into `public.profiles` automatically when a user signs up.
2. **`on_profile_updated`**:
   - Fires `BEFORE UPDATE` on `public.profiles`.
   - Function: `public.handle_updated_at()` (`security definer`, `set search_path = ''`).
   - Automatically maintains `updated_at = now()`.

---

## 3. Client Architecture

### 3.1 Types & Validation

- **`app/types/database.types.ts`**: TypeScript definitions for the Supabase Postgres schema (`Database['public']['Tables']['profiles']`).
- **`shared/schemas/profile.ts`**: Pure Zod validation schemas (`RawProfileSchema`, `ProfileSchema`) and mapper `mapRawProfile(raw)`.

### 3.2 Composable: `useProfile()`

Located at `app/composables/useProfile.ts`:

- **State**:
  - `user`: Reactive reference to active Supabase user / JWT payload (`useSupabaseUser()`).
  - `profile`: Reactive `Profile | null` containing validated user profile data.
  - `isAuthenticated`: Boolean computed indicating active authentication.
  - `userId`: User UUID (`user.sub` or `user.id`).
  - `userEmail`: Active user's email address.
  - `loading`: Boolean flag for async operations.
  - `error`: User-friendly error message or null.
- **Methods**:
  - `fetchProfile()`: Fetches row from `public.profiles` matching authenticated user id.
  - `updateDisplayName(name)`: Updates `display_name` in `public.profiles`.
  - `signInWithEmail(email, password)`: Authenticates via Supabase Auth.
  - `signUpWithEmail(email, password, displayName?)`: Registers account via Supabase Auth with optional display name.
  - `signOut()`: Terminates session and clears local profile state.

### 3.3 UI Component: `SyncAccountModal.vue`

Located at `app/components/sync/SyncAccountModal.vue`:

- Features the **Email / Cloud Account** tab alongside the existing Yostar, JSON, and Demo tabs.
- Four reactive states:
  1. **Unauthenticated**: Toggle between Sign In and Register forms, tactical PRTS styling, display name input for registration.
  2. **Loading**: Connecting spinner and tactical badge.
  3. **Authenticated**: Account card displaying user email, UUID, display name, and Sign Out action.
  4. **Error**: Inline amber alert with sanitized error text.

---

## 4. Applying Migrations

### Via Supabase MCP / CLI

Migrations can be applied using the Supabase MCP tool `apply_migration`:

```json
{
  "name": "0001_initial_profiles",
  "query": "<contents of supabase/migrations/0001_initial_profiles.sql>"
}
```

### Via Supabase Web Dashboard

1. Open your project at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** -> **New Query**.
3. Paste the contents of `supabase/migrations/0001_initial_profiles.sql`.
4. Click **Run**.
5. Check **Table Editor** -> `profiles` to confirm table and RLS badges.

---

## 5. Environment Variables Checklist

Ensure `.env` contains:

```ini
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_KEY="<public-anon-key>"
NUXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NUXT_PUBLIC_SUPABASE_KEY="<public-anon-key>"
```

_(Note: Never place `service_role` keys into `.env` or client code)._
