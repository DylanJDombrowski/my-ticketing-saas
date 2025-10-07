# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

**Testing:**
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage reports

**Important:** Always run `npm run lint` after making code changes to ensure code quality.

## Architecture Overview

### Tech Stack
- **Framework:** Next.js 15 with App Router
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with custom middleware
- **State Management:** Zustand stores
- **UI:** React + Radix UI components + Tailwind CSS
- **Forms:** React Hook Form with Zod validation

### Multi-Tenant Architecture
This is a multi-tenant SaaS application where each user belongs to a tenant organization:

- **Tenants** (`tenants` table): Organizations/companies using the platform
- **Profiles** (`profiles` table): User accounts linked to tenants
- **Row Level Security (RLS):** All data is tenant-scoped via PostgreSQL RLS policies

### Core Data Models
- **Clients:** Customer contacts managed by each tenant
- **Tasks:** Work items with status tracking (open, in_progress, resolved, closed) - formerly called "Tickets"
- **Time Entries:** Billable/non-billable time logged against tasks
- **Invoices:** Generated from time entries with line items
- **Payment Methods:** Configurable payment options per tenant

**Note:** The database still uses "tickets" table names. The application code uses "Tasks" terminology. See `DATABASE_MIGRATION_TICKETS_TO_TASKS.md` for migration details.

### Authentication Flow
1. User signs up/in via Supabase Auth
2. Middleware (`middleware.ts`) handles route protection
3. Auth state managed in `src/stores/auth.ts` with Zustand
4. Profile data automatically fetched with tenant relationship
5. All dashboard routes require authentication

### Database Layer
- **Client:** `src/lib/supabase.ts` - Browser client with auth persistence
- **Server:** `src/lib/supabase-server.ts` - Server-side client for API routes
- **Types:** `src/lib/types.ts` - TypeScript interfaces matching database schema
- **Schema:** `current_schema.sql` - Complete database structure

### Component Structure
- **UI Components:** `src/components/ui/` - Reusable Radix UI components with Tailwind
- **Modals:** `src/components/modals/` - Feature-specific modal components
- **Home:** `src/components/home/` - Landing page sections
- **Auth Guard:** `src/components/auth-guard.tsx` - Route protection wrapper

### State Management (Zustand Stores)
- `src/stores/auth.ts` - User authentication and profile state
- `src/stores/clients.ts` - Client management
- `src/stores/tasks.ts` - Task operations (formerly tickets.ts)
- `src/stores/time-entries.ts` - Time tracking
- `src/stores/invoices.ts` - Invoice generation

### Key Patterns

**Authentication:**
- All authenticated routes use `<AuthGuard>` wrapper
- User/profile state accessed via `useAuthStore()`
- Tenant context automatically available via profile.tenant

**Data Fetching:**
- Use appropriate Supabase client (browser vs server)
- All queries automatically tenant-scoped via RLS
- Stores handle CRUD operations with optimistic updates

**Forms:**
- React Hook Form with Zod validation
- Form types defined in `src/lib/types.ts`
- Consistent error handling with toast notifications

**Routing:**
- App Router with nested layouts
- Dashboard layout (`src/app/dashboard/layout.tsx`) provides navigation
- Middleware handles auth redirects

### Environment Setup
Requires Supabase environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Important Notes
- Always maintain tenant isolation in database queries
- Use proper Supabase client (browser vs server) for context
- Follow existing patterns for new features (stores, modals, forms)
- PDF generation available for invoices via API route
- Notification system uses Sonner for toast messages

## Session Rules & Progress Tracking

**CRITICAL:** Always follow these rules at the start of every coding session:

1. **Read PROGRESS.md first** - Review current sprint status and goals
2. **Update PROGRESS.md** - Document session start time and objectives
3. **Use TodoWrite tool** - Create/update todo list for current work
4. **Follow sprint focus** - Stay aligned with current sprint themes
5. **Update PROGRESS.md at end** - Document what was completed and next steps

### Code Quality Standards
- Run `npm run lint` after making changes
- Write tests for new components and business logic
- Update documentation when adding new features
- Follow existing architectural patterns

### Sprint Management
- Keep sprints focused (5-7 tasks maximum)
- Prefer incremental progress over large rewrites
- Complete current sprint before starting new work
- Document blockers and dependencies immediately

**Progress Document Location:** `/PROGRESS.md` - This file tracks all sprint progress, completed work, and next session planning.