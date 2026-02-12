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
| `npm run lint` | Run ESLint |
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
| Testing | Playwright |

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

1. **Lint** - ESLint checks
2. **Build** - TypeScript compilation + Vite build
3. **E2E Tests** - Playwright tests on mobile viewport
4. **Deploy** - Automatic deployment to Vercel

Pull requests run lint, build, and tests without deploying.

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
