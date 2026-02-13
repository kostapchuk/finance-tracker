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

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at localhost:5173 |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint with accessibility checks |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run test` | Run unit tests with Vitest |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run unit tests with coverage report |
| `npm run type-coverage` | Check TypeScript type coverage (90% threshold) |
| `npm run preview` | Preview production build locally |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:mobile` | Run E2E tests with mobile viewport |
| `npm run test:e2e:ui` | Run E2E tests with Playwright UI |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| State | Zustand 5 |
| Database | Dexie.js (IndexedDB wrapper) |
| Styling | Tailwind CSS 4 |
| Drag & Drop | @dnd-kit |
| Icons | lucide-react |
| Unit Testing | Vitest + Testing Library |
| E2E Testing | Playwright |

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
│   ├── db.ts                # Dexie database schema
│   ├── types.ts             # TypeScript interfaces
│   └── repositories.ts      # CRUD operations
├── features/
│   ├── dashboard/           # Main drag-drop dashboard
│   ├── transactions/        # History page with filters
│   ├── accounts/            # Account management
│   ├── categories/          # Category management
│   ├── income/              # Income sources
│   ├── loans/               # Loans/debts tracking
│   ├── investments/         # Investment tracking
│   ├── reports/             # Monthly reports
│   └── settings/            # App settings
├── hooks/                   # Custom React hooks
├── store/                   # Zustand state management
└── utils/                   # Helpers (i18n, currency, date)
```

For detailed architecture, data types, and code conventions, see [CLAUDE.md](./CLAUDE.md).

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

| Check | Tool | Description |
|-------|------|-------------|
| Linting | ESLint + jsx-a11y + unicorn | Code quality, accessibility, best practices |
| Formatting | Prettier | Consistent code style |
| Import Order | eslint-plugin-import | Enforced import ordering |
| Unit Tests | Vitest | Component and utility tests with 20% coverage threshold |
| Type Check | TypeScript (strict) | Static type checking with `noImplicitReturns` |
| Type Coverage | type-coverage | 90% type coverage requirement |
| Security Audit | npm audit (moderate) | Dependency vulnerability scan |
| E2E Tests | Playwright | End-to-end testing on mobile viewport |
| CodeQL | GitHub CodeQL (security-and-quality) | Advanced security analysis |
| Dependency Review | GitHub | License and vulnerability checks |
| Lighthouse | Lighthouse CI | Performance (85%), accessibility (95%), PWA (70%) |
| Scorecard | OpenSSF | Security best practices assessment |

#### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `test-and-deploy.yml` | Push/PR to main | Main CI/CD pipeline |
| `security.yml` | PR to main, Weekly | Security audits and Lighthouse |
| `codeql.yml` | Push/PR to main, Weekly | Advanced security analysis |
| `scorecard.yml` | Push to main, Weekly | OpenSSF security scorecard |
| `actionlint.yml` | Workflow file changes | Lint GitHub Actions |
| `dependabot.yml` | Weekly | Dependency updates |

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
