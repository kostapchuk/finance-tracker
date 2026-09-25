# Finance Tracker

<!-- CI & quality -->
[![Test and Deploy](https://github.com/kostapchuk/finance-tracker/actions/workflows/test-and-deploy.yml/badge.svg?branch=main)](https://github.com/kostapchuk/finance-tracker/actions/workflows/test-and-deploy.yml)
[![E2E tests](https://img.shields.io/github/check-runs/kostapchuk/finance-tracker/main?nameFilter=E2E%20Tests&label=e2e&logo=playwright)](https://github.com/kostapchuk/finance-tracker/actions/workflows/test-and-deploy.yml)
[![Security & Quality](https://github.com/kostapchuk/finance-tracker/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/kostapchuk/finance-tracker/actions/workflows/security.yml)
[![CodeQL](https://github.com/kostapchuk/finance-tracker/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/kostapchuk/finance-tracker/actions/workflows/codeql.yml)
[![Lint GitHub Actions](https://github.com/kostapchuk/finance-tracker/actions/workflows/actionlint.yml/badge.svg?branch=main)](https://github.com/kostapchuk/finance-tracker/actions/workflows/actionlint.yml)
[![codecov](https://codecov.io/gh/kostapchuk/finance-tracker/graph/badge.svg)](https://codecov.io/gh/kostapchuk/finance-tracker)
[![Type coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkostapchuk%2Ffinance-tracker%2Fbadges%2Ftype-coverage.json)](https://github.com/kostapchuk/finance-tracker/actions/workflows/badges.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/kostapchuk/finance-tracker/badge)](https://scorecard.dev/viewer/?uri=github.com/kostapchuk/finance-tracker)
[![Vulnerabilities](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkostapchuk%2Ffinance-tracker%2Fbadges%2Fvulnerabilities.json)](https://github.com/kostapchuk/finance-tracker/actions/workflows/badges.yml)

<!-- Lighthouse (mobile) & bundle size -->
[![Lighthouse performance](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkostapchuk%2Ffinance-tracker%2Fbadges%2Flighthouse-performance.json)](https://github.com/kostapchuk/finance-tracker/actions/workflows/badges.yml)
[![Lighthouse accessibility](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkostapchuk%2Ffinance-tracker%2Fbadges%2Flighthouse-accessibility.json)](https://github.com/kostapchuk/finance-tracker/actions/workflows/badges.yml)
[![Lighthouse best practices](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkostapchuk%2Ffinance-tracker%2Fbadges%2Flighthouse-best-practices.json)](https://github.com/kostapchuk/finance-tracker/actions/workflows/badges.yml)
[![Lighthouse SEO](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkostapchuk%2Ffinance-tracker%2Fbadges%2Flighthouse-seo.json)](https://github.com/kostapchuk/finance-tracker/actions/workflows/badges.yml)
[![Bundle size](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkostapchuk%2Ffinance-tracker%2Fbadges%2Fbundle-size.json)](.size-limit.json)

<!-- Deploy & product -->
[![Live demo](https://img.shields.io/badge/demo-live-success?logo=vercel)](https://finance-tracker-swart.vercel.app)
[![Vercel deployment](https://img.shields.io/github/deployments/kostapchuk/finance-tracker/production?label=vercel&logo=vercel)](https://github.com/kostapchuk/finance-tracker/deployments/production)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa)](https://finance-tracker-swart.vercel.app)
[![iOS Safari](https://img.shields.io/badge/iOS%20Safari-supported-000000?logo=safari&logoColor=white)](https://finance-tracker-swart.vercel.app)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20RU-blue)](src/utils/i18n.ts)

<!-- Stack -->
[![Version](https://img.shields.io/github/package-json/v/kostapchuk/finance-tracker)](package.json)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Code style: Prettier](https://img.shields.io/badge/code%20style-prettier-ff69b4?logo=prettier&logoColor=white)](https://prettier.io/)
[![Linted with ESLint](https://img.shields.io/badge/linted%20with-ESLint-4B32C3?logo=eslint&logoColor=white)](eslint.config.js)

<!-- Maintenance -->
[![Dependabot](https://img.shields.io/badge/dependabot-enabled-025E8C?logo=dependabot)](.github/dependabot.yml)
[![Last commit](https://img.shields.io/github/last-commit/kostapchuk/finance-tracker)](https://github.com/kostapchuk/finance-tracker/commits/main)
[![Open issues](https://img.shields.io/github/issues/kostapchuk/finance-tracker)](https://github.com/kostapchuk/finance-tracker/issues)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/kostapchuk/finance-tracker/pulls)

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
| `npm run size` | Check gzip bundle size against `.size-limit.json` budgets (run after build) |
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
