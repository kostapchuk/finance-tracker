# Finance Tracker

A mobile-first Progressive Web App for personal money management with drag-and-drop transaction entry.

## Features

- **Mobile-first PWA** - Designed for iOS Safari, works on any modern browser
- **Drag-and-drop transactions** - Quick income/expense entry by dragging items
- **Multi-currency support** - Track accounts in different currencies with conversion
- **Loans & debts tracking** - Monitor money lent/borrowed with payment history
- **Monthly reports** - Spending by category, 6-month trends
- **Budget tracking** - Set and monitor category budgets
- **EN/RU localization** - Full bilingual support
- **Offline-first** - All data stored locally in IndexedDB
- **Cloud sync** - Supabase backend with offline-first sync
- **Installable** - Add to home screen as a native app

## Development

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
npm ci
```

### Commands

| Command                   | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `npm run dev`             | Start dev server at localhost:5173             |
| `npm run build`           | Type-check and build for production            |
| `npm run lint`            | Run ESLint with accessibility checks           |
| `npm run format`          | Format code with Prettier                      |
| `npm run format:check`    | Check code formatting                          |
| `npm run test`            | Run unit tests with Vitest                     |
| `npm run test:watch`      | Run unit tests in watch mode                   |
| `npm run test:coverage`   | Run unit tests with coverage report            |
| `npm run type-coverage`   | Check TypeScript type coverage (90% threshold) |
| `npm run preview`         | Preview production build locally               |
| `npm run test:e2e`        | Run Playwright E2E tests                       |
| `npm run test:e2e:mobile` | Run E2E tests with mobile viewport             |
| `npm run test:e2e:ui`     | Run E2E tests with Playwright UI               |

### Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| Framework    | React 19 + TypeScript 5.9               |
| Build        | Vite 7                                  |
| State        | Zustand 5                               |
| Database     | Dexie.js (IndexedDB) + Supabase (cloud) |
| Query        | TanStack Query                          |
| Styling      | Tailwind CSS 4                          |
| Drag & Drop  | @dnd-kit                                |
| Icons        | lucide-react                            |
| Unit Testing | Vitest + Testing Library                |
| E2E Testing  | Playwright                              |

### Architecture

```
src/
├── app/App.tsx              # Root component, view routing
├── main.tsx                 # Entry point
├── components/
│   ├── ui/                  # Custom UI primitives (Button, Input, Select, etc.)
│   ├── layout/              # AppShell, BottomNav
│   ├── drag-drop/           # DraggableItem, DroppableZone
│   └── onboarding/          # OnboardingOverlay
├── database/
│   ├── db.ts                # Dexie database schema (local cache)
│   ├── types.ts             # TypeScript interfaces
│   ├── repositories.ts      # CRUD operations with sync logic
│   ├── supabaseApi.ts       # Supabase cloud API
│   ├── localCache.ts        # IndexedDB cache (50 transactions + report cache)
│   ├── syncService.ts       # Sync orchestration
│   └── migration.ts         # Local-to-cloud migration
├── features/
│   ├── dashboard/           # Main drag-drop dashboard
│   ├── transactions/        # History page with filters
│   ├── accounts/            # Account management
│   ├── categories/          # Category management
│   ├── income/              # Income sources
│   ├── loans/               # Loans/debts tracking
│   ├── reports/             # Monthly reports
│   └── settings/            # App settings
├── hooks/                   # Custom React hooks
├── store/                   # Zustand state management
└── utils/                   # Helpers (i18n, currency, date)
```

For detailed architecture, data types, and code conventions, see [CLAUDE.md](./CLAUDE.md).

## Cloud Sync

### Overview

The app uses an **offline-first** architecture with Supabase as the cloud backend:

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│   React App     │────▶│  Local Cache    │────▶│  Supabase    │
│  (Zustand UI)   │     │ (IndexedDB)     │     │   (Cloud)    │
└─────────────────┘     └─────────────────┘     └──────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
  TanStack Query          50 transactions         Full dataset
  cache (memory)         max in IDB              in cloud
                                │                       │
                                │                       │
                                ▼                       ▼
                         Report Cache           Report Cache
                         (IndexedDB)            (Supabase)
                         Period summaries       Period summaries
```

### How It Works

#### 1. User Identification

Each user is identified by a UUID stored in localStorage:

- Generated via `crypto.randomUUID()` on first app launch
- Used as `user_id` on all Supabase records
- Displayed in Settings for reference

This allows future authentication - just replace the UUID with the auth user ID.

#### 2. Local Cache (IndexedDB)

The local cache stores data in IndexedDB via Dexie.js:

- **Accounts, categories, income sources, loans, settings, custom currencies** - all stored
- **Transactions** - limited to 50 most recent (for instant loading)
- **Report cache** - period summaries (inflows, outflows, net) for historical periods

Used for instant loading and offline access.

#### 3. Sync Flow

```
User Action (create/update/delete)
         │
         ▼
┌─────────────────────────────────┐
│   Repository (repositories.ts)  │
│   1. Save to local cache first  │
│   2. Add to sync queue         │
│   3. If online → trigger sync  │
└─────────────────────────────────┘
         │
         ▼ (if online)
┌─────────────────────────────────┐
│   Sync Service (syncService.ts) │
│   1. Process queue FIFO         │
│   2. Push to Supabase          │
│   3. Update local cache        │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Supabase (cloud database)     │
│   Row Level Security filters    │
│   by user_id = getUserId()     │
└─────────────────────────────────┘
```

#### 4. Sync Triggers

| Trigger              | Description                               |
| -------------------- | ----------------------------------------- |
| App launch           | Checks for pending items, syncs if online |
| Network comes online | Detects via `window.online` event         |
| User action          | After any create/update/delete            |
| Manual sync          | User clicks "Sync Now" in Settings        |

#### 5. Sync Status

The sync indicator in Settings shows:

- **Offline** - Device has no network connection
- **Syncing** - Currently pushing/pulling data
- **Synced** - All items synced successfully
- **{n} pending** - Items waiting to sync
- **Error** - Last sync failed

#### 6. Conflict Resolution

Last-write-wins strategy:

1. Local changes are queued with timestamps
2. When synced, each item is pushed to Supabase
3. If conflict (same record modified elsewhere), server timestamp wins

#### 7. Pull (Initial Load)

On first launch or after clearing cache:

1. App pulls all user's data from Supabase
2. Populates local IndexedDB cache
3. Subsequent loads use cache, then background refresh

#### 8. Report Cache

To avoid querying all transactions for summary calculations, the app uses a **report_cache** table:

**Period-based caching:**

- Monthly periods: `2026-02` (year-month)
- Custom ranges: `2025-11-14_2026-02-15` (start_end)
- All time: `all`

**Lazy evaluation:**

1. Check local cache → return if valid
2. Check Supabase cache → return if valid
3. Calculate from transactions → cache result
4. Return summary

**Cache expiration:**

- All cached data expires after 3 days
- Expired entries deleted on sync completion

**Invalidation triggers:**

- Transaction created → invalidate periods ≥ transaction date
- Transaction updated → invalidate periods ≥ old AND new date
- Transaction deleted → invalidate periods ≥ transaction date
- Current month never cached (always fresh)

**Benefits:**

- Single row query instead of aggregating thousands of transactions
- Consistent cached data across devices after sync
- Offline support for previous periods
- Smaller payloads (one row vs all transactions)

### Data Isolation

All Supabase queries include `user_id = getUserId()`:

- Each user sees only their own data
- Row Level Security (RLS) policies enforce isolation
- User ID shown in Settings for reference

### Environment Variables

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx  # Use ANON key, not secret!
```

**Important**: Use the **anon** (public) key, not the service-role secret key.

### Supabase Tables

Required tables in Supabase:

```sql
-- Core tables (accounts, categories, income_sources, loans, transactions, settings, custom_currencies)
-- See database/types.ts for schema

-- Report cache table (optional, for performance)
CREATE TABLE report_cache (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  inflows NUMERIC DEFAULT 0,
  outflows NUMERIC DEFAULT 0,
  net NUMERIC DEFAULT 0,
  category_breakdown JSONB DEFAULT '[]',
  income_source_breakdown JSONB DEFAULT '[]',
  transaction_count INTEGER DEFAULT 0,
  last_transaction_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, period_key)
);

CREATE INDEX idx_report_cache_user_period ON report_cache(user_id, period_key);
CREATE INDEX idx_report_cache_expires ON report_cache(expires_at);
```

## Deployment

### CI/CD Pipeline

GitHub Actions automatically runs on every push to `main`:

```
┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌─────────────┐   ┌──────────┐
│    Lint     │   │  Unit Tests  │   │    Build    │   │  E2E Tests  │   │  Deploy  │
│  ─────────  │   │  ──────────  │   │  ─────────  │   │  ─────────  │   │  ──────  │
│  ESLint     │──▶│  Vitest      │──▶│  TypeScript │──▶│  Playwright │──▶│  Vercel  │
│  Prettier   │   │  Coverage    │   │  Vite       │   │             │   │          │
│  jsx-a11y   │   │              │   │  npm audit  │   │             │   │          │
└─────────────┘   └──────────────┘   └─────────────┘   └─────────────┘   └──────────┘
```

#### Quality Gates

| Check             | Tool                                 | Description                                             |
| ----------------- | ------------------------------------ | ------------------------------------------------------- |
| Linting           | ESLint + jsx-a11y + unicorn          | Code quality, accessibility, best practices             |
| Formatting        | Prettier                             | Consistent code style                                   |
| Import Order      | eslint-plugin-import                 | Enforced import ordering                                |
| Unit Tests        | Vitest                               | Component and utility tests with 20% coverage threshold |
| Type Check        | TypeScript (strict)                  | Static type checking with `noImplicitReturns`           |
| Type Coverage     | type-coverage                        | 90% type coverage requirement                           |
| Security Audit    | npm audit (moderate)                 | Dependency vulnerability scan                           |
| E2E Tests         | Playwright                           | End-to-end testing on mobile viewport                   |
| CodeQL            | GitHub CodeQL (security-and-quality) | Advanced security analysis                              |
| Dependency Review | GitHub                               | License and vulnerability checks                        |
| Lighthouse        | Lighthouse CI                        | Performance (85%), accessibility (95%), PWA (70%)       |
| Scorecard         | OpenSSF                              | Security best practices assessment                      |

#### Workflows

| Workflow              | Trigger                 | Purpose                        |
| --------------------- | ----------------------- | ------------------------------ |
| `test-and-deploy.yml` | Push/PR to main         | Main CI/CD pipeline            |
| `security.yml`        | PR to main, Weekly      | Security audits and Lighthouse |
| `codeql.yml`          | Push/PR to main, Weekly | Advanced security analysis     |
| `scorecard.yml`       | Push to main, Weekly    | OpenSSF security scorecard     |
| `actionlint.yml`      | Workflow file changes   | Lint GitHub Actions            |
| `dependabot.yml`      | Weekly                  | Dependency updates             |

Pull requests run all checks except deployment. Only main branch merges trigger deployment.

### Manual Deployment

```bash
npm run build
vercel --prod
```

### PWA Installation

The app is installable as a Progressive Web App:

1. Open the app in Safari (iOS) or Chrome (Android/Desktop)
2. Tap the share/menu button
3. Select "Add to Home Screen"

Once installed, the app works offline and launches like a native application.

## Contributing

1. Create a feature branch from `main`
2. Make changes following code conventions in [CLAUDE.md](./CLAUDE.md)
3. Run `npm run lint` and `npm run test:e2e` before committing
4. Submit a pull request

## License

MIT
